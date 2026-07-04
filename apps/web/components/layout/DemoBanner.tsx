'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';

/**
 * Thin banner shown only for anonymous (demo) users — warns that data may be
 * lost and nudges them to create a real account (#5).
 */
export default function DemoBanner() {
  const me = useQuery(api.users.current);
  if (!me || !me.isAnonymous) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center py-2 px-4">
      You&apos;re using a demo account — your data may be lost.{' '}
      <Link href="/signup" className="underline font-medium hover:text-amber-900">
        Create an account
      </Link>{' '}
      to keep it.
    </div>
  );
}
