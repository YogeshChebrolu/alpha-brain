'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Archive, Trash2, MoreVertical } from 'lucide-react';

interface CategoryActionsProps {
  categoryId: string;
  categoryName: string;
}

export default function CategoryActions({ categoryId, categoryName }: CategoryActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleArchive = async () => {
    if (!confirm(`Archive "${categoryName}"?`)) return;
    try {
      await supabase.from('categories').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('id', categoryId);
      router.refresh();
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-neutral-600" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => {
                handleArchive();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archive Category
            </button>
          </div>
        </>
      )}
    </div>
  );
}
