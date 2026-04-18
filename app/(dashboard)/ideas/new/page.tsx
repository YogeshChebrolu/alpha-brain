'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';
import GradientBackground from '@/components/ui/GradientBackground';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Tables } from '@/types/database.types';
import { FormElementConfig } from '@/types/form-element.types';

type Category = Tables<'categories'> & {
  templates?: Tables<'templates'> | null;
};

/**
 * New Idea Page
 * Two-step flow with morphing animation:
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
      setTemplate(category.templates.form_structure as FormElementConfig[]);
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

      const { error } = await supabase.from('ideas').insert({
        user_id: session.user.id,
        category_id: selectedCategory?.id,
        title: values.title || 'Untitled Idea',
        content_json: values,
      });

      if (error) throw error;

      router.push('/');
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <h1 className="text-2xl font-bold text-text">
          {step === 'category' ? 'Select a Category' : `New ${selectedCategory?.name}`}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Category Selection */}
        {step === 'category' && (
          <motion.div
            key="category"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ x: -500, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {categories.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
                <p className="text-gray-500 mb-4">No categories yet</p>
                <Link
                  href="/categories/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create your first category
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    layoutId={`category-${category.id}`}
                    onClick={() => handleCategorySelect(category)}
                    className="p-6 bg-white border border-border rounded-xl hover:border-accent hover:shadow-md transition-all text-left group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-3xl mb-3">{category.icon || '💡'}</div>
                    <h3 className="text-lg font-semibold text-text group-hover:text-accent transition-colors">
                      {category.name}
                    </h3>
                    {category.templates && (
                      <p className="text-sm text-gray-500 mt-1">
                        {(category.templates.form_structure as any[])?.length || 0} fields
                      </p>
                    )}
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
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Left: Form */}
            <div>
              <motion.div
                layoutId={`category-${selectedCategory.id}`}
                className="mb-6 p-4 bg-white border border-border rounded-xl inline-flex items-center gap-3"
              >
                <span className="text-2xl">{selectedCategory.icon || '💡'}</span>
                <span className="font-semibold text-text">
                  {selectedCategory.name}
                </span>
              </motion.div>

              <div className="bg-white border border-border rounded-xl p-6">
                <DynamicFormRenderer
                  template={template}
                  onSubmit={handleSubmit}
                  mode="edit"
                />
              </div>
            </div>

            {/* Right: Gradient Background */}
            <div className="hidden lg:block">
              <GradientBackground />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
