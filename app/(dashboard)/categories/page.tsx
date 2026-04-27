import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, FolderPlus } from 'lucide-react';
import CategoryDeleteButton from '@/components/categories/CategoryDeleteButton';

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*, templates(*)')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Categories</h1>
          <p className="text-neutral-500 mt-1">
            Manage your idea templates and categories
          </p>
        </div>
        <Link
          href="/categories/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Category
        </Link>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const color = category.color || '#0EA5E9';
            return (
              <div
                key={category.id}
                className="group relative rounded-2xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
                  boxShadow: `0 4px 20px -4px ${color}20`,
                }}
              >
                {/* Delete button - shows on hover */}
                <CategoryDeleteButton categoryId={category.id} categoryName={category.name} />

                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
                  style={{ background: category.gradient || `linear-gradient(180deg, ${color} 0%, ${color}99 100%)` }}
                />

                {/* Content */}
                <div className="p-6 pl-8">
                  {/* Category info */}
                  <div className="mb-4">
                    <h3 className="font-bold text-neutral-900 text-xl mb-1">
                      {category.name}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {(category.templates?.form_structure as any[])?.length || 0} fields
                    </p>
                  </div>

                  {/* Create button */}
                  <Link
                    href={`/ideas/new?category=${category.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-90"
                    style={{
                      backgroundColor: color,
                      color: 'white'
                    }}
                  >
                    Create Idea
                  </Link>
                </div>

                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: `0 8px 32px -8px ${color}40, 0 0 0 1px ${color}20`,
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-2xl mb-4">
            <FolderPlus className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            No categories yet
          </h3>
          <p className="text-neutral-500 mb-6">
            Create your first category to start organizing ideas
          </p>
          <Link
            href="/categories/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Category
          </Link>
        </div>
      )}
    </div>
  );
}
