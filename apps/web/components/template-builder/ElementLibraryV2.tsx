'use client';

import { getAllElements } from '@/components/form-elements/registry';
import { FormElementType } from '@/types/form-element.types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';

interface Props {
  onAddElement: (type: FormElementType) => void;
}

/**
 * Categorized element groups for better organization
 */
const ELEMENT_CATEGORIES = {
  basic: {
    name: 'Basic',
    types: ['text', 'textarea', 'markdown', 'select', 'checkbox', 'date'] as FormElementType[],
  },
  rich: {
    name: 'Rich Content',
    types: ['file_upload', 'actions', 'due_date'] as FormElementType[],
  },
  financial: {
    name: 'Financial',
    types: ['stock_ticker', 'stock_graph'] as FormElementType[],
  },
};

/**
 * Draggable Element Card
 */
function DraggableElement({
  type,
  name,
  description,
  icon: Icon,
  onAdd,
}: {
  type: FormElementType;
  name: string;
  description: string;
  icon: any;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `element-${type}`,
    data: { type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onAdd}
      className={`group relative p-3 border border-neutral-200 rounded-lg hover:border-neutral-900 hover:bg-neutral-50 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-neutral-900 group-hover:text-white transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-neutral-900 truncate">{name}</h4>
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Element Library V2
 * Categorized elements with drag-and-drop support
 * Collapsible categories for better space management
 */
export default function ElementLibraryV2({ onAddElement }: Props) {
  const elements = getAllElements();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['basic', 'rich', 'financial'])
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryElements = (types: FormElementType[]) => {
    return elements.filter((el) => types.includes(el.type));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Fixed header — does not scroll */}
      <div className="shrink-0 pb-3 mb-3 border-b border-neutral-200">
        <h3 className="font-semibold text-neutral-900">Elements Library</h3>
        <p className="text-xs text-neutral-500 mt-1">Drag or click to add</p>
      </div>

      {/* Scrollable body — content is clipped inside this box */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
      {Object.entries(ELEMENT_CATEGORIES).map(([categoryId, category]) => {
        const isExpanded = expandedCategories.has(categoryId);
        const categoryElements = getCategoryElements(category.types);

        return (
          <div key={categoryId} className="space-y-2">
            <button
              onClick={() => toggleCategory(categoryId)}
              className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-neutral-50 rounded-lg transition-colors group"
            >
              <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                {category.name}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-2 pl-1">
                {categoryElements.map((element) => {
                  const Icon = element.icon;
                  return (
                    <DraggableElement
                      key={element.type}
                      type={element.type}
                      name={element.name}
                      description={element.description}
                      icon={Icon}
                      onAdd={() => onAddElement(element.type)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
