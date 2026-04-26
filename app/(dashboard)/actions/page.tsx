import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, TrendingUp, Zap, Sparkles } from 'lucide-react';

/**
 * Actions Page
 * Shows all actions across all ideas
 */
export default async function ActionsPage() {
  const supabase = await createClient();

  // Fetch all actions with their related ideas
  const { data: actions } = await supabase
    .from('actions')
    .select('*, ideas(id, title)')
    .order('status', { ascending: true })
    .order('due_time', { ascending: true });

  // Group actions by status
  const pendingActions = actions?.filter((a) => a.status === 'pending') || [];
  const inProgressActions =
    actions?.filter((a) => a.status === 'in_progress') || [];
  const completedActions =
    actions?.filter((a) => a.status === 'completed') || [];

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

  const ActionItem = ({
    action,
  }: {
    action: (typeof actions)[0] & { ideas: { id: string; title: string } | null };
  }) => (
    <div className="group p-4 bg-white border border-neutral-200 rounded-xl hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(action.status)}
            {action.due_time && (
              <span className="text-xs text-neutral-500">
                Due {formatDistanceToNow(new Date(action.due_time), { addSuffix: true })}
              </span>
            )}
          </div>
          <p
            className={`text-neutral-900 font-medium ${
              action.status === 'completed' ? 'line-through text-neutral-400' : ''
            }`}
          >
            {action.text}
          </p>
          {action.ideas && (
            <Link
              href={`/ideas/${action.ideas.id}`}
              className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 mt-2 group-hover:underline"
            >
              <span>{action.ideas.title}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Actions</h1>
        <p className="text-gray-500 mt-1">
          Track all your actions across ideas
        </p>
      </div>

      <div className="space-y-8">
        {/* Pending Actions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-neutral-100 rounded-xl">
              <Sparkles className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Pending</h2>
              <p className="text-xs text-neutral-500">{pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''} to start</p>
            </div>
          </div>
          {pendingActions.length > 0 ? (
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <ActionItem key={action.id} action={action as any} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              No pending actions
            </p>
          )}
        </div>

        {/* In Progress Actions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-xl">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">In Progress</h2>
              <p className="text-xs text-neutral-500">{inProgressActions.length} action{inProgressActions.length !== 1 ? 's' : ''} in flight</p>
            </div>
          </div>
          {inProgressActions.length > 0 ? (
            <div className="space-y-3">
              {inProgressActions.map((action) => (
                <ActionItem key={action.id} action={action as any} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              No actions in progress
            </p>
          )}
        </div>

        {/* Completed Actions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Completed</h2>
              <p className="text-xs text-neutral-500">{completedActions.length} action{completedActions.length !== 1 ? 's' : ''} done</p>
            </div>
          </div>
          {completedActions.length > 0 ? (
            <div className="space-y-3">
              {completedActions.map((action) => (
                <ActionItem key={action.id} action={action as any} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              No completed actions yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
