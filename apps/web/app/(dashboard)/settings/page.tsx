'use client';

import { useState } from 'react';
import { useAuthToken } from '@convex-dev/auth/react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@alpha-brain/convex';
import {
  Clock,
  Loader2,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Bot,
  ExternalLink,
  KeyRound,
  Unplug,
} from 'lucide-react';

type TelegramConnection = {
  _id: string;
  botUsername: string;
  botFirstName?: string;
  tokenHint: string;
  status: 'pending' | 'active' | 'broken' | 'disconnected';
  webhookUrl?: string;
  lastError?: string;
  connectedAt: number;
  lastWebhookUpdateAt?: number;
};
type StockFormField = {
  id: string;
  type: string;
};

type StockIdea = {
  _creationTime: number;
  contentJson?: Record<string, unknown> | null;
  category?: {
    template?: {
      formStructure?: StockFormField[] | null;
    } | null;
  } | null;
};
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');

/**
 * Settings Page
 * Workspace integrations and maintenance tools.
 */
export default function SettingsPage() {
  const authToken = useAuthToken();
  const [error, setError] = useState<string | null>(null);

  // Telegram state
  const telegramConnections = useQuery(api.telegram.listConnections, {}) as TelegramConnection[] | undefined;
  const [botToken, setBotToken] = useState('');
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramDisconnectingId, setTelegramDisconnectingId] = useState<string | null>(null);
  const [telegramResult, setTelegramResult] = useState<{
    botUsername: string;
    status: string;
    startUrl?: string;
    message?: string;
  } | null>(null);

  // Stock sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncComplete, setSyncComplete] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // TODO: add api.stocks.latestSync query
  // lastSynced is left null initially and set from local state after a sync run.

  const ideas = useQuery(api.ideas.list, {});
  const syncStock = useAction(api.stocks.sync);

  const handleConnectTelegram = async () => {
    setTelegramConnecting(true);
    setTelegramResult(null);
    setError(null);

    try {
      if (!authToken) throw new Error('Sign in before connecting Telegram');
      const response = await fetch(`${apiBaseUrl}/api/telegram/bots/connect`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ botToken }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to connect Telegram bot');
      setTelegramResult(payload);
      setBotToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Telegram bot');
    } finally {
      setTelegramConnecting(false);
    }
  };

  const handleDisconnectTelegram = async (connectionId: string) => {
    setTelegramDisconnectingId(connectionId);
    setError(null);

    try {
      if (!authToken) throw new Error('Sign in before disconnecting Telegram');
      const response = await fetch(`${apiBaseUrl}/api/telegram/bots/${connectionId}/disconnect`, {
        method: 'POST',
        headers: { authorization: `Bearer ${authToken}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to disconnect Telegram bot');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Telegram bot');
    } finally {
      setTelegramDisconnectingId(null);
    }
  };

  const handleSyncAllStocks = async () => {
    setSyncing(true);
    setSyncProgress('Fetching ideas...');
    setSyncComplete(false);
    setError(null);

    try {
      if (!ideas) throw new Error('Ideas not loaded yet');

      // Extract unique tickers
      const tickersMap = new Map<string, string>();

      (ideas as StockIdea[]).forEach((idea) => {
        const contentJson = idea.contentJson;
        if (!contentJson) return;

        // Get template form structure to find stock_graph fields
        const formStructure = idea.category?.template?.formStructure;

        if (formStructure) {
          const stockGraphFields = formStructure.filter(field => field.type === 'stock_graph');

          // Extract ticker values from stock_graph fields
          stockGraphFields.forEach(field => {
            const ticker = contentJson[field.id];
            if (ticker && typeof ticker === 'string' && ticker.trim()) {
              const normalizedTicker = ticker.toUpperCase().trim();
              const createdAt = new Date(idea._creationTime).toISOString().split('T')[0];
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

          await syncStock({ ticker, createdAt });
          synced++;

          // Small delay to avoid hammering Yahoo Finance
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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync stocks');
      setSyncing(false);
      setSyncProgress('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">Settings</h1>
        <p className="text-neutral-500 mt-1">
          Manage your workspace
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-neutral-100 rounded-xl">
              <Bot className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Telegram Bot</h2>
              <p className="text-xs text-neutral-500">Connect your own BotFather bot to Alpha Brain</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-700 space-y-2">
              <p className="font-medium text-neutral-900">BotFather setup</p>
              <p>Open @BotFather in Telegram, run /newbot, copy the token, then paste it here.</p>
              <p className="text-xs text-neutral-500">We validate the token with Telegram, encrypt it, and configure a webhook back to this API.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  value={botToken}
                  onChange={(event) => setBotToken(event.target.value)}
                  placeholder="Paste BotFather token"
                  className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleConnectTelegram}
                disabled={telegramConnecting || !botToken.trim()}
                className="inline-flex h-8 items-center justify-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium md:h-auto md:rounded-xl"
              >
                {telegramConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                Connect Bot
              </button>
            </div>

            {telegramResult && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <p className="font-medium">@{telegramResult.botUsername} is {telegramResult.status}.</p>
                {telegramResult.message && <p className="mt-1">{telegramResult.message}</p>}
                {telegramResult.startUrl && (
                  <a
                    href={telegramResult.startUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 font-medium underline underline-offset-4"
                  >
                    Open bot and press Start
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            <div className="space-y-3">
              {telegramConnections === undefined ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading Telegram bots...
                </div>
              ) : telegramConnections.length === 0 ? (
                <p className="text-sm text-neutral-500">No Telegram bots connected yet.</p>
              ) : (
                telegramConnections.map((connection) => (
                  <div key={connection._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900">@{connection.botUsername}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          connection.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : connection.status === 'broken'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {connection.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">Token ending {connection.tokenHint}</p>
                      {connection.lastWebhookUpdateAt && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Last message: {new Date(connection.lastWebhookUpdateAt).toLocaleString()}
                        </p>
                      )}
                      {connection.lastError && (
                        <p className="text-xs text-red-600 mt-1">{connection.lastError}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDisconnectTelegram(connection._id)}
                      disabled={telegramDisconnectingId === connection._id}
                      className="inline-flex h-8 items-center justify-center gap-2 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors text-sm font-medium md:h-auto"
                    >
                      {telegramDisconnectingId === connection._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                      Disconnect
                    </button>
                  </div>
                ))
              )}
            </div>
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
              className="h-8 w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium md:h-auto md:rounded-xl"
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
      </div>
    </div>
  );
}