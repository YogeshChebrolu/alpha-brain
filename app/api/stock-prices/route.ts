import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Stock Price API Route
 * Returns cached stock price and calculates return % since idea creation
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  const createdAt = searchParams.get('createdAt');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Fetch cached price from daily_stock_prices table
    const { data: stockPrice, error } = await supabase
      .from('daily_stock_prices')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .single();

    if (error || !stockPrice) {
      // If no cached price, return mock data for development
      // In production, this would trigger a fetch from Yahoo Finance
      return NextResponse.json({
        currentPrice: 0,
        returnPct: 0,
        historicalPrices: null,
        error: 'Price not found - run stock sync',
      });
    }

    // Calculate return % if createdAt is provided
    let returnPct = 0;
    if (createdAt && stockPrice.historical_prices) {
      const creationDate = new Date(createdAt).toISOString().split('T')[0];
      const historicalPrices = stockPrice.historical_prices as Record<
        string,
        number
      >;

      // Find the closest date to creation date
      const creationPrice = historicalPrices[creationDate];

      if (creationPrice && stockPrice.close_price) {
        returnPct =
          ((stockPrice.close_price - creationPrice) / creationPrice) * 100;
      }
    }

    return NextResponse.json({
      currentPrice: stockPrice.close_price || 0,
      returnPct,
      changePct: stockPrice.change_pct || 0,
      historicalPrices: stockPrice.historical_prices,
      lastSyncedAt: stockPrice.last_synced_at,
    });
  } catch (err) {
    console.error('Stock price API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch stock price' },
      { status: 500 }
    );
  }
}
