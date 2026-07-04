'use client';

import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@alpha-brain/convex';
import {
  Clock,
  Loader2,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

/**
 * Settings Page
 * Currently just Stock Data Sync — notification preferences were removed.
 */
export default function SettingsPage() {
  const [error, setError] = useState<string | null>(null);

  // Stock sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncComplete, setSyncComplete] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // TODO: add api.stocks.latestSync query
  // lastSynced is left null initially and set from local state after a sync run.

  const ideas = useQuery(api.ideas.list, {});
  const syncStock = useAction(api.stocks.sync);

  const handleSyncAllStocks = async () => {
    setSyncing(true);
    setSyncProgress('Fetching ideas...');
    setSyncComplete(false);
    setError(null);

    try {
      if (!ideas) throw new Error('Ideas not loaded yet');

      // Extract unique tickers
      const tickersMap = new Map<string, string>();

      ideas.forEach((idea: any) => {
        const contentJson = idea.contentJson as Record<string, any> | null;
        if (!contentJson) return;

        // Get template form structure to find stock_graph fields
        const formStructure = idea.category?.template?.formStructure as any[];

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

    } catch (err: any) {
      setError(err.message || 'Failed to sync stocks');
      setSyncing(false);
      setSyncProgress('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 mt-1">
          Manage your workspace
        </p>
      </div>

      <div className="space-y-8">
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
      </div>
    </div>
  );
}
