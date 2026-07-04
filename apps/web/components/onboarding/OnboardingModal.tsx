'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import { Brain, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'ab_onboarded';

const INTRO =
  "Welcome to Alpha Brain — your second brain for ideas.\n\n" +
  "Capture Ideas, organize them into Categories with your own custom forms, " +
  "turn them into Actions, and publish polished Articles.\n\n" +
  "Let's start by creating your first Category.";

/**
 * One-time welcome for demo (anonymous) users. Appears ~3s after the home page
 * loads, types the intro out, and hands off to category creation. Shown once
 * per browser (localStorage) and never for real signed-in users.
 */
export default function OnboardingModal() {
  const me = useQuery(api.users.current);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  // Decide whether to show, 3s after the demo user's home page settles.
  useEffect(() => {
    if (!me?.isAnonymous) return;
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(t);
  }, [me?.isAnonymous]);

  // Typewriter effect.
  useEffect(() => {
    if (!open) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(INTRO.slice(0, i));
      if (i >= INTRO.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const start = () => {
    dismiss();
    router.push('/categories/new');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-neutral-900 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold text-neutral-900">Alpha Brain</span>
        </div>

        <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed min-h-[9rem]">
          {typed}
          <span className="inline-block w-0.5 h-5 bg-neutral-900 ml-0.5 align-middle animate-pulse" />
        </p>

        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            onClick={dismiss}
            className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={start}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Create your first category
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
