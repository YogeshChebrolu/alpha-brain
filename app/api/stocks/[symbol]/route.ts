import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Stock Data API Endpoint
 *
 * GET /api/stocks/[symbol]?createdAt=YYYY-MM-DD
 *
 * Returns stock data with historical prices formatted for graphing.
 * Filters historical data to show only prices from creation date onwards.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const ticker = symbol.toUpperCase();
    const { searchParams } = new URL(request.url);
    const createdAt = searchParams.get('createdAt');

    const supabase = await createClient();

    // Fetch stock data from cache
    const { data, error } = await supabase
      .from('daily_stock_prices')
      .select('*')
      .eq('ticker', ticker)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: `No data found for ${ticker}. Run stock sync first.`,
          ticker,
        },
        { status: 404 }
      );
    }

    // Transform JSONB object to sorted array
    const historicalPrices = data.historical_prices as Record<string, number> | null;

    if (!historicalPrices) {
      return NextResponse.json(
        {
          error: `No historical data for ${ticker}`,
          ticker,
        },
        { status: 404 }
      );
    }

    // Convert to array and sort by date
    const historicalArray = Object.entries(historicalPrices)
      .map(([date, close]) => ({
        date,
        close: close as number,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter from creation date onwards if provided
    let filteredPrices = historicalArray;
    let growthSinceCreation: number | undefined;
    let daysSinceCreation: number | undefined;

    if (createdAt) {
      const creationDate = new Date(createdAt);
      filteredPrices = historicalArray.filter(
        (p) => new Date(p.date) >= creationDate
      );

      // Calculate growth percentage
      if (filteredPrices.length > 0 && data.close_price) {
        const startPrice = filteredPrices[0].close;
        const currentPrice = data.close_price;
        growthSinceCreation = ((currentPrice - startPrice) / startPrice) * 100;

        // Calculate days since creation
        const today = new Date();
        daysSinceCreation = Math.floor(
          (today.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    return NextResponse.json({
      ticker,
      close_price: data.close_price,
      change_pct: data.change_pct,
      historical_prices: filteredPrices,
      growth_since_creation: growthSinceCreation,
      days_since_creation: daysSinceCreation,
      last_synced_at: data.last_synced_at,
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch stock data',
      },
      { status: 500 }
    );
  }
}
