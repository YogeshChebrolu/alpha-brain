'use client';

import { FormElementConfig } from '@/types/form-element.types';
import { Trash2, GripVertical, Edit2, X, Check } from 'lucide-react';
import { useState } from 'react';
import { LIBRARY_METADATA } from '@/components/form-elements/registry';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  elements: FormElementConfig[];
  onUpdate: (index: number, updates: Partial<FormElementConfig>) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * Sortable Element Card
 */
function SortableElement({
  element,
  index,
  onUpdate,
  onRemove,
}: {
  element: FormElementConfig;
  index: number;
  onUpdate: (updates: Partial<FormElementConfig>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localConfig, setLocalConfig] = useState(element);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const metadata = LIBRARY_METADATA[element.type];
  const Icon = metadata?.icon;

  const saveChanges = () => {
    onUpdate(localConfig);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setLocalConfig(element);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      id={`tpl-field-${element.id}`}
      style={style}
      className="group relative border border-neutral-200 rounded-xl p-4 bg-white hover:border-neutral-300 hover:shadow-md transition-all scroll-mt-24 scroll-mb-28"
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          suppressHydrationWarning
          className="cursor-grab active:cursor-grabbing mt-1 hover:bg-neutral-100 rounded p-1"
        >
          <GripVertical className="w-5 h-5 text-neutral-400" />
        </div>

        {/* Icon */}
        {Icon && (
          <div className="p-2 bg-neutral-100 rounded-lg mt-0.5">
            <Icon className="w-4 h-4 text-neutral-900" />
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 space-y-3 ${isEditing ? 'pr-20' : ''}`}>
          {isEditing ? (
            <>
              <input
                type="text"
                value={localConfig.label}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, label: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm font-medium"
                placeholder="Field Label"
              />
              <input
                type="text"
                value={localConfig.placeholder || ''}
                onChange={(e) =>
                  setLocalConfig({...localConfig, placeholder: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm"
                placeholder="Placeholder text (optional)"
              />
              {element.type === 'select' && (
                <textarea
                  value={localConfig.options?.join('\n') || ''}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      options: e.target.value.split('\n').filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm font-mono"
                  placeholder="Options (one per line)"
                  rows={4}
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.required || false}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      required: e.target.checked,
                    })
                  }
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-sm text-neutral-700">Required field</span>
              </label>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap pr-20">
                <span className="font-medium text-neutral-900">{element.label}</span>
                <span className="text-xs text-neutral-500 uppercase bg-neutral-100 px-2 py-0.5 rounded">
                  {element.type.replace('_', ' ')}
                </span>
                {element.required && (
                  <span className="text-xs text-red-600 font-medium">Required</span>
                )}
              </div>
              {element.placeholder && (
                <p className="text-sm text-neutral-500">{element.placeholder}</p>
              )}
              {element.options && element.options.length > 0 && (
                <div className="text-xs text-neutral-400 space-y-1">
                  <p className="font-medium">Options:</p>
                  <ul className="list-disc list-inside pl-2">
                    {element.options.slice(0, 3).map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                    {element.options.length > 3 && (
                      <li className="text-neutral-400">
                        +{element.options.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={saveChanges}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                title="Save changes"
              >
                <Check className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={cancelEditing}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                title="Edit"
              >
                <Edit2 className="w-4 h-4 text-neutral-600" />
              </button>
              <button
                onClick={onRemove}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State for Canvas
 */
function EmptyCanvas() {
  const { setNodeRef } = useDroppable({ id: 'canvas-empty' });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center justify-center py-24 px-6 border-2 border-dashed border-neutral-200 rounded-2xl"
    >
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-100 mb-2">
          <GripVertical className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900">Start building your template</h3>
        <p className="text-neutral-500 max-w-sm">
          Drag elements from the library or click to add them to your template
        </p>
      </div>
    </div>
  );
}

/**
 * Template Canvas V2
 * Drag-drop enabled canvas with inline editing
 */
export default function TemplateCanvasV2({ elements, onUpdate, onRemove, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex((el) => el.id === active.id);
      const newIndex = elements.findIndex((el) => el.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  if (elements.length === 0) {
    return <EmptyCanvas />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={elements.map((el) => el.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {elements.map((element, index) => (
            <SortableElement
              key={element.id}
              element={element}
              index={index}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
