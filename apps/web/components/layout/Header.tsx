'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Brain,
  ChevronDown,
  FileText,
  FolderOpen,
  Home,
  Lightbulb,
  LogOut,
  Menu,
  Settings,
  X,
  Zap,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@alpha-brain/convex';

const primaryNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/categories', label: 'Categories', icon: FolderOpen },
  { href: '/actions', label: 'Actions', icon: Zap },
];

const articleNavItem = { href: '/articles', label: 'Articles', icon: FileText };
const mobileNavItems = [...primaryNavItems, articleNavItem];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.current);

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const email = me?.email ?? '';
  const name = me?.name || (me?.email ? me.email.split('@')[0] : 'Account');

  useEffect(() => {
    if (!accountMenuOpen && !mobileMenuOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountMenuOpen, mobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const initial = (name || email || '?').charAt(0).toUpperCase();

  const navLinkClass = (href: string) =>
    `flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      pathname === href ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-14 items-center justify-between sm:h-16">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Brain className="h-5 w-5 text-neutral-900 sm:h-6 sm:w-6" />
            <span className="hidden text-base font-bold text-neutral-900 sm:inline sm:text-lg">
              Alpha Brain
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/assistant"
              className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors sm:gap-2 sm:px-3 md:h-auto ${
                pathname === '/assistant'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-accent text-white hover:opacity-90'
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>Try AI</span>
            </Link>

            <Link
              href="/articles"
              className={`hidden items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors md:flex ${
                pathname === '/articles'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              Articles
            </Link>

            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-neutral-900">{name || 'Account'}</p>
                    {email && <p className="truncate text-xs text-neutral-500">{email}</p>}
                  </div>
                  {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          pathname === item.href
                            ? 'bg-neutral-100 font-semibold text-neutral-900'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="mt-1 border-t border-neutral-100 pt-1">
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative ml-1 hidden md:block" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 text-neutral-700 transition-colors hover:bg-neutral-100"
                title="Account"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {initial}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-neutral-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-neutral-100 px-4 py-2">
                    <p className="truncate text-sm font-semibold text-neutral-900">{name || 'Account'}</p>
                    {email && <p className="truncate text-xs text-neutral-500">{email}</p>}
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <LogOut className="h-4 w-4" />
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