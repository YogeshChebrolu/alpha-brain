import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchHistoricalPrices, fetchCurrentPrice } from '@/lib/helpers/yahoo-finance';

/**
 * Manual Stock Sync API Route
 *
 * For development/testing: manually triggers stock price sync
 * In production, use the Supabase Edge Function with cron scheduling
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Get all ideas (simplified query for debugging)
    const { data: ideas, error: ideasError } = await supabase
      .from('ideas')
      .select('content_json, created_at');

    if (ideasError) {
      throw new Error(`Failed to fetch ideas: ${ideasError.message}`);
    }

    // Extract unique tickers by scanning content_json values
    const tickersMap = new Map<string, string[]>();

    ideas?.forEach((idea: any) => {
      const contentJson = idea.content_json as Record<string, any> | null;
      if (!contentJson) return;

      // Get template form structure to find stock_graph fields
      const formStructure = idea.categories?.templates?.form_structure as any[];

      if (formStructure) {
        const stockGraphFields = formStructure.filter(field => field.type === 'stock_graph');

        // Extract ticker values from stock_graph fields
        stockGraphFields.forEach(field => {
          const ticker = contentJson[field.id];

          if (ticker && typeof ticker === 'string' && ticker.trim()) {
            const normalizedTicker = ticker.toUpperCase().trim();
            const date = new Date(idea.created_at!).toISOString().split('T')[0];

            if (!tickersMap.has(normalizedTicker)) {
              tickersMap.set(normalizedTicker, []);
            }
            tickersMap.get(normalizedTicker)!.push(date);
          }
        });
      } else {
        // Fallback: scan all values in content_json for potential ticker symbols
        // Look for short uppercase strings (1-5 chars) that could be tickers
        Object.values(contentJson).forEach(value => {
          if (typeof value === 'string') {
            const trimmed = value.trim().toUpperCase();
            // Match typical stock ticker pattern: 1-5 uppercase letters
            if (/^[A-Z]{1,5}$/.test(trimmed)) {
              const date = new Date(idea.created_at!).toISOString().split('T')[0];

              if (!tickersMap.has(trimmed)) {
                tickersMap.set(trimmed, []);
              }
              tickersMap.get(trimmed)!.push(date);
            }
          }
        });
      }
    });

    if (tickersMap.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickers to sync',
        debug: {
          ideasCount: ideas?.length || 0,
          sampleIdea: ideas?.[0] ? {
            hasContentJson: !!ideas[0].content_json,
            contentJsonKeys: ideas[0].content_json ? Object.keys(ideas[0].content_json) : [],
            hasCategories: !!ideas[0].categories,
            hasTemplates: !!(ideas[0] as any).categories?.templates,
          } : null,
        },
        results: []
      });
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const [ticker, creationDates] of tickersMap.entries()) {
      try {
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
          // First sync for this ticker - backfill from earliest creation date
          const earliestDate = creationDates.sort()[0]; // Dates are already in YYYY-MM-DD format

          // Fetch historical data from earliest idea creation to today
          historicalPrices = await fetchHistoricalPrices(ticker, earliestDate, today);

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
