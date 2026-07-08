'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Brain, Home, Lightbulb, Zap, FolderOpen, FileText, LogOut, Settings, ChevronDown, Bot } from 'lucide-react';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@alpha-brain/convex';

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
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.current);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = me?.email ?? '';
  const name =
    me?.name || (me?.email ? me.email.split('@')[0] : 'Account');

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const initial = (name || email || '?').charAt(0).toUpperCase();

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

            <Link
              href="/assistant"
              className={`ml-1 hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:flex ${
                pathname === '/assistant'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-accent text-white hover:opacity-90'
              }`}
            >
              <Bot className="w-4 h-4" />
              Try AI
            </Link>

            {/* Profile dropdown */}
            <div className="relative ml-1 sm:ml-2" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Account"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-semibold">
                  {initial}
                </span>
                <ChevronDown className="w-4 h-4 hidden sm:inline text-neutral-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-neutral-200 bg-white shadow-lg py-2 z-30">
                  <div className="px-4 py-2 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{name || 'Account'}</p>
                    {email && <p className="text-xs text-neutral-500 truncate">{email}</p>}
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
