'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Mail, Lock, Loader2, User } from 'lucide-react';
import { STOCK_THESIS_TEMPLATE, DEFAULT_IDEA_TEMPLATE } from '@/lib/constants/default-templates';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Create default templates for new user
        const { data: stockTemplate } = await supabase
          .from('templates')
          .insert({
            user_id: data.user.id,
            name: 'Stock Thesis',
            form_structure: STOCK_THESIS_TEMPLATE,
            is_system: false,
          })
          .select()
          .single();

        const { data: generalTemplate } = await supabase
          .from('templates')
          .insert({
            user_id: data.user.id,
            name: 'General Idea',
            form_structure: DEFAULT_IDEA_TEMPLATE,
            is_system: false,
          })
          .select()
          .single();

        // Create default categories
        if (stockTemplate) {
          await supabase.from('categories').insert({
            user_id: data.user.id,
            name: 'Stock Thesis',
            template_id: stockTemplate.id,
            icon: '📈',
          });
        }

        if (generalTemplate) {
          await supabase.from('categories').insert({
            user_id: data.user.id,
            name: 'General Ideas',
            template_id: generalTemplate.id,
            icon: '💡',
          });
        }

        // Add more default categories
        await supabase.from('categories').insert([
          {
            user_id: data.user.id,
            name: 'Book Notes',
            template_id: generalTemplate?.id,
            icon: '📚',
          },
          {
            user_id: data.user.id,
            name: 'Personal Projects',
            template_id: generalTemplate?.id,
            icon: '🚀',
          },
        ]);
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mobile Logo */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <Brain className="w-10 h-10 text-accent" />
        <span className="text-2xl font-bold text-text">Alpha Brain</span>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-text">Create your account</h2>
        <p className="text-gray-500 mt-2">
          Start building your second brain today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p className="text-center text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
