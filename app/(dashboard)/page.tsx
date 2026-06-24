import { createClient } from '@/lib/supabase/server';
import InspirationCarousel from '@/components/home/InspirationCarousel';
import ActionSidebar from '@/components/layout/ActionSidebar';
import Link from 'next/link';
import { Plus, FolderPlus } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();

  // These four reads are independent, so fire them together instead of
  // awaiting one after another (was a 4-deep request waterfall).
  const [inspirationsRes, actionsRes, ideasCountRes, categoriesRes] =
    await Promise.all([
      // Inspirations with linked articles (latest 5)
      supabase
        .from('inspirations')
        .select(
          `*, article:articles ( slug, title, banner_image_url )`
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      // Pending actions with related idea (only the columns ActionSidebar uses)
      supabase
        .from('actions')
        .select('id, text, status, due_time, idea_id, ideas(title)')
        .eq('status', 'pending')
        .order('due_time', { ascending: true })
        .limit(5),
      // Count of non-archived ideas
      supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .eq('archived', false),
      // Categories (only the columns the grid renders)
      supabase
        .from('categories')
        .select('id, name, color')
        .eq('archived', false)
        .limit(4),
    ]);

  // A missing `inspirations` table surfaces as an error, not a throw — fall
  // back to undefined so the carousel shows its built-in cards.
  const inspirations = inspirationsRes.data;
  const actions = actionsRes.data;
  const ideasCount = ideasCountRes.count;
  const categories = categoriesRes.data;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold text-text mb-2">Your Insight Lab</h1>
        <p className="text-gray-500">
          Capture ideas, track investments, and transform thoughts into action.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Inspiration Carousel */}
          <InspirationCarousel inspirations={inspirations || undefined} />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/ideas/new"
              className="flex items-center gap-4 p-6 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity group"
            >
              <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">New Idea</h3>
                <p className="text-white/80 text-sm">
                  Capture a new thought or investment thesis
                </p>
              </div>
            </Link>

            <Link
              href="/categories/new"
              className="flex items-center gap-4 p-6 bg-white border border-border rounded-xl hover:border-accent transition-colors group"
            >
              <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <FolderPlus className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-text">New Category</h3>
                <p className="text-gray-500 text-sm">
                  Create a custom template for your ideas
                </p>
              </div>
            </Link>
          </div>

          {/* Categories Grid */}
          {categories && categories.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-text mb-4">Your Categories</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((category) => {
                  const color = category.color || '#0EA5E9';
                  return (
                    <Link
                      key={category.id}
                      href={`/ideas/new?category=${category.id}`}
                      className="relative p-5 rounded-xl transition-all duration-300 group hover:-translate-y-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${color}08 0%, ${color}12 100%)`,
                        boxShadow: `0 2px 12px -2px ${color}15`,
                      }}
                    >
                      {/* Left accent */}
                      <div
                        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                        style={{ backgroundColor: color }}
                      />

                      <div className="pl-3">
                        <h3 className="font-semibold text-neutral-900 text-sm">
                          {category.name}
                        </h3>
                      </div>

                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ boxShadow: `0 4px 20px -4px ${color}30` }}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <h2 className="text-xl font-bold text-text mb-4">Your Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-border rounded-lg text-center">
              <p className="text-3xl font-bold text-accent">{ideasCount || 0}</p>
              <p className="text-sm text-gray-500">Total Ideas</p>
            </div>
            <div className="p-4 bg-white border border-border rounded-lg text-center">
              <p className="text-3xl font-bold text-accent">
                {actions?.length || 0}
              </p>
              <p className="text-sm text-gray-500">Pending Actions</p>
            </div>
            <div className="p-4 bg-white border border-border rounded-lg text-center">
              <p className="text-3xl font-bold text-accent">
                {categories?.length || 0}
              </p>
              <p className="text-sm text-gray-500">Categories</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <ActionSidebar actions={actions || []} />
        </div>
      </div>
    </div>
  );
}
