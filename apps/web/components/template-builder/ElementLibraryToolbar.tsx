'use client';

import { getAllElements } from '@/components/form-elements/registry';
import { FormElementType } from '@/types/form-element.types';
import { useDraggable } from '@dnd-kit/core';

interface Props {
  onAddElement: (type: FormElementType) => void;
}

/**
 * A single element chip. It is both:
 *  - tappable → adds the field to the end of the template (then the page
 *    scrolls it into view), and
 *  - draggable → press-hold and drag onto the canvas to add it (the shared
 *    page DndContext handles the drop). A touch-delay sensor on that context
 *    keeps a quick horizontal swipe scrolling the toolbar instead of dragging.
 */
function ChipButton({
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
    <button
      ref={setNodeRef}
      type="button"
      onClick={onAdd}
      title={description}
      {...listeners}
      {...attributes}
      className={`flex h-8 shrink-0 touch-none items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="whitespace-nowrap">{name}</span>
    </button>
  );
}

/**
 * Mobile-only element toolkit.
 *
 * On small screens the side Elements Library is hidden and this pinned bottom
 * bar takes its place: a horizontally-scrollable row of element chips. Tap a
 * chip to append a field, or press-hold and drag it onto the canvas. Hidden at
 * lg where the full sidebar library is shown instead.
 */
export default function ElementLibraryToolbar({ onAddElement }: Props) {
  const elements = getAllElements();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-4px_16px_-6px_rgba(0,0,0,0.15)] backdrop-blur lg:hidden">
      <p className="mb-2 px-0.5 text-xs font-medium text-neutral-500">
        Tap to add, or drag onto the template
      </p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
        {elements.map((element) => (
          <ChipButton
            key={element.type}
            type={element.type}
            name={element.name}
            description={element.description}
            icon={element.icon}
            onAdd={() => onAddElement(element.type)}
          />
        ))}
      </div>
    </div>
  );
}
