import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Manual Stock Sync API Route
 *
 * For development/testing: manually triggers stock price sync
 * In production, use the Supabase Edge Function with cron scheduling
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Get all unique tickers from ideas
    const { data: ideas, error: ideasError } = await supabase
      .from('ideas')
      .select('content_json, created_at');

    if (ideasError) {
      throw new Error(`Failed to fetch ideas: ${ideasError.message}`);
    }

    // Extract unique tickers
    const tickersMap = new Map<string, string[]>();

    ideas?.forEach((idea) => {
      const contentJson = idea.content_json as Record<string, any> | null;
      const ticker = contentJson?.ticker;

      if (ticker && typeof ticker === 'string') {
        const normalizedTicker = ticker.toUpperCase().trim();
        const date = new Date(idea.created_at!).toISOString().split('T')[0];

        if (!tickersMap.has(normalizedTicker)) {
          tickersMap.set(normalizedTicker, []);
        }
        tickersMap.get(normalizedTicker)!.push(date);
      }
    });

    if (tickersMap.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickers to sync',
        results: []
      });
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const [ticker, creationDates] of tickersMap.entries()) {
      try {
        // Fetch from Yahoo Finance
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Yahoo Finance returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.chart?.result?.[0]?.meta) {
          throw new Error('Invalid response from Yahoo Finance');
        }

        const meta = data.chart.result[0].meta;
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const changePct = previousClose
          ? ((currentPrice - previousClose) / previousClose) * 100
          : 0;

        // Get existing historical prices
        const { data: existing } = await supabase
          .from('daily_stock_prices')
          .select('historical_prices')
          .eq('ticker', ticker)
          .single();

        const historicalPrices = (existing?.historical_prices as Record<string, number>) || {};
        historicalPrices[today] = currentPrice;

        // Store price for creation dates
        for (const creationDate of creationDates) {
          if (!historicalPrices[creationDate]) {
            historicalPrices[creationDate] = currentPrice;
          }
        }

        // Upsert
        const { error: upsertError } = await supabase
          .from('daily_stock_prices')
          .upsert({
            ticker,
            close_price: currentPrice,
            change_pct: changePct,
            last_synced_at: new Date().toISOString(),
            historical_prices: historicalPrices,
          });

        if (upsertError) throw upsertError;

        results.push({
          ticker,
          price: currentPrice,
          changePct: changePct.toFixed(2),
          success: true,
        });

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));

      } catch (error) {
        results.push({
          ticker,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.filter(r => r.success).length}/${results.length} tickers`,
      results,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger stock sync',
    endpoint: '/api/sync-stocks'
  });
}
