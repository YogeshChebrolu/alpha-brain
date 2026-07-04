'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, TrendingUp, Zap, Sparkles } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';

type Status = 'pending' | 'in_progress' | 'completed';

type Action = {
  _id: string;
  text: string;
  status?: Status;
  dueTime?: number;
  ideaId: string;
  idea: { _id: string; title: string } | null;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          Done
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          In Progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">
          To Do
        </span>
      );
  }
};

function ActionCard({ action }: { action: Action }) {
  return (
    <div className="group p-4 bg-white border border-neutral-200 rounded-xl hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(action.status || 'pending')}
            {action.dueTime && (
              <span className="text-xs text-neutral-500">
                Due{' '}
                {formatDistanceToNow(new Date(action.dueTime), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
          <p
            className={`text-neutral-900 font-medium ${
              action.status === 'completed'
                ? 'line-through text-neutral-400'
                : ''
            }`}
          >
            {action.text}
          </p>
          {action.idea && (
            <Link
              href={`/ideas/${action.idea._id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 mt-2 group-hover:underline"
            >
              <span>{action.idea.title}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableAction({ action }: { action: Action }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: action._id,
    data: { action },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <ActionCard action={action} />
    </div>
  );
}

function KanbanColumn({
  title,
  hint,
  icon,
  iconWrap,
  status,
  actions,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  iconWrap: string;
  status: Status;
  actions: Action[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl bg-neutral-50 border p-3 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50/50' : 'border-neutral-200/70'
      }`}
    >
      <div className="flex items-center gap-2.5 px-1 pb-3 mb-1">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconWrap}`}
        >
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          <span className="text-xs font-medium text-neutral-400">
            {actions.length}
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-3 min-h-[120px]">
        {actions.length > 0 ? (
          actions.map((action) => (
            <DraggableAction key={action._id} action={action} />
          ))
        ) : (
          <p className="text-xs text-neutral-400 px-1 py-6 text-center">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ActionsPage() {
  const actions = useQuery(api.actions.list) as Action[] | undefined;
  const setStatus = useMutation(api.actions.setStatus);
  const [activeAction, setActiveAction] = useState<Action | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAction((event.active.data.current?.action as Action) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAction(null);
    const { active, over } = event;
    if (!over) return;
    const action = active.data.current?.action as Action | undefined;
    const target = over.id as Status;
    if (!action || action.status === target) return;
    void setStatus({ id: action._id as any, status: target });
  };

  if (actions === undefined) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Actions</h1>
          <p className="text-gray-500 mt-1">Track all your actions across ideas</p>
        </div>
        <p className="text-sm text-neutral-400">Loading actions…</p>
      </div>
    );
  }

  const pendingActions = actions.filter(
    (a) => (a.status ?? 'pending') === 'pending',
  );
  const inProgressActions = actions.filter((a) => a.status === 'in_progress');
  const completedActions = actions.filter((a) => a.status === 'completed');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Actions</h1>
        <p className="text-gray-500 mt-1">Track all your actions across ideas</p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <KanbanColumn
            title="To Do"
            hint="Nothing to start"
            icon={<Sparkles className="w-4 h-4 text-neutral-600" />}
            iconWrap="bg-neutral-200/70"
            status="pending"
            actions={pendingActions}
          />
          <KanbanColumn
            title="In Progress"
            hint="Nothing in flight"
            icon={<Zap className="w-4 h-4 text-blue-600" />}
            iconWrap="bg-blue-100"
            status="in_progress"
            actions={inProgressActions}
          />
          <KanbanColumn
            title="Completed"
            hint="Nothing done yet"
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            iconWrap="bg-green-100"
            status="completed"
            actions={completedActions}
          />
        </div>

        <DragOverlay>
          {activeAction ? (
            <div className="cursor-grabbing">
              <ActionCard action={activeAction} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
