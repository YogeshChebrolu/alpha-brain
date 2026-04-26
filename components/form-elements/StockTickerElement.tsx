'use client';

import { FormElementProps } from '@/types/form-element.types';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Stock Ticker Element with "Return Since Thesis" calculation
 * Displays current price and return % since idea creation
 */
export default function StockTickerElement({
  config,
  value,
  onChange,
  mode,
  ideaCreatedAt,
}: FormElementProps) {
  const [stockData, setStockData] = useState<{
    currentPrice: number;
    returnPct: number;
    historicalPrices?: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'view' && value && ideaCreatedAt) {
      fetchStockData(value);
    }
  }, [mode, value, ideaCreatedAt]);

  const fetchStockData = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/stock-prices?ticker=${ticker}&createdAt=${ideaCreatedAt}`
      );
      if (!response.ok) throw new Error('Failed to fetch stock data');
      const data = await response.json();
      setStockData(data);
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'view') {
    if (!value) {
      return (
        <div>
          <label className="block text-sm font-medium mb-1 text-text">
            {config.label}
          </label>
          <p className="text-gray-500">No ticker provided</p>
        </div>
      );
    }

    return (
      <div className="border border-border rounded-lg p-4 bg-white">
        <label className="block text-sm font-medium mb-2 text-text">
          {config.label}
        </label>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-2xl font-bold text-text">{value}</p>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : stockData ? (
              <>
                <p className="text-lg text-text">
                  ${stockData.currentPrice.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {stockData.returnPct >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <p
                    className={`text-sm font-medium ${
                      stockData.returnPct >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {stockData.returnPct >= 0 ? '+' : ''}
                    {stockData.returnPct.toFixed(2)}% since creation
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>

          {stockData && stockData.historicalPrices && (
            <div className="w-32 h-16">
              {/* TODO: Add sparkline chart using recharts or lightweight-charts */}
              <div
                className={`h-full rounded ${
                  stockData.returnPct >= 0
                    ? 'bg-gradient-to-r from-green-100 to-green-50'
                    : 'bg-gradient-to-r from-red-100 to-red-50'
                }`}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-text">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="e.g., AAPL, NVDA, TSLA"
        required={config.required}
        maxLength={5}
        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white uppercase"
      />
      <p className="text-xs text-gray-500 mt-1">Enter stock ticker symbol</p>
    </div>
  );
}
