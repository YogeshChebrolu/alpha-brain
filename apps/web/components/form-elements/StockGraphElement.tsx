'use client';

import type { FormElementProps } from '@/types/form-element.types';
import type { IChartApi } from 'lightweight-charts';
import { TrendingUp, TrendingDown, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@alpha-brain/convex';

type HistoricalPoint = { date: string; close: number };

const stripExchangeSuffixes = (value: string) =>
  value.toUpperCase().trim().replace(/(\.(NS|BO))+$/i, '');

const normalizeTickerForExchange = (value: string, exchange: 'US' | 'NSE') => {
  const cleanTicker = stripExchangeSuffixes(value);
  return exchange === 'NSE' && cleanTicker ? `${cleanTicker}.NS` : cleanTicker;
};

/**
 * Stock Graph Element
 * Visual chart showing stock performance since idea creation
 * Uses daily_stock_prices table for cached data
 */
export default function StockGraphElement({
  config,
  value,
  onChange,
  mode,
  ideaCreatedAt,
}: FormElementProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  // Exchange-related state (for edit mode)
  const [exchange, setExchange] = useState<'US' | 'NSE'>('US');
  const [baseTicker, setBaseTicker] = useState('');
  const [exchangeMenuOpen, setExchangeMenuOpen] = useState(false);
  const exchangeMenuRef = useRef<HTMLDivElement>(null);

  const ticker = value?.toUpperCase() || '';

  // Fetch cached stock data from Convex
  const stockDoc = useQuery(
    api.stocks.getByTicker,
    ticker ? { ticker } : 'skip'
  ) as
    | {
        closePrice: number | null;
        changePct: number | null;
        historicalPrices: Record<string, number> | null;
        growthSinceCreation?: number;
        daysSinceCreation?: number;
        lastSyncedAt?: number;
      }
    | null
    | undefined;

  // Auto-sync: if we're viewing an idea with a ticker but there's no cached
  // price data yet (or it's stale), fetch it on demand instead of forcing the
  // user to run the manual sync in Settings.
  const syncStock = useAction(api.stocks.sync);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== 'view' || !ticker) return;
    if (stockDoc === undefined) return; // still loading the query
    const isStale =
      stockDoc?.lastSyncedAt !== undefined &&
      Date.now() - stockDoc.lastSyncedAt > 12 * 60 * 60 * 1000;
    const needsSync = stockDoc === null || isStale;
    if (!needsSync || attemptedRef.current === ticker) return;

    attemptedRef.current = ticker; // only try once per ticker per mount
    setAutoSyncing(true);
    setSyncError(null);
    syncStock({
      ticker,
      createdAt: ideaCreatedAt
        ? new Date(ideaCreatedAt).toISOString().split('T')[0]
        : undefined,
    })
      .catch((err: unknown) => {
        setSyncError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setAutoSyncing(false));
  }, [mode, ticker, stockDoc, syncStock, ideaCreatedAt]);

  const loading =
    ticker !== '' && (stockDoc === undefined || (stockDoc === null && autoSyncing));
  const error: string | null =
    ticker !== '' && stockDoc === null && !autoSyncing
      ? syncError
        ? `Couldn't load stock data: ${syncError}`
        : 'No stock data found for this ticker'
      : null;

  // Normalize the historicalPrices map ({date: price}) into a sorted array
  const historicalPrices: HistoricalPoint[] = useMemo(
    () =>
      stockDoc?.historicalPrices
        ? Object.entries(stockDoc.historicalPrices)
            .map(([date, close]) => ({ date, close: close as number }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [stockDoc],
  );

  const stockData = useMemo(
    () =>
      stockDoc
        ? {
            closePrice: stockDoc.closePrice,
            changePct: stockDoc.changePct,
            historicalPrices,
            growthSinceCreation: stockDoc.growthSinceCreation,
            daysSinceCreation: stockDoc.daysSinceCreation,
            lastSyncedAt: stockDoc.lastSyncedAt,
          }
        : null,
    [historicalPrices, stockDoc],
  );

  // Keep editable ticker fields in sync when a saved value is loaded into the form.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ticker) return;

    if (ticker.endsWith('.NS') || ticker.endsWith('.BO')) {
      setBaseTicker(stripExchangeSuffixes(ticker));
      setExchange('NSE');
    } else {
      setBaseTicker(ticker);
      setExchange('US');
    }
  }, [ticker]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle click outside for exchange menu (for edit mode)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exchangeMenuRef.current &&
        !exchangeMenuRef.current.contains(event.target as Node)
      ) {
        setExchangeMenuOpen(false);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Initialize chart when data is available
  useEffect(() => {
    if (!stockData || !chartContainerRef.current || mode !== 'view') return;

    // Check if we have historical data
    if (!stockData.historicalPrices || stockData.historicalPrices.length === 0) {
      console.log('No historical prices available');
      return;
    }

    console.log('Initializing chart with data:', stockData.historicalPrices.length, 'data points');

    // Clean up previous chart before creating new one
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    // Dynamically import lightweight-charts to avoid SSR issues
    const initChart = async () => {
      try {
        const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');

        // Double-check container still exists
        if (!chartContainerRef.current) {
          console.log('Chart container disappeared');
          return;
        }

        // Create chart. autoSize lets the chart observe its container and keep
        // the canvas matched to the (responsive) box — measuring clientWidth
        // once at init drew the canvas wider than the box on mobile, clipping
        // the plot and floating the price axis out into dead space.
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#525252',
            fontSize: 11,
            attributionLogo: false,
          },
          autoSize: true,
          grid: {
            vertLines: { color: '#f5f5f5' },
            horzLines: { color: '#f5f5f5' },
          },
          rightPriceScale: {
            borderColor: '#e5e5e5',
          },
          timeScale: {
            borderColor: '#e5e5e5',
            timeVisible: true,
          },
        });

        // Determine color based on growth
        const isPositive = stockData.growthSinceCreation !== undefined && stockData.growthSinceCreation >= 0;
        const lineColor = isPositive ? '#10B981' : '#EF4444';
        const topColor = isPositive ? '#10B98133' : '#EF444433';
        const bottomColor = isPositive ? '#10B98108' : '#EF444408';

        // Add area series (v5 API: addSeries instead of addAreaSeries)
        const areaSeries = chart.addSeries(AreaSeries, {
          lineColor,
          topColor,
          bottomColor,
          lineWidth: 2,
        });

        // Format data for lightweight-charts
        const chartData = stockData.historicalPrices.map((price) => ({
          time: price.date, // lightweight-charts accepts YYYY-MM-DD format
          value: price.close,
        }));

        console.log('Setting chart data:', chartData.length, 'points');
        areaSeries.setData(chartData);
        chart.timeScale().fitContent();

        // Store chart instance
        chartInstanceRef.current = chart;
      } catch (error) {
        console.error('Chart initialization error:', error);
      }
    };

    initChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [stockData, mode]);

  if (mode === 'view') {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>

        {loading ? (
          <div className="flex items-center gap-2 p-4 bg-neutral-50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
            <span className="text-sm text-neutral-500">Loading stock data...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-xs text-red-500 mt-1">
              If this issue persists, the stock symbol may be invalid or price history has not been synced yet.
            </p>
          </div>
        ) : stockData ? (
          <div className="p-4 md:p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl border border-neutral-200">
            {/* Header with price and growth */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {stripExchangeSuffixes(ticker)}
                  </h3>
                  {(ticker.includes('.NS') || ticker.includes('.BO')) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                      NSE
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-neutral-900 md:text-3xl">
                  {ticker.includes('.NS') || ticker.includes('.BO') ? '₹' : '$'}
                  {stockData.closePrice?.toFixed(2)}
                </p>
                {stockData.changePct !== null && stockData.changePct !== undefined && (
                  <p className="text-xs text-neutral-500 mt-1">
                    {stockData.changePct >= 0 ? '+' : ''}
                    {stockData.changePct.toFixed(2)}% today
                  </p>
                )}
              </div>
              {stockData.growthSinceCreation !== undefined && (
                <div className={`flex items-center gap-1.5 px-4 py-2 rounded-lg ${
                  stockData.growthSinceCreation >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {stockData.growthSinceCreation >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span className="text-base font-semibold">
                    {stockData.growthSinceCreation >= 0 ? '+' : ''}
                    {stockData.growthSinceCreation.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Chart */}
            {stockData.historicalPrices && stockData.historicalPrices.length > 0 ? (
              <div
                ref={chartContainerRef}
                className="h-40 w-full rounded-lg overflow-hidden bg-white border border-neutral-200"
              />
            ) : (
              <div className="w-full rounded-lg bg-white border border-neutral-200 p-8 flex flex-col items-center justify-center text-center">
                <TrendingDown className="w-12 h-12 text-neutral-300 mb-3" />
                <p className="text-sm font-medium text-neutral-600 mb-1">No Historical Data</p>
                <p className="text-xs text-neutral-500">
                  Run the stock sync in settings to fetch price history
                </p>
              </div>
            )}

            {/* Footer with metadata */}
            <div className="flex items-center justify-between mt-4 text-xs text-neutral-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {stockData.daysSinceCreation !== undefined && (
                    <>
                      {stockData.daysSinceCreation} day{stockData.daysSinceCreation !== 1 ? 's' : ''} since creation
                    </>
                  )}
                </span>
              </div>
              {stockData.lastSyncedAt && (
                <span>
                  Last updated: {new Date(stockData.lastSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Enter ticker symbol to view chart</p>
        )}
      </div>
    );
  }

  const handleTickerChange = (newTicker: string, newExchange: 'US' | 'NSE') => {
    onChange(normalizeTickerForExchange(newTicker, newExchange));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-3">
        <input
          type="text"
          value={baseTicker}
          onChange={(e) => {
            setBaseTicker(e.target.value);
            handleTickerChange(e.target.value, exchange);
          }}
          placeholder={exchange === 'US' ? 'e.g., AAPL, TSLA' : 'e.g., RELIANCE, TCS'}
          required={config.required}
          className="flex-1 px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white uppercase font-medium"
          maxLength={15}
        />

        <div className="relative min-w-[140px]" ref={exchangeMenuRef}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExchangeMenuOpen((open) => !open);
            }}
            className="w-full flex items-center justify-between px-4 py-3 border border-neutral-200 rounded-2xl bg-white text-neutral-900 font-medium shadow-sm transition-all hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 focus:ring-offset-white"
          >
            <span>{exchange === 'US' ? 'US' : 'India'}</span>
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          </button>

          {exchangeMenuOpen && (
            <div className="absolute right-0 left-0 mt-2 bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden z-50">
              <button
                type="button"
                onClick={() => {
                  setExchange('US');
                  handleTickerChange(baseTicker, 'US');
                  setExchangeMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 transition-colors ${exchange === 'US' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                US
              </button>
              <button
                type="button"
                onClick={() => {
                  setExchange('NSE');
                  handleTickerChange(baseTicker, 'NSE');
                  setExchangeMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 transition-colors ${exchange === 'NSE' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                India
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        {exchange === 'NSE' && 'Indian stocks on NSE (symbol will be saved as TICKER.NS)'}
        {exchange === 'US' && 'US stocks (NASDAQ, NYSE, etc.)'}
      </p>
    </div>
  );
}
