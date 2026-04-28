'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormElementConfig, FormElementType } from '@/types/form-element.types';
import ElementLibraryV2 from '@/components/template-builder/ElementLibraryV2';
import TemplateCanvasV2 from '@/components/template-builder/TemplateCanvasV2';
import { createDefaultConfig } from '@/components/form-elements/registry';
import { ArrowLeft, Save, Loader2, Sparkles, PanelLeftClose, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { DndContext, DragEndEvent, DragOverlay, useDroppable, DragStartEvent } from '@dnd-kit/core';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<FormElementType | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const handleAddElement = (type: FormElementType) => {
    const newId = `field_${Date.now()}`;
    const defaultConfig = createDefaultConfig(type, newId);
    setTemplateElements([...templateElements, defaultConfig]);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .insert({
          user_id: session.user.id,
          name: `${categoryName} Template`,
          form_structure: templateElements as any,
          is_system: false,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create category linked to template
      const { data: category, error: categoryError } = await supabase.from('categories').insert({
        user_id: session.user.id,
        template_id: template.id,
        name: categoryName,
        color: categoryColor,
        gradient: categoryGradient,
      }).select().single();

      if (categoryError) throw categoryError;

      // Redirect to idea creation with category pre-selected
      router.push(`/ideas/new?category=${category.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-neutral-50/30">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative max-w-[1800px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2.5 hover:bg-neutral-100 rounded-lg transition-all border border-neutral-200 hover:border-neutral-300"
              >
                <ArrowLeft className="w-5 h-5 text-neutral-600" />
              </Link>
              <div>
                <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">
                  Create Category Template
                </h1>
                <p className="text-neutral-500 mt-1 text-sm">
                  Design a custom form for capturing ideas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2.5 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
                title={sidebarCollapsed ? 'Show library' : 'Hide library'}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-5 h-5 text-neutral-600" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-neutral-600" />
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !categoryName || templateElements.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 font-medium"
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

          {/* Category Info Card */}
          <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl">
            <div className="flex items-start gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Category Color
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.primary}
                      onClick={() => {
                        setCategoryColor(color.primary);
                        setCategoryGradient(color.gradient);
                      }}
                      className={`group relative w-14 h-14 rounded-xl transition-all shadow-sm hover:shadow-md ${
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
                <p className="text-xs text-neutral-500 mt-2">
                  {COLOR_OPTIONS.find(c => c.primary === categoryColor)?.name || 'Ocean'}
                </p>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Stock Thesis, Book Notes, Project Ideas"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex gap-6 items-start">
            {/* Sidebar - Elements Library */}
            {!sidebarCollapsed && (
              <div className="w-80 shrink-0">
                <div className="sticky top-8 bg-neutral-50 border border-neutral-200 rounded-2xl p-6 max-h-[calc(100vh-200px)] overflow-y-auto shadow-sm">
                  <ElementLibraryV2 onAddElement={handleAddElement} />
                </div>
              </div>
            )}

            {/* Canvas - Full Width with Drop Zone */}
            <CanvasDropZone>
              <div className="bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl p-8">
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
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-500">
              <Sparkles className="inline w-4 h-4 mr-1" />
              Tip: Drag elements from the library or click to add them to your template
            </p>
          </div>
        </div>
      </div>

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
