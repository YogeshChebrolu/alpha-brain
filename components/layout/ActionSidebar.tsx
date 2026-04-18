import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Tables } from '@/types/database.types';

type Action = Tables<'actions'> & {
  ideas?: { title: string } | null;
};

interface Props {
  actions: Action[];
}

export default function ActionSidebar({ actions }: Props) {
  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h2 className="text-xl font-bold mb-4 text-text flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent" />
        Current Focus
      </h2>

      {actions.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No pending actions</p>
          <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={`/ideas/${action.idea_id}`}
              className="block border-l-2 border-accent pl-3 hover:bg-gray-50 -ml-3 py-2 rounded-r-lg transition-colors"
            >
              <h3 className="font-medium text-sm text-text line-clamp-2">
                {action.text}
              </h3>
              {action.ideas && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {action.ideas.title}
                </p>
              )}
              {action.due_time && (
                <p className="text-xs text-accent mt-1 font-medium">
                  Due {formatDistanceToNow(new Date(action.due_time), { addSuffix: true })}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/actions"
        className="block text-center text-sm text-accent hover:underline mt-4 pt-4 border-t border-border"
      >
        View all actions →
      </Link>
    </div>
  );
}
