'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FolderPlus } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import CategoryDeleteButton from '@/components/categories/CategoryDeleteButton';

export default function CategoriesPage() {
  const router = useRouter();
  const categories = useQuery(api.categories.list);

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
                key={category._id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/categories/${category._id}/edit`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    router.push(`/categories/${category._id}/edit`);
                  }
                }}
                className="group relative rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
                style={{
                  background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
                  boxShadow: `0 4px 20px -4px ${color}20`,
                }}
              >
                {/* Delete button - shows on hover */}
                <CategoryDeleteButton categoryId={category._id} categoryName={category.name} />

                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
                  style={{ background: category.gradient || `linear-gradient(180deg, ${color} 0%, ${color}99 100%)` }}
                />

                {/* Content */}
                <div className="p-6 pl-8">
                  {/* Category info - click the card to edit its form/template */}
                  <div className="block mb-4">
                    <h3 className="font-bold text-neutral-900 text-xl mb-1 group-hover:underline">
                      {category.name}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {category.template?.formStructure?.length ?? 0} fields
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/ideas?category=${category._id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-neutral-200 text-neutral-700 bg-white/70 transition-all hover:bg-white"
                    >
                      View Ideas
                    </Link>
                    <Link
                      href={`/ideas/new?category=${category._id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-90"
                      style={{
                        backgroundColor: color,
                        color: 'white'
                      }}
                    >
                      Create Idea
                    </Link>
                  </div>
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
