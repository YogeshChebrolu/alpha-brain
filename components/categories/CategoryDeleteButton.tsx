'use client';

import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface CategoryDeleteButtonProps {
  categoryId: string;
  categoryName: string;
}

export default function CategoryDeleteButton({
  categoryId,
  categoryName,
}: CategoryDeleteButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!confirm(`Delete category "${categoryName}"? Ideas in this category will not be deleted.`)) {
      return;
    }

    try {
      await supabase
        .from('categories')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('id', categoryId);

      router.refresh();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="absolute top-4 right-4 p-2 bg-white border border-neutral-200 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
      title="Delete category"
    >
      <Trash2 className="w-4 h-4 text-neutral-600 hover:text-red-600 transition-colors" />
    </button>
  );
}
