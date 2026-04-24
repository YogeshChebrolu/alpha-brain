import { createClient } from '@/lib/supabase/server';
import InspirationCarousel from '@/components/home/InspirationCarousel';
import ActionSidebar from '@/components/layout/ActionSidebar';
import CategoryIcon from '@/components/ui/CategoryIcon';
import Link from 'next/link';
import { Plus, FolderPlus } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch pending actions with related idea
  const { data: actions } = await supabase
    .from('actions')
    .select('*, ideas(title)')
    .eq('status', 'pending')
    .order('due_time', { ascending: true })
    .limit(5);

  // Fetch recent ideas count
  const { count: ideasCount } = await supabase
    .from('ideas')
    .select('*', { count: 'exact', head: true });

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .limit(4);

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
          <InspirationCarousel />

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
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/ideas/new?category=${category.id}`}
                    className="p-4 bg-white border border-border rounded-lg hover:border-accent transition-colors text-center group"
                  >
                    <div className="flex justify-center mb-2">
                      <CategoryIcon
                        icon={category.icon}
                        className="w-8 h-8 text-neutral-700 group-hover:text-neutral-900 transition-colors"
                      />
                    </div>
                    <h3 className="font-medium text-text text-sm">
                      {category.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
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
