'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { api, type Id } from '@alpha-brain/convex';
import ElementLibraryV2 from '@/components/template-builder/ElementLibraryV2';
import ElementLibraryToolbar from '@/components/template-builder/ElementLibraryToolbar';
import TemplateCanvasV2 from '@/components/template-builder/TemplateCanvasV2';
import { createDefaultConfig } from '@/components/form-elements/registry';
import type { FormElementConfig, FormElementType } from '@/types/form-element.types';

const COLOR_OPTIONS = [
  { name: 'Ocean', primary: '#0EA5E9', gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' },
  { name: 'Sunset', primary: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
  { name: 'Forest', primary: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
  { name: 'Lavender', primary: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' },
  { name: 'Rose', primary: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' },
  { name: 'Coral', primary: '#F97316', gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' },
  { name: 'Emerald', primary: '#14B8A6', gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' },
  { name: 'Indigo', primary: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' },
  { name: 'Crimson', primary: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
  { name: 'Slate', primary: '#64748B', gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)' },
];

type CategoryWithTemplate = {
  _id: Id<'categories'>;
  name: string;
  color: string;
  gradient?: string;
  template?: {
    formStructure?: FormElementConfig[];
  } | null;
};

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const categoryId = params.id as Id<'categories'>;
  const category = useQuery(api.categories.get, { id: categoryId }) as CategoryWithTemplate | null | undefined;
  const updateCategory = useMutation(api.categories.update);

  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(COLOR_OPTIONS[0].primary);
  const [categoryGradient, setCategoryGradient] = useState(COLOR_OPTIONS[0].gradient);
  const [templateElements, setTemplateElements] = useState<FormElementConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<FormElementType | null>(null);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!category || hydratedId === category._id) return;
    setCategoryName(category.name);
    setCategoryColor(category.color || COLOR_OPTIONS[0].primary);
    setCategoryGradient(category.gradient || COLOR_OPTIONS[0].gradient);
    setTemplateElements(category.template?.formStructure ?? []);
    setHydratedId(category._id);
  }, [category, hydratedId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const scrollToField = (id: string) => {
    setTimeout(() => {
      document
        .getElementById(`tpl-field-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const handleAddElement = (type: FormElementType) => {
    const newId = `field_${Date.now()}`;
    setTemplateElements((elements) => [...elements, createDefaultConfig(type, newId)]);
    scrollToField(newId);
  };

  const handleUpdateElement = (index: number, updates: Partial<FormElementConfig>) => {
    setTemplateElements((elements) => {
      const updated = [...elements];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const handleRemoveElement = (index: number) => {
    setTemplateElements((elements) => elements.filter((_, i) => i !== index));
  };

  const handleReorderElements = (fromIndex: number, toIndex: number) => {
    setTemplateElements((elements) => {
      const updated = [...elements];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type) setActiveDragType(type as FormElementType);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragType(null);

    if (over?.id === 'canvas-drop-zone') {
      const elementType = active.data.current?.type as FormElementType | undefined;
      if (elementType) handleAddElement(elementType);
    }
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      setError('Please enter a category name');
      return;
    }
    if (templateElements.length === 0) {
      setError('Please add at least one element to the template');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateCategory({
        id: categoryId,
        name: categoryName,
        color: categoryColor,
        gradient: categoryGradient,
        formStructure: templateElements,
      });
      router.push('/categories');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  if (category === undefined) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading category...
      </div>
    );
  }

  if (category === null) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Category not found</h1>
        <Link href="/categories" className="mt-4 inline-flex text-sm font-medium text-neutral-700 underline underline-offset-4">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-neutral-50/30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative mx-auto max-w-[1800px] py-6 md:py-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/categories" className="shrink-0 rounded-lg border border-neutral-200 p-2.5 transition-all hover:border-neutral-300 hover:bg-neutral-100">
                <ArrowLeft className="h-5 w-5 text-neutral-600" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">Edit Category Template</h1>
                <p className="mt-1 text-sm text-neutral-500">Update the form users fill when creating ideas in this category</p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !categoryName || templateElements.length === 0}
              className="flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-6 py-2.5 font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 md:h-auto md:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-neutral-200 bg-white/80 p-4 backdrop-blur-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Category name</label>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.primary}
                      type="button"
                      onClick={() => {
                        setCategoryColor(color.primary);
                        setCategoryGradient(color.gradient);
                      }}
                      className={`h-10 w-10 rounded-xl shadow-sm transition-all ${categoryColor === color.primary ? 'ring-2 ring-neutral-900 ring-offset-2' : 'hover:scale-105'}`}
                      title={color.name}
                      style={{ background: color.gradient }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 pb-28 lg:flex-row lg:items-start lg:pb-0">
            {/* Elements Library (desktop only; mobile uses the pinned bottom toolbar) */}
            <div className="hidden shrink-0 lg:block lg:w-80">
              <div className="flex h-105 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm md:p-6 lg:sticky lg:top-24 lg:h-[calc(100vh-220px)]">
                <ElementLibraryV2 onAddElement={handleAddElement} />
              </div>
            </div>

            <CanvasDropZone>
              <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 backdrop-blur-sm md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Template Structure</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      {templateElements.length} field{templateElements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <TemplateCanvasV2
                  elements={templateElements}
                  onUpdate={handleUpdateElement}
                  onRemove={handleRemoveElement}
                  onReorder={handleReorderElements}
                />
              </div>
            </CanvasDropZone>
          </div>

          <div className="mt-6 hidden text-center lg:block">
            <p className="text-sm text-neutral-500">
              <Sparkles className="mr-1 inline h-4 w-4" />
              Drag elements from the library or click to add them to your template
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: pinned element toolkit at the bottom */}
      <ElementLibraryToolbar onAddElement={handleAddElement} />

      <DragOverlay>
        {activeDragType ? (
          <div className="rounded-lg bg-neutral-900 p-4 text-white shadow-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Adding element...</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function CanvasDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 transition-all ${isOver ? 'rounded-2xl ring-2 ring-neutral-900 ring-offset-4' : ''}`}
    >
      {children}
    </div>
  );
}