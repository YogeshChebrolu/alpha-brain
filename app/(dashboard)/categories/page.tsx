import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, FolderPlus, Trash2 } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group relative p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all"
            >
              {/* Delete button - shows on hover */}
              <CategoryDeleteButton categoryId={category.id} categoryName={category.name} />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-neutral-50 rounded-xl">
                    <CategoryIcon
                      icon={category.icon}
                      className="w-6 h-6 text-neutral-700"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      {category.name}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {(category.templates?.form_structure as any[])?.length || 0} fields
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100">
                <Link
                  href={`/ideas/new?category=${category.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Create Idea
                </Link>
              </div>
            </div>
          ))}
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
