import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, Circle, ExternalLink } from 'lucide-react';

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

  const ActionItem = ({
    action,
  }: {
    action: (typeof actions)[0] & { ideas: { id: string; title: string } | null };
  }) => (
    <div className="p-4 bg-white border border-border rounded-lg hover:border-accent transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {action.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : action.status === 'in_progress' ? (
            <Clock className="w-5 h-5 text-amber-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={`text-text ${
              action.status === 'completed' ? 'line-through text-gray-400' : ''
            }`}
          >
            {action.text}
          </p>
          {action.ideas && (
            <Link
              href={`/ideas/${action.ideas.id}`}
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-2"
            >
              {action.ideas.title}
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          {action.due_time && (
            <p className="text-xs text-gray-500 mt-1">
              Due{' '}
              {formatDistanceToNow(new Date(action.due_time), {
                addSuffix: true,
              })}
            </p>
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
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Circle className="w-5 h-5 text-gray-400" />
            Pending ({pendingActions.length})
          </h2>
          {pendingActions.length > 0 ? (
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <ActionItem key={action.id} action={action as any} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
              No pending actions
            </p>
          )}
        </div>

        {/* In Progress Actions */}
        <div>
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            In Progress ({inProgressActions.length})
          </h2>
          {inProgressActions.length > 0 ? (
            <div className="space-y-3">
              {inProgressActions.map((action) => (
                <ActionItem key={action.id} action={action as any} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
              No actions in progress
            </p>
          )}
        </div>

        {/* Completed Actions */}
        <div>
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Completed ({completedActions.length})
          </h2>
          {completedActions.length > 0 ? (
            <div className="space-y-3">
              {completedActions.map((action) => (
                <ActionItem key={action.id} action={action as any} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
              No completed actions yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
