'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Mail, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSafeRedirect } from '@/lib/helpers/redirect';

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

      // Supabase auth handles user creation automatically in auth.users table
      // No need to create manual user entries

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setError('Please check your email to confirm your account before logging in.');
        setLoading(false);
        return;
      }

      // Successfully signed up and logged in
      router.push(getSafeRedirect());
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:hidden flex items-center justify-center gap-3 mb-8"
      >
        <Brain className="w-10 h-10 text-neutral-900" />
        <span className="text-2xl font-bold text-neutral-900">Alpha Brain</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold text-neutral-900">Create your account</h2>
        <p className="text-neutral-500 mt-2">
          Start building your second brain today
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white"
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-neutral-900 text-white py-3 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </motion.button>
      </form>

      <p className="text-center text-neutral-500">
        Already have an account?{' '}
        <Link href="/login" className="text-neutral-900 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
