'use client';

import { FormElementConfig } from '@/types/form-element.types';
import { Trash2, GripVertical, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { LIBRARY_METADATA } from '@/components/form-elements/registry';

interface Props {
  elements: FormElementConfig[];
  onUpdate: (index: number, updates: Partial<FormElementConfig>) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * Template Canvas
 * Visual editor for building form templates
 * Allows editing, reordering, and removing elements
 */
export default function TemplateCanvas({
  elements,
  onUpdate,
  onRemove,
  onReorder,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const moveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < elements.length - 1) {
      onReorder(index, index + 1);
    }
  };

  return (
    <div className="space-y-4">
      {elements.map((element, index) => {
        const metadata = LIBRARY_METADATA[element.type];
        const Icon = metadata?.icon;

        return (
          <div
            key={element.id}
            className="border border-border rounded-lg p-4 bg-white hover:border-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Drag handle & icon */}
              <div className="flex flex-col items-center gap-1">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                {Icon && <Icon className="w-4 h-4 text-accent mt-1" />}
              </div>

              {/* Content */}
              <div className="flex-1">
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={element.label}
                      onChange={(e) =>
                        onUpdate(index, { label: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      placeholder="Field Label"
                    />
                    <input
                      type="text"
                      value={element.placeholder || ''}
                      onChange={(e) =>
                        onUpdate(index, { placeholder: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      placeholder="Placeholder text (optional)"
                    />
                    {element.type === 'select' && (
                      <input
                        type="text"
                        value={element.options?.join(', ') || ''}
                        onChange={(e) =>
                          onUpdate(index, {
                            options: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                        placeholder="Options (comma-separated)"
                      />
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={element.required || false}
                        onChange={(e) =>
                          onUpdate(index, { required: e.target.checked })
                        }
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-text">Required field</span>
                    </label>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="text-sm text-accent hover:underline font-medium"
                    >
                      Done editing
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">
                        {element.label}
                      </span>
                      <span className="text-xs text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">
                        {element.type.replace('_', ' ')}
                      </span>
                      {element.required && (
                        <span className="text-xs text-red-500 font-medium">
                          Required
                        </span>
                      )}
                    </div>
                    {element.placeholder && (
                      <p className="text-sm text-gray-500 mt-1">
                        {element.placeholder}
                      </p>
                    )}
                    {element.options && element.options.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Options: {element.options.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === elements.length - 1}
                  className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() =>
                    setEditingIndex(editingIndex === index ? null : index)
                  }
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => onRemove(index)}
                  className="p-1.5 hover:bg-red-50 rounded"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
