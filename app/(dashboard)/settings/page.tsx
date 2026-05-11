'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  Smartphone,
  Moon,
  Clock,
  Save,
  Loader2,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { NotificationPreferences, NotificationPreferencesInput } from '@/types/notification.types';

/**
 * Settings Page
 * Configure notification preferences
 */
export default function SettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [reminderMinutes, setReminderMinutes] = useState(15);

  // Stock sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncComplete, setSyncComplete] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // WhatsApp connection state
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(true);

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (!res.ok) throw new Error('Failed to fetch preferences');
        const data = await res.json();
        setPreferences(data);

        // Populate form
        setPhoneNumber(data.phone_number || '');
        setWhatsappEnabled(data.whatsapp_enabled);
        setPushEnabled(data.push_enabled);
        setInAppEnabled(data.in_app_enabled);
        setQuietHoursEnabled(data.quiet_hours_enabled);
        setQuietHoursStart(data.quiet_hours_start || '22:00');
        setQuietHoursEnd(data.quiet_hours_end || '08:00');
        setReminderMinutes(data.default_reminder_minutes || 15);
      } catch (err) {
        console.error('Error fetching preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }

    async function fetchLastSyncTime() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data, error } = await supabase
          .from('daily_stock_prices')
          .select('last_synced_at')
          .order('last_synced_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        if (data?.last_synced_at) {
          setLastSynced(data.last_synced_at);
        }
      } catch (err) {
        // Silently fail - it's OK if there's no sync history yet
        console.log('No sync history found');
      }
    }

    async function fetchWhatsAppStatus() {
      try {
        setWhatsappLoading(true);
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        if (data.success && data.connected) {
          setWhatsappConnected(true);
          setWhatsappPhone(data.phoneNumber || null);
        } else {
          setWhatsappConnected(false);
          setWhatsappPhone(null);
        }
      } catch (err) {
        console.error('Error fetching WhatsApp status:', err);
        setWhatsappConnected(false);
      } finally {
        setWhatsappLoading(false);
      }
    }

    fetchPreferences();
    fetchLastSyncTime();
    fetchWhatsAppStatus();
  }, []);

  const handleSyncAllStocks = async () => {
    setSyncing(true);
    setSyncProgress('Fetching ideas...');
    setSyncComplete(false);
    setError(null);

    try {
      // Fetch all ideas
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: ideas, error: ideasError } = await supabase
        .from('ideas')
        .select('content_json, created_at, categories(templates(form_structure))');

      if (ideasError) throw new Error(`Failed to fetch ideas: ${ideasError.message}`);

      // Extract unique tickers
      const tickersMap = new Map<string, string>();

      ideas?.forEach((idea: any) => {
        const contentJson = idea.content_json as Record<string, any> | null;
        if (!contentJson) return;

        // Get template form structure to find stock_graph fields
        const formStructure = idea.categories?.templates?.form_structure as any[];

        if (formStructure) {
          const stockGraphFields = formStructure.filter(field => field.type === 'stock_graph');

          // Extract ticker values from stock_graph fields
          stockGraphFields.forEach(field => {
            const ticker = contentJson[field.id];
            if (ticker && typeof ticker === 'string' && ticker.trim()) {
              const normalizedTicker = ticker.toUpperCase().trim();
              const createdAt = new Date(idea.created_at!).toISOString().split('T')[0];
              if (!tickersMap.has(normalizedTicker)) {
                tickersMap.set(normalizedTicker, createdAt);
              }
            }
          });
        }
      });

      if (tickersMap.size === 0) {
        setSyncProgress('No stocks found in ideas');
        setTimeout(() => setSyncing(false), 2000);
        return;
      }

      setSyncProgress(`Found ${tickersMap.size} unique stocks. Syncing...`);

      // Sync each ticker
      let synced = 0;
      for (const [ticker, createdAt] of tickersMap.entries()) {
        try {
          setSyncProgress(`Syncing ${ticker} (${synced + 1}/${tickersMap.size})...`);

          const res = await fetch(`/api/sync-stock?ticker=${ticker}&createdAt=${createdAt}`);
          if (!res.ok) {
            console.error(`Failed to sync ${ticker}`);
          }

          synced++;

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Error syncing ${ticker}:`, err);
        }
      }

      setSyncProgress(`Successfully synced ${synced}/${tickersMap.size} stocks!`);
      setSyncComplete(true);
      setLastSynced(new Date().toISOString());

      setTimeout(() => {
        setSyncing(false);
        setSyncProgress('');
        setSyncComplete(false);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to sync stocks');
      setSyncing(false);
      setSyncProgress('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const input: NotificationPreferencesInput = {
        phone_number: phoneNumber || null,
        whatsapp_enabled: whatsappEnabled,
        push_enabled: pushEnabled,
        in_app_enabled: inAppEnabled,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        default_reminder_minutes: reminderMinutes,
      };

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setPreferences(data);
      setSaved(true);

      // Clear saved indicator after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 mt-1">
          Configure your notification preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Notification Channels */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-neutral-100 rounded-xl">
              <Bell className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Notification Channels</h2>
              <p className="text-xs text-neutral-500">Choose how you want to be notified</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* In-App Notifications */}
            <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl cursor-pointer hover:bg-neutral-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-neutral-200">
                  <Bell className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <span className="font-medium text-neutral-900">In-App Notifications</span>
                  <p className="text-xs text-neutral-500">Show notifications in the app</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => setInAppEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </label>

            {/* WhatsApp */}
            <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl cursor-pointer hover:bg-neutral-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-200">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <span className="font-medium text-neutral-900">WhatsApp</span>
                  <p className="text-xs text-neutral-500">Get reminders via WhatsApp</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                disabled={!phoneNumber}
                className="w-5 h-5 rounded border-neutral-300 text-green-600 focus:ring-green-600 disabled:opacity-50"
              />
            </label>

            {/* Push Notifications */}
            <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl cursor-pointer hover:bg-neutral-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-200">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="font-medium text-neutral-900">Push Notifications</span>
                  <p className="text-xs text-neutral-500">Browser push notifications</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-600"
              />
            </label>
          </div>
        </section>

        {/* WhatsApp Integration */}
        <Link href="/settings/whatsapp">
          <section className="bg-white rounded-2xl border border-neutral-200 p-6 hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-[#25D366]/10 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-[#25D366]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">WhatsApp Integration</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {whatsappLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                        <span className="text-xs text-neutral-500">Checking status...</span>
                      </div>
                    ) : whatsappConnected ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Connected</span>
                        {whatsappPhone && (
                          <span className="text-xs text-neutral-500">• +{whatsappPhone}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm text-neutral-500">Not connected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
            </div>
          </section>
        </Link>

        {/* Phone Number */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-xl">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Phone Number</h2>
              <p className="text-xs text-neutral-500">Required for WhatsApp notifications</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Phone Number (E.164 format)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
            />
            <p className="text-xs text-neutral-500 mt-2">
              Include country code (e.g., +1 for US, +91 for India)
            </p>
          </div>
        </section>

        {/* Quiet Hours */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-xl">
                <Moon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Quiet Hours</h2>
                <p className="text-xs text-neutral-500">Pause notifications during certain hours</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={quietHoursEnabled}
              onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-600"
            />
          </div>

          {quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
                />
              </div>
            </div>
          )}
        </section>

        {/* Default Reminder Time */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Default Reminder</h2>
              <p className="text-xs text-neutral-500">How early to notify before due time</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Remind me before
            </label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm bg-white"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={1440}>1 day</option>
            </select>
          </div>
        </section>

        {/* Stock Data Sync */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Stock Data Sync</h2>
              <p className="text-xs text-neutral-500">Update stock prices for all ideas</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Click the button below to sync stock prices for all stock symbols in your ideas.
              This will fetch the latest historical data from Yahoo Finance.
            </p>

            <button
              onClick={handleSyncAllStocks}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {syncProgress || 'Syncing...'}
                </>
              ) : syncComplete ? (
                <>
                  <Check className="w-5 h-5" />
                  Sync Complete!
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Sync All Stocks
                </>
              )}
            </button>

            {syncProgress && !syncing && (
              <p className="text-sm text-center text-green-600">{syncProgress}</p>
            )}

            {lastSynced && (
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last synced: {new Date(lastSynced).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
