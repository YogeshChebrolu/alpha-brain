'use client';

import { FormElementProps } from '@/types/form-element.types';
import { TrendingUp, TrendingDown, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type StockData = {
  ticker: string;
  close_price: number | null;
  change_pct: number | null;
  historical_prices: { date: string; close: number }[];
  growth_since_creation?: number;
  days_since_creation?: number;
  last_synced_at?: string;
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
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Exchange-related state (for edit mode)
  const [exchange, setExchange] = useState<'US' | 'NSE'>('US');
  const [baseTicker, setBaseTicker] = useState('');
  const [exchangeMenuOpen, setExchangeMenuOpen] = useState(false);
  const exchangeMenuRef = useRef<HTMLDivElement>(null);

  const ticker = value?.toUpperCase() || '';

  useEffect(() => {
    if (mode === 'view' && ticker && ideaCreatedAt) {
      fetchStockData(ticker);
    }
  }, [ticker, mode, ideaCreatedAt]);

  // Parse ticker on mount to separate base ticker and exchange (for edit mode)
  useEffect(() => {
    if (!ticker) return;

    if (ticker.endsWith('.NS') || ticker.endsWith('.BO')) {
      setBaseTicker(ticker.replace('.NS', '').replace('.BO', ''));
      setExchange('NSE');
    } else {
      setBaseTicker(ticker);
      setExchange('US');
    }
  }, [ticker]);

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
    if (!stockData.historical_prices || stockData.historical_prices.length === 0) {
      console.log('No historical prices available');
      return;
    }

    console.log('Initializing chart with data:', stockData.historical_prices.length, 'data points');

    // Clean up previous chart before creating new one
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    let resizeHandler: (() => void) | null = null;

    // Dynamically import lightweight-charts to avoid SSR issues
    const initChart = async () => {
      try {
        const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');

        // Double-check container still exists
        if (!chartContainerRef.current) {
          console.log('Chart container disappeared');
          return;
        }

        // Create chart
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#525252',
          },
          width: chartContainerRef.current.clientWidth,
          height: 160,
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
        const isPositive = stockData.growth_since_creation !== undefined && stockData.growth_since_creation >= 0;
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
        const chartData = stockData.historical_prices.map((price) => ({
          time: price.date, // lightweight-charts accepts YYYY-MM-DD format
          value: price.close,
        }));

        console.log('Setting chart data:', chartData.length, 'points');
        areaSeries.setData(chartData);
        chart.timeScale().fitContent();

        // Store chart instance
        chartInstanceRef.current = chart;

        // Handle resize
        resizeHandler = () => {
          if (chartContainerRef.current && chartInstanceRef.current) {
            chartInstanceRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', resizeHandler);
      } catch (error) {
        console.error('Chart initialization error:', error);
      }
    };

    initChart();

    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [stockData, mode]);

  const fetchStockData = async (symbol: string, autoSync = true) => {
    setLoading(true);
    setError(null);

    try {
      // Extract just the date part (YYYY-MM-DD) from timestamp
      const dateOnly = ideaCreatedAt ? new Date(ideaCreatedAt).toISOString().split('T')[0] : '';
      const url = `/api/stocks/${symbol}${dateOnly ? `?createdAt=${dateOnly}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();

        // If no data found and autoSync is enabled, try to sync it first
        if (response.status === 404 && autoSync && ideaCreatedAt) {
          console.log(`No data found for ${symbol}, auto-syncing...`);
          setError(`Syncing ${symbol} for the first time...`);

          // Extract just the date part (YYYY-MM-DD) from timestamp
          const dateOnly = new Date(ideaCreatedAt).toISOString().split('T')[0];

          // Trigger sync
          const syncUrl = `/api/sync-stock?ticker=${symbol}&createdAt=${dateOnly}`;
          const syncResponse = await fetch(syncUrl);

          if (!syncResponse.ok) {
            throw new Error('Failed to sync stock data');
          }

          // Wait a moment for sync to complete, then retry fetching
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Retry fetching (without auto-sync to avoid infinite loop)
          return fetchStockData(symbol, false);
        }

        throw new Error(errorData.error || 'Failed to fetch stock data');
      }

      const data = await response.json();
      setStockData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

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
            {!error.includes('Syncing') && (
              <p className="text-xs text-red-500 mt-1">
                If this issue persists, the stock symbol may be invalid or Yahoo Finance may be temporarily unavailable.
              </p>
            )}
          </div>
        ) : stockData ? (
          <div className="p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl border border-neutral-200">
            {/* Header with price and growth */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {ticker.replace('.NS', '').replace('.BO', '')}
                  </h3>
                  {(ticker.includes('.NS') || ticker.includes('.BO')) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                      NSE
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-neutral-900">
                  {ticker.includes('.NS') || ticker.includes('.BO') ? '₹' : '$'}
                  {stockData.close_price?.toFixed(2)}
                </p>
                {stockData.change_pct !== null && (
                  <p className="text-xs text-neutral-500 mt-1">
                    {stockData.change_pct >= 0 ? '+' : ''}
                    {stockData.change_pct.toFixed(2)}% today
                  </p>
                )}
              </div>
              {stockData.growth_since_creation !== undefined && (
                <div className={`flex items-center gap-1.5 px-4 py-2 rounded-lg ${
                  stockData.growth_since_creation >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {stockData.growth_since_creation >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span className="text-base font-semibold">
                    {stockData.growth_since_creation >= 0 ? '+' : ''}
                    {stockData.growth_since_creation.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Chart */}
            {stockData.historical_prices && stockData.historical_prices.length > 0 ? (
              <div
                ref={chartContainerRef}
                className="w-full rounded-lg overflow-hidden bg-white border border-neutral-200"
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
                  {stockData.days_since_creation !== undefined && (
                    <>
                      {stockData.days_since_creation} day{stockData.days_since_creation !== 1 ? 's' : ''} since creation
                    </>
                  )}
                </span>
              </div>
              {stockData.last_synced_at && (
                <span>
                  Last updated: {new Date(stockData.last_synced_at).toLocaleDateString()}
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
    const cleanTicker = newTicker.toUpperCase().trim();

    // Combine ticker with exchange suffix
    let fullTicker = cleanTicker;
    if (newExchange === 'NSE') {
      fullTicker = `${cleanTicker}.NS`;
    }

    onChange(fullTicker);
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
