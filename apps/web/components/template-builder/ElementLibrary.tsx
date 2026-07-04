'use client';

import { getAllElements } from '@/components/form-elements/registry';
import { FormElementType } from '@/types/form-element.types';

interface Props {
  onAddElement: (type: FormElementType) => void;
}

/**
 * Element Library
 * Shows all available form elements for the Template Builder
 * Uses metadata from the Meta Registry
 */
export default function ElementLibrary({ onAddElement }: Props) {
  const elements = getAllElements();

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        Click to add elements to your template
      </p>
      {elements.map((element) => {
        const Icon = element.icon;
        return (
          <button
            key={element.type}
            onClick={() => onAddElement(element.type)}
            className="w-full p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-text">{element.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {element.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
