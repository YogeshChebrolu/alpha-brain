import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchHistoricalPrices, fetchCurrentPrice } from '@/lib/helpers/yahoo-finance';

/**
 * Sync Single Stock API Route
 *
 * GET /api/sync-stock?ticker=TSLA&createdAt=2026-04-27
 *
 * Syncs a single ticker's price history
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.toUpperCase().trim();
    const createdAt = searchParams.get('createdAt');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing ticker parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch current price
    const { price: currentPrice, changePct } = await fetchCurrentPrice(ticker);

    // Get existing historical prices
    const { data: existing } = await supabase
      .from('daily_stock_prices')
      .select('historical_prices')
      .eq('ticker', ticker)
      .single();

    let historicalPrices: Record<string, number>;

    if (!existing) {
      // First sync - backfill from creation date (or 90 days if not provided)
      let startDate = createdAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // If creation date is today or very recent, go back at least 30 days to get meaningful historical data
      const daysDiff = Math.floor((new Date(today).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 30) {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      // Fetch historical data
      historicalPrices = await fetchHistoricalPrices(ticker, startDate, today);

      // Ensure today's price is included
      historicalPrices[today] = currentPrice;
    } else {
      // Existing ticker - append today's price only
      historicalPrices = (existing.historical_prices as Record<string, number>) || {};

      // Only add today's price if not already present
      if (!historicalPrices[today]) {
        historicalPrices[today] = currentPrice;
      }
    }

    // Upsert to database
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

    return NextResponse.json({
      success: true,
      ticker,
      price: currentPrice,
      changePct: changePct.toFixed(2),
      dataPoints: Object.keys(historicalPrices).length,
    });

  } catch (error) {
    console.error('Sync stock error:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: errorStack,
        raw: typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error)
      },
      { status: 500 }
    );
  }
}
