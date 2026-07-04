import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns';
import { Clock, CheckCircle2, Circle, Zap, AlertCircle, Calendar, ArrowRight, Target } from 'lucide-react';
import Link from 'next/link';
// Only the fields the sidebar actually renders.
export type ActionSidebarItem = {
  _id: string;
  text: string;
  status?: string | null;
  dueTime?: number | null;
  ideaId: string;
  idea?: { _id: string; title: string } | null;
};

interface Props {
  actions: ActionSidebarItem[];
}

function getStatusConfig(status: string | null) {
  switch (status) {
    case 'completed':
      return {
        label: 'Done',
        icon: CheckCircle2,
        color: '#10B981',
        bg: '#D1FAE5',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        icon: Zap,
        color: '#3B82F6',
        bg: '#DBEAFE',
      };
    default:
      return {
        label: 'To Do',
        icon: Circle,
        color: '#6B7280',
        bg: '#F3F4F6',
      };
  }
}

function getDueConfig(dueTime: number | null | undefined) {
  if (!dueTime) return null;

  const dueDate = new Date(dueTime);
  const now = new Date();

  if (isPast(dueDate) && !isToday(dueDate)) {
    return {
      label: 'Overdue',
      time: formatDistanceToNow(dueDate, { addSuffix: true }),
      color: '#EF4444',
      bg: '#FEE2E2',
      urgent: true,
    };
  }

  if (isToday(dueDate)) {
    return {
      label: 'Today',
      time: format(dueDate, 'h:mm a'),
      color: '#F59E0B',
      bg: '#FEF3C7',
      urgent: true,
    };
  }

  if (isTomorrow(dueDate)) {
    return {
      label: 'Tomorrow',
      time: format(dueDate, 'h:mm a'),
      color: '#3B82F6',
      bg: '#DBEAFE',
      urgent: false,
    };
  }

  return {
    label: format(dueDate, 'MMM d'),
    time: format(dueDate, 'h:mm a'),
    color: '#6B7280',
    bg: '#F3F4F6',
    urgent: false,
  };
}

export default function ActionSidebar({ actions }: Props) {
  const pendingCount = actions.filter(a => a.status === 'pending').length;
  const inProgressCount = actions.filter(a => a.status === 'in_progress').length;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 bg-gradient-to-br from-neutral-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-neutral-700" />
            Current Focus
          </h2>
          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
            {actions.length} active
          </span>
        </div>

        {/* Quick stats */}
        {actions.length > 0 && (
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-neutral-600">{pendingCount} pending</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-neutral-600">{inProgressCount} in progress</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions list */}
      <div className="p-4">
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-neutral-700 font-medium">All caught up!</p>
            <p className="text-xs text-neutral-400 mt-1">No pending actions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.slice(0, 5).map((action) => {
              const statusConfig = getStatusConfig(action.status ?? null);
              const dueConfig = getDueConfig(action.dueTime);
              const StatusIcon = statusConfig.icon;

              return (
                <Link
                  key={action._id}
                  href={`/ideas/${action.ideaId}`}
                  className="block p-3 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all group"
                >
                  {/* Status & Due row */}
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </div>

                    {dueConfig && (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ backgroundColor: dueConfig.bg, color: dueConfig.color }}
                      >
                        {dueConfig.urgent && <AlertCircle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />
                        {dueConfig.label}
                      </div>
                    )}
                  </div>

                  {/* Action text */}
                  <h3 className="font-medium text-sm text-neutral-900 line-clamp-2 mb-1.5 group-hover:text-neutral-700">
                    {action.text}
                  </h3>

                  {/* Idea reference & time */}
                  <div className="flex items-center justify-between">
                    {action.idea && (
                      <p className="text-xs text-neutral-400 truncate flex-1 mr-2">
                        From: {action.idea.title}
                      </p>
                    )}
                    {dueConfig && (
                      <span className="text-xs text-neutral-400 flex-shrink-0">
                        {dueConfig.time}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <Link
        href="/actions"
        className="flex items-center justify-center gap-2 p-4 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border-t border-neutral-100 transition-colors group"
      >
        View all actions
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
