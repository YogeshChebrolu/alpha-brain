'use client';

import { useState, useEffect } from 'react';
import type { Article, Inspiration } from '@/types/article.types';

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
  article: Article;
  userId: string;
  existingInspiration?: Inspiration | null;
  onSave: (data: InspirationData | null) => void;
}

export default function InspirationManager({
  article,
  existingInspiration,
  onSave,
}: InspirationManagerProps) {
  const [showAsInspiration, setShowAsInspiration] = useState(!!existingInspiration?.is_active);
  const [formData, setFormData] = useState<InspirationData>({
    id: existingInspiration?.id,
    title: existingInspiration?.title || article.title,
    description: existingInspiration?.description || '',
    icon: DEFAULT_ICON,
    gradient: DEFAULT_GRADIENT,
    displayOrder: 0, // Not used anymore - ordering by created_at
    isActive: existingInspiration?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  // Notify parent of changes
  useEffect(() => {
    if (showAsInspiration) {
      onSave({ ...formData, isActive: true });
    } else {
      onSave(formData.id ? { ...formData, isActive: false } : null);
    }
  }, [showAsInspiration, formData, onSave]);

  const handleToggle = (checked: boolean) => {
    setShowAsInspiration(checked);
    if (checked && !existingInspiration) {
      // Initialize with article data
      setFormData(prev => ({
        ...prev,
        title: article.title || '',
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
