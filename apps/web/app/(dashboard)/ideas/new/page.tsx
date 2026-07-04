'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { FormElementConfig } from '@/types/form-element.types';

type Category = {
  _id: string;
  name: string;
  color: string | null;
  template: {
    _id: string;
    name: string;
    formStructure: FormElementConfig[];
  } | null;
};

/**
 * New Idea Page - Notion-inspired with Glassmorphism
 * Two-step flow with smooth transitions:
 * 1. Category selection
 * 2. Dynamic form based on template
 */
function NewIdeaForm() {
  const [step, setStep] = useState<'category' | 'form'>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [template, setTemplate] = useState<FormElementConfig[] | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = useQuery(api.categories.list) as Category[] | undefined;
  const createIdea = useMutation(api.ideas.create);
  const createAction = useMutation(api.actions.create);

  const loading = categories === undefined;

  // Check if category is pre-selected from URL
  useEffect(() => {
    if (!categories) return;
    const categoryId = searchParams.get('category');
    if (categoryId) {
      const preselected = categories.find((c) => c._id === categoryId);
      if (preselected) {
        handleCategorySelect(preselected);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    if (category.template?.formStructure) {
      setTemplate(category.template.formStructure as unknown as FormElementConfig[]);
    }
    setStep('form');
  };

  const handleSubmit = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      if (!selectedCategory) throw new Error('No category selected');

      // Extract actions from form values
      const actions = values.actions || [];

      // Find the due_date field value (stored as ISO string / date value) and convert to ms
      const dueDateField = template?.find((c) => c.type === 'due_date');
      const rawDueDate = dueDateField ? values[dueDateField.id] : undefined;
      const dueDate = rawDueDate ? new Date(rawDueDate).getTime() : undefined;

      const newId = await createIdea({
        title: values.title || 'Untitled Idea',
        categoryId: selectedCategory._id as any,
        contentJson: values,
        dueDate,
      });

      // Sync actions to the actions table
      for (const action of actions) {
        await createAction({
          ideaId: newId,
          text: action.text,
          status: action.status,
          dueTime: action.dueTime
            ? new Date(action.dueTime).getTime()
            : action.due_time
            ? new Date(action.due_time).getTime()
            : undefined,
        });
      }

      // TODO: wire Convex file storage for resources

      // Redirect to idea detail page
      router.push(`/ideas/${newId}`);
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categories.map((category, index) => {
                    const color = category.color || '#0EA5E9';
                    return (
                      <motion.button
                        key={category._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleCategorySelect(category)}
                        className="group relative p-6 rounded-2xl transition-all duration-300 text-left hover:-translate-y-1"
                        style={{
                          background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
                          boxShadow: `0 4px 20px -4px ${color}20`,
                        }}
                      >
                        {/* Left accent bar */}
                        <div
                          className="absolute left-0 top-4 bottom-4 w-1.5 rounded-full"
                          style={{ background: `linear-gradient(180deg, ${color} 0%, ${color}80 100%)` }}
                        />

                        <div className="pl-4">
                          {/* Category name */}
                          <h3 className="text-xl font-bold text-neutral-900 mb-2">
                            {category.name}
                          </h3>

                          {/* Field count */}
                          {category.template && (
                            <p className="text-sm text-neutral-500">
                              {(category.template.formStructure as any[])?.length || 0} fields
                            </p>
                          )}
                        </div>

                        {/* Hover glow effect */}
                        <div
                          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{ boxShadow: `0 8px 32px -8px ${color}40, 0 0 0 1px ${color}15` }}
                        />
                      </motion.button>
                    );
                  })}
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
                className="mb-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${selectedCategory.color || '#0EA5E9'}10 0%, ${selectedCategory.color || '#0EA5E9'}18 100%)`,
                  boxShadow: `0 2px 12px -2px ${selectedCategory.color || '#0EA5E9'}20`,
                }}
              >
                <div
                  className="w-1.5 h-8 rounded-full"
                  style={{ backgroundColor: selectedCategory.color || '#0EA5E9' }}
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

/**
 * Wraps the form in a Suspense boundary because `useSearchParams()` requires
 * one for static prerendering (Next.js build fails otherwise).
 */
export default function NewIdeaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-500">Loading...</p>
          </div>
        </div>
      }
    >
      <NewIdeaForm />
    </Suspense>
  );
}
