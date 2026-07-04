'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';

const DISMISS_KEY = 'ab_checklist_dismissed';

/**
 * "Getting started" progress checklist for demo (anonymous) users. Tracks real
 * progress (category → idea → article), collapses, and can be dismissed. Hides
 * automatically once all three are done or for real signed-in users.
 */
export default function GettingStartedChecklist() {
  const me = useQuery(api.users.current);
  const categories = useQuery(api.categories.list);
  const ideasCount = useQuery(api.ideas.count);
  const articles = useQuery(api.articles.listMine);

  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && !!localStorage.getItem(DISMISS_KEY),
  );

  if (!me?.isAnonymous || dismissed) return null;

  const steps = [
    { label: 'Create your first category', done: (categories?.length ?? 0) > 0, href: '/categories/new' },
    { label: 'Add an idea', done: (ideasCount ?? 0) > 0, href: '/ideas/new' },
    { label: 'Write an article', done: (articles?.length ?? 0) > 0, href: '/articles/new' },
  ];

  const allDone = steps.every((s) => s.done);
  if (allDone) return null; // quietly retire once they've explored everything

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-sm font-semibold text-text"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
          Getting started
          <span className="text-xs font-normal text-neutral-400">
            {completed}/{steps.length}
          </span>
        </button>
        <button
          onClick={dismiss}
          className="text-neutral-400 hover:text-neutral-700 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!collapsed && (
        <ul className="p-2">
          {steps.map((step) => (
            <li key={step.label}>
              <Link
                href={step.href}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full border ${
                    step.done
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-neutral-300 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3" />
                </span>
                <span
                  className={`text-sm ${
                    step.done ? 'text-neutral-400 line-through' : 'text-neutral-700'
                  }`}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
