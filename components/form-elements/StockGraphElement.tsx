'use client';

import { FormElementProps } from '@/types/form-element.types';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

type StockData = {
  ticker: string;
  close_price: number | null;
  change_pct: number | null;
  historical_prices: { date: string; close: number }[] | null;
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

  const ticker = value?.toUpperCase() || '';

  useEffect(() => {
    if (mode === 'view' && ticker && ideaCreatedAt) {
      fetchStockData(ticker);
    }
  }, [ticker, mode, ideaCreatedAt]);

  const fetchStockData = async (symbol: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stocks/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch stock data');

      const data = await response.json();
      setStockData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const calculateReturns = () => {
    if (!stockData?.historical_prices || !ideaCreatedAt) return null;

    const creationDate = new Date(ideaCreatedAt);
    const prices = stockData.historical_prices;

    // Find price closest to creation date
    const startPrice = prices.find(p => new Date(p.date) >= creationDate)?.close;
    const currentPrice = stockData.close_price;

    if (!startPrice || !currentPrice) return null;

    const returns = ((currentPrice - startPrice) / startPrice) * 100;
    return returns;
  };

  if (mode === 'view') {
    const returns = calculateReturns();

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
          </div>
        ) : stockData ? (
          <div className="p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">{ticker}</h3>
                <p className="text-2xl font-bold text-neutral-900">
                  ${stockData.close_price?.toFixed(2)}
                </p>
              </div>
              {returns !== null && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${
                  returns >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {returns >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {returns >= 0 ? '+' : ''}{returns.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Simple sparkline */}
            {stockData.historical_prices && stockData.historical_prices.length > 0 && (
              <div className="h-16 flex items-end gap-0.5">
                {stockData.historical_prices.slice(-30).map((price, i) => {
                  const maxPrice = Math.max(...stockData.historical_prices!.map(p => p.close));
                  const minPrice = Math.min(...stockData.historical_prices!.map(p => p.close));
                  const height = ((price.close - minPrice) / (maxPrice - minPrice)) * 100;

                  return (
                    <div
                      key={i}
                      className="flex-1 bg-neutral-900/80 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${price.date}: $${price.close}`}
                    />
                  );
                })}
              </div>
            )}

            <p className="text-xs text-neutral-500 mt-2">
              Returns since idea creation
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Enter ticker symbol to view chart</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={ticker}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={config.placeholder || 'e.g., AAPL'}
        required={config.required}
        className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white uppercase"
        maxLength={5}
      />
      {config.placeholder && (
        <p className="text-xs text-neutral-500">{config.placeholder}</p>
      )}
    </div>
  );
}
