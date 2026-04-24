'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { Tables } from '@/types/database.types';
import { linkResourcesToIdea, moveTemporaryFiles } from '@/lib/helpers/resources';
import { syncActionsToIdea } from '@/lib/helpers/actions';
import { FormElementConfig } from '@/types/form-element.types';

type Category = Tables<'categories'> & {
  templates?: Tables<'templates'> | null;
};

/**
 * New Idea Page - Notion-inspired with Glassmorphism
 * Two-step flow with smooth transitions:
 * 1. Category selection
 * 2. Dynamic form based on template
 */
export default function NewIdeaPage() {
  const [step, setStep] = useState<'category' | 'form'>('category');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [template, setTemplate] = useState<FormElementConfig[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*, templates(*)')
      .order('created_at', { ascending: true });

    setCategories(data || []);
    setLoading(false);

    // Check if category is pre-selected from URL
    const categoryId = searchParams.get('category');
    if (categoryId && data) {
      const preselected = data.find((c) => c.id === categoryId);
      if (preselected) {
        handleCategorySelect(preselected);
      }
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    if (category.templates?.form_structure) {
      setTemplate(category.templates.form_structure as unknown as FormElementConfig[]);
    }
    setStep('form');
  };

  const handleSubmit = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      // Extract actions and resources from form values
      const actions = values.actions || [];
      const resourceIds = values.resources || [];

      const { data, error } = await supabase.from('ideas').insert({
        user_id: session.user.id,
        category_id: selectedCategory?.id,
        title: values.title || 'Untitled Idea',
        content_json: values,
      }).select().single();

      if (error) throw error;

      // Sync actions to the actions table
      if (actions.length > 0) {
        await syncActionsToIdea(data.id, actions);
      }

      // Link resources to idea and move from temp folder
      if (resourceIds.length > 0) {
        await linkResourcesToIdea(data.id, resourceIds);
        await moveTemporaryFiles(session.user.id, data.id, resourceIds);
      }

      // Redirect to idea detail page
      router.push(`/ideas/${data.id}`);
      router.refresh();
    } catch (err) {
      console.error('Failed to save idea:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'form') {
      setStep('category');
      setSelectedCategory(null);
      setTemplate(null);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/30">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-12"
        >
          <button
            onClick={handleBack}
            className="p-2.5 hover:bg-neutral-100 rounded-lg transition-all duration-200 border border-neutral-200 hover:border-neutral-300"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">
              {step === 'category' ? 'Choose a category' : selectedCategory?.name}
            </h1>
            <p className="text-neutral-500 mt-1 text-sm">
              {step === 'category'
                ? 'Select a category to capture your idea'
                : 'Fill in the details for your idea'}
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Category Selection */}
          {step === 'category' && (
            <motion.div
              key="category"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {categories.length === 0 ? (
                <div className="text-center py-24">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-100 mb-6">
                    <Sparkles className="w-8 h-8 text-neutral-600" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    No categories yet
                  </h3>
                  <p className="text-neutral-500 mb-8 max-w-sm mx-auto">
                    Create your first category template to start capturing ideas
                  </p>
                  <Link
                    href="/categories/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create your first category
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category, index) => (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleCategorySelect(category)}
                      className="group relative p-8 bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl hover:bg-white hover:border-neutral-300 hover:shadow-lg transition-all duration-200 text-left"
                    >
                      <div className="relative">
                        {/* Icon */}
                        <div className="mb-4 transform group-hover:scale-105 transition-transform duration-200 flex justify-center">
                          <CategoryIcon
                            icon={category.icon}
                            className="w-12 h-12 text-neutral-700 group-hover:text-neutral-900 transition-colors"
                          />
                        </div>

                        {/* Category name */}
                        <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                          {category.name}
                        </h3>

                        {/* Field count */}
                        {category.templates && (
                          <p className="text-sm text-neutral-500">
                            {(category.templates.form_structure as any[])?.length || 0} fields
                          </p>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Dynamic Form */}
          {step === 'form' && template && selectedCategory && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              {/* Category badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 inline-flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-xl"
              >
                <CategoryIcon
                  icon={selectedCategory.icon}
                  className="w-8 h-8 text-neutral-700"
                />
                <div>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                    Category
                  </p>
                  <p className="font-semibold text-neutral-900">
                    {selectedCategory.name}
                  </p>
                </div>
              </motion.div>

              {/* Form container with glassmorphism */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-lg p-8 md:p-10"
              >
                <DynamicFormRenderer
                  template={template}
                  onSubmit={handleSubmit}
                  mode="edit"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
