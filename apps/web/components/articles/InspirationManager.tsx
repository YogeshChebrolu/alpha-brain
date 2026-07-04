'use client';

import { useState, useEffect } from 'react';

// Default gradient for all inspirations
const DEFAULT_GRADIENT = 'from-neutral-100 to-neutral-200';
const DEFAULT_ICON = 'Brain';

export interface InspirationData {
  id?: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  displayOrder: number;
  isActive: boolean;
}

interface InspirationManagerProps {
  articleTitle: string;
  onSave: (data: InspirationData | null) => void;
  // Existing inspiration for this article (edit flow). undefined = still loading,
  // null = none. When present, the toggle + form hydrate from it.
  initial?: {
    _id?: string;
    title: string;
    description: string;
    icon?: string;
    gradient?: string;
    isActive?: boolean;
  } | null;
}

export default function InspirationManager({
  articleTitle,
  onSave,
  initial,
}: InspirationManagerProps) {
  const [showAsInspiration, setShowAsInspiration] = useState(false);
  const [formData, setFormData] = useState<InspirationData>({
    id: undefined,
    title: articleTitle,
    description: '',
    icon: DEFAULT_ICON,
    gradient: DEFAULT_GRADIENT,
    displayOrder: 0,
    isActive: true,
  });
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate once from an existing inspiration (edit flow).
  useEffect(() => {
    if (hydrated || initial === undefined) return;
    if (initial) {
      setShowAsInspiration(!!initial.isActive);
      setFormData({
        id: initial._id,
        title: initial.title,
        description: initial.description,
        icon: initial.icon ?? DEFAULT_ICON,
        gradient: initial.gradient ?? DEFAULT_GRADIENT,
        displayOrder: 0,
        isActive: initial.isActive ?? true,
      });
    }
    setHydrated(true);
  }, [initial, hydrated]);

  // Notify parent of changes.
  // TODO: add api.inspirations mutations — writes are not persisted yet.
  useEffect(() => {
    if (showAsInspiration) {
      onSave({ ...formData, isActive: true });
    } else {
      onSave(formData.id ? { ...formData, isActive: false } : null);
    }
  }, [showAsInspiration, formData, onSave]);

  const handleToggle = (checked: boolean) => {
    setShowAsInspiration(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        title: articleTitle || '',
        isActive: true,
      }));
    }
    setError(null);
  };

  const handleFieldChange = (field: keyof InspirationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-neutral-50">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showAsInspiration}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <span className="text-sm font-medium text-neutral-900">
            Show as Inspiration
          </span>
        </label>
      </div>

      {/* Form */}
      {showAsInspiration && (
        <div className="px-4 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Enter inspiration title..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Brief description for the inspiration card..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {formData.description.length}/200 characters
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
