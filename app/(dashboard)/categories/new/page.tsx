'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormElementConfig, FormElementType } from '@/types/form-element.types';
import ElementLibrary from '@/components/template-builder/ElementLibrary';
import TemplateCanvas from '@/components/template-builder/TemplateCanvas';
import { createDefaultConfig } from '@/components/form-elements/registry';
import { ArrowLeft, Save, Loader2, FolderPlus } from 'lucide-react';
import Link from 'next/link';

/**
 * Template Builder Page
 * Visual interface for creating custom category templates
 * Split-screen: Canvas (left) + Element Library (right)
 */
export default function NewCategoryPage() {
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('💡');
  const [templateElements, setTemplateElements] = useState<FormElementConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          form_structure: templateElements,
          is_system: false,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create category linked to template
      const { error: categoryError } = await supabase.from('categories').insert({
        user_id: session.user.id,
        template_id: template.id,
        name: categoryName,
        icon: categoryIcon,
      });

      if (categoryError) throw categoryError;

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const iconOptions = ['💡', '📈', '📚', '🚀', '🎯', '💰', '🔬', '🎨', '⚡', '🌟'];

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text" />
          </Link>
          <div className="flex items-center gap-3">
            <FolderPlus className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-text">New Category</h1>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !categoryName || templateElements.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
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

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Category Info */}
      <div className="py-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Icon
            </label>
            <div className="flex gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setCategoryIcon(icon)}
                  className={`w-10 h-10 text-xl rounded-lg border transition-colors ${
                    categoryIcon === icon
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-text mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g., Stock Thesis, Book Notes, Project Ideas"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden mt-6">
        {/* Left: Template Canvas */}
        <div className="flex-1 pr-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-text mb-4">
            Template Structure
          </h2>
          {templateElements.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
              <FolderPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No elements yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Select elements from the library on the right →
              </p>
            </div>
          ) : (
            <TemplateCanvas
              elements={templateElements}
              onUpdate={handleUpdateElement}
              onRemove={handleRemoveElement}
              onReorder={handleReorderElements}
            />
          )}
        </div>

        {/* Right: Element Library */}
        <div className="w-80 pl-6 border-l border-border overflow-y-auto">
          <h2 className="text-lg font-semibold text-text mb-4">
            Element Library
          </h2>
          <ElementLibrary onAddElement={handleAddElement} />
        </div>
      </div>
    </div>
  );
}
