'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';
import { useRouter } from 'next/navigation';
import { FormElementConfig, FormElementType } from '@/types/form-element.types';
import ElementLibraryV2 from '@/components/template-builder/ElementLibraryV2';
import ElementLibraryToolbar from '@/components/template-builder/ElementLibraryToolbar';
import TemplateCanvasV2 from '@/components/template-builder/TemplateCanvasV2';
import { createDefaultConfig } from '@/components/form-elements/registry';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDroppable,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { DEFAULT_IDEA_TEMPLATE } from '@/lib/constants/default-templates';

// Refined color palette - muted and sophisticated for white backgrounds
const COLOR_OPTIONS = [
  {
    name: 'Ocean',
    primary: '#0EA5E9',
    secondary: '#0284C7',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    light: '#E0F2FE'
  },
  {
    name: 'Sunset',
    primary: '#F59E0B',
    secondary: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    light: '#FEF3C7'
  },
  {
    name: 'Forest',
    primary: '#10B981',
    secondary: '#059669',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    light: '#D1FAE5'
  },
  {
    name: 'Lavender',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    light: '#EDE9FE'
  },
  {
    name: 'Rose',
    primary: '#EC4899',
    secondary: '#DB2777',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    light: '#FCE7F3'
  },
  {
    name: 'Coral',
    primary: '#F97316',
    secondary: '#EA580C',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    light: '#FFEDD5'
  },
  {
    name: 'Emerald',
    primary: '#14B8A6',
    secondary: '#0D9488',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    light: '#CCFBF1'
  },
  {
    name: 'Indigo',
    primary: '#6366F1',
    secondary: '#4F46E5',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    light: '#E0E7FF'
  },
  {
    name: 'Crimson',
    primary: '#EF4444',
    secondary: '#DC2626',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    light: '#FEE2E2'
  },
  {
    name: 'Grape',
    primary: '#A855F7',
    secondary: '#9333EA',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
    light: '#F3E8FF'
  },
  {
    name: 'Slate',
    primary: '#64748B',
    secondary: '#475569',
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    light: '#F1F5F9'
  },
  {
    name: 'Amber',
    primary: '#FBBF24',
    secondary: '#F59E0B',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    light: '#FEF3C7'
  },
];

/**
 * Template Builder Page V2
 * Full-width canvas with collapsible sidebar
 * Drag-and-drop from library to canvas
 */
export default function NewCategoryPage() {
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(COLOR_OPTIONS[0].primary);
  const [categoryGradient, setCategoryGradient] = useState(COLOR_OPTIONS[0].gradient);
  const [templateElements, setTemplateElements] = useState<FormElementConfig[]>(
    DEFAULT_IDEA_TEMPLATE
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Step 1 is a small modal (color + name); step 2 is the field builder.
  const [setupDone, setSetupDone] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<FormElementType | null>(null);

  const createCategory = useMutation(api.categories.create);
  const router = useRouter();

  // Press-hold to drag on touch (so a quick horizontal swipe still scrolls the
  // mobile toolbar); small move threshold on pointer devices.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const scrollToField = (id: string) => {
    // Wait for the new card to render, then bring it into view above the toolbar.
    setTimeout(() => {
      document
        .getElementById(`tpl-field-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const handleAddElement = (type: FormElementType) => {
    const newId = `field_${Date.now()}`;
    const defaultConfig = createDefaultConfig(type, newId);
    setTemplateElements([...templateElements, defaultConfig]);
    scrollToField(newId);
  };

  const handleUpdateElement = (
    index: number,
    updates: Partial<FormElementConfig>
  ) => {
    const updated = [...templateElements];
    updated[index] = { ...updated[index], ...updates };
    setTemplateElements(updated);
  };

  const handleRemoveElement = (index: number) => {
    setTemplateElements(templateElements.filter((_, i) => i !== index));
  };

  const handleReorderElements = (fromIndex: number, toIndex: number) => {
    const updated = [...templateElements];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setTemplateElements(updated);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const type = event.active.data.current?.type;
    if (type) {
      setActiveDragType(type);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragType(null);

    // Handle dropping new element from library to canvas
    if (over?.id === 'canvas-drop-zone') {
      const elementType = active.data.current?.type as FormElementType;
      if (elementType) {
        handleAddElement(elementType);
      }
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
      // Creates the template + category together.
      await createCategory({
        name: categoryName,
        color: categoryColor,
        gradient: categoryGradient,
        formStructure: templateElements,
      });

      router.push('/categories');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: small setup modal (pick a color + name, then continue) ─────────
  if (!setupDone) {
    const handleContinue = () => {
      if (!categoryName.trim()) {
        setError('Please enter a category name');
        return;
      }
      setError(null);
      setSetupDone(true);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">New Category</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Pick a color and name — you&apos;ll add fields next.
              </p>
            </div>
            <Link
              href="/categories"
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500"
              aria-label="Cancel"
            >
              ✕
            </Link>
          </div>

          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Category Name
          </label>
          <input
            type="text"
            autoFocus
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            placeholder="e.g., Stock Thesis, Book Notes, Project Ideas"
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white mb-5"
          />

          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Color
          </label>
          <div className="grid grid-cols-6 gap-3 mb-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.primary}
                onClick={() => {
                  setCategoryColor(color.primary);
                  setCategoryGradient(color.gradient);
                }}
                className={`relative w-12 h-12 rounded-xl transition-all shadow-sm hover:shadow-md ${
                  categoryColor === color.primary
                    ? 'ring-2 ring-neutral-900 ring-offset-2 scale-105'
                    : 'hover:scale-105'
                }`}
                title={color.name}
                style={{ background: color.gradient }}
              >
                {categoryColor === color.primary && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white rounded-full shadow-lg" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mb-6">
            {COLOR_OPTIONS.find((c) => c.primary === categoryColor)?.name || 'Ocean'}
          </p>

          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          <button
            onClick={handleContinue}
            className="flex h-8 w-full items-center justify-center py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium md:h-auto"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-neutral-50/30">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative max-w-[1800px] mx-auto py-6 md:py-8">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <Link
                href="/"
                className="shrink-0 p-2.5 hover:bg-neutral-100 rounded-lg transition-all border border-neutral-200 hover:border-neutral-300"
              >
                <ArrowLeft className="w-5 h-5 text-neutral-600" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight md:text-3xl">
                  Create Category Template
                </h1>
                <p className="text-neutral-500 mt-1 text-sm">
                  Design a custom form for capturing ideas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !categoryName || templateElements.length === 0}
                className="flex h-8 w-full items-center justify-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 font-medium md:h-auto md:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Category
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Compact summary — color + name were chosen in the setup modal */}
          <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-lg shadow-sm shrink-0"
                style={{ background: categoryGradient }}
              />
              <div>
                <p className="font-semibold text-neutral-900">
                  {categoryName || 'Untitled Category'}
                </p>
                <p className="text-xs text-neutral-500">
                  {COLOR_OPTIONS.find((c) => c.primary === categoryColor)?.name || 'Ocean'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSetupDone(false)}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium"
            >
              Edit
            </button>
          </div>

          {/* Main Content */}
          <div className="flex flex-col gap-6 pb-28 lg:flex-row lg:items-start lg:pb-0">
            {/* Sidebar - Elements Library (desktop only; mobile uses the pinned bottom toolbar) */}
            <div className="hidden shrink-0 lg:block lg:w-80">
              <div className="lg:sticky lg:top-8 bg-neutral-50 border border-neutral-200 rounded-2xl p-4 md:p-6 h-105 lg:h-[calc(100vh-200px)] overflow-hidden shadow-sm flex flex-col">
                <ElementLibraryV2 onAddElement={handleAddElement} />
              </div>
            </div>

            {/* Canvas - Full Width with Drop Zone */}
            <CanvasDropZone>
              <div className="bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Template Structure
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      {templateElements.length} field{templateElements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {templateElements.length > 0 && (
                    <button
                      onClick={() => setTemplateElements(DEFAULT_IDEA_TEMPLATE)}
                      className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                      Reset to default
                    </button>
                  )}
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

          {/* Helper Text */}
          <div className="mt-6 hidden text-center lg:block">
            <p className="text-sm text-neutral-500">
              <Sparkles className="inline w-4 h-4 mr-1" />
              Tip: Drag elements from the library or click to add them to your template
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: pinned element toolkit at the bottom */}
      <ElementLibraryToolbar onAddElement={handleAddElement} />

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragType ? (
          <div className="p-4 bg-neutral-900 text-white rounded-lg shadow-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Adding element...</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Canvas Drop Zone Component
 * Wraps the canvas in a droppable area
 */
function CanvasDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 transition-all ${isOver ? 'ring-2 ring-neutral-900 ring-offset-4 rounded-2xl' : ''}`}
    >
      {children}
    </div>
  );
}
