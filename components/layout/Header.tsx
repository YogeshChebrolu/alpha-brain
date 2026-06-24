'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Home, Lightbulb, Zap, FolderOpen, FileText, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import NotificationCenter from '@/components/notifications/NotificationCenter';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/articles', label: 'Articles', icon: FileText },
  { href: '/categories', label: 'Categories', icon: FolderOpen },
  { href: '/actions', label: 'Actions', icon: Zap },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-neutral-200">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-900" />
            <span className="font-bold text-base sm:text-lg text-neutral-900 hidden sm:inline">
              Alpha Brain
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline text-sm font-medium">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Notification Center */}
            <NotificationCenter />

            {/* Settings */}
            <Link
              href="/settings"
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                pathname === '/settings'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors ml-0.5 sm:ml-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">
                Sign Out
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
