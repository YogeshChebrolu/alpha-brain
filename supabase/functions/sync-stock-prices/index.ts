import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Fetch historical stock prices from Yahoo Finance
 */
async function fetchHistoricalPrices(
  ticker: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
  const endUnix = Math.floor(new Date(endDate).getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${startUnix}&period2=${endUnix}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned ${response.status} for ${ticker}`);
  }

  const data = await response.json();

  if (!data.chart?.result?.[0]) {
    throw new Error(`Invalid response from Yahoo Finance for ${ticker}`);
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp as number[];
  const quotes = result.indicators?.quote?.[0];
  const closePrices = quotes?.close as (number | null)[];

  if (!timestamps || !closePrices) {
    throw new Error(`No price data available for ${ticker}`);
  }

  const historicalPrices: Record<string, number> = {};

  for (let i = 0; i < timestamps.length; i++) {
    const closePrice = closePrices[i];

    if (closePrice === null || closePrice === undefined) {
      continue;
    }

    const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    historicalPrices[date] = closePrice;
  }

  return historicalPrices;
}

/**
 * Fetch current stock price from Yahoo Finance
 */
async function fetchCurrentPrice(ticker: string): Promise<{
  price: number;
  changePct: number;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned ${response.status}`);
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

  return { price: currentPrice, changePct };
}

/**
 * Sync Stock Prices Edge Function
 *
 * Fetches current stock prices from Yahoo Finance and caches them in daily_stock_prices table.
 * Should be scheduled to run Mon-Fri at market close (4 PM EST).
 *
 * Process:
 * 1. Scan all ideas for unique ticker symbols in content_json
 * 2. Fetch current price from Yahoo Finance API
 * 3. Upsert into daily_stock_prices with historical_prices JSONB
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting stock price sync...');

    // Step 1: Get all ideas with their templates to find stock graph fields
    const { data: ideas, error: ideasError } = await supabase
      .from('ideas')
      .select('content_json, created_at, categories(templates(form_structure))');

    if (ideasError) {
      throw new Error(`Failed to fetch ideas: ${ideasError.message}`);
    }

    // Extract unique tickers by scanning content_json values
    const tickersMap = new Map<string, string[]>(); // ticker -> [creation dates]

    ideas?.forEach((idea: any) => {
      const contentJson = idea.content_json as Record<string, any> | null;
      if (!contentJson) return;

      // Get template form structure to find stock_graph fields
      const formStructure = idea.categories?.templates?.form_structure as any[];
      const stockGraphFields = formStructure?.filter(field => field.type === 'stock_graph') || [];

      // Extract ticker values from stock_graph fields
      stockGraphFields.forEach(field => {
        const ticker = contentJson[field.id];

        if (ticker && typeof ticker === 'string' && ticker.trim()) {
          const normalizedTicker = ticker.toUpperCase().trim();
          const date = new Date(idea.created_at).toISOString().split('T')[0];

          if (!tickersMap.has(normalizedTicker)) {
            tickersMap.set(normalizedTicker, []);
          }
          tickersMap.get(normalizedTicker)!.push(date);
        }
      });
    });

    console.log(`Found ${tickersMap.size} unique tickers to sync`);

    if (tickersMap.size === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No tickers to sync', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch prices for each ticker
    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const [ticker, creationDates] of tickersMap.entries()) {
      try {
        console.log(`Fetching price for ${ticker}...`);

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

          console.log(`Backfilling historical data for ${ticker} from ${earliestDate} to ${today}`);

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

        // Step 4: Upsert to cache table
        const { error: upsertError } = await supabase
          .from('daily_stock_prices')
          .upsert({
            ticker,
            close_price: currentPrice,
            change_pct: changePct,
            last_synced_at: new Date().toISOString(),
            historical_prices: historicalPrices,
          });

        if (upsertError) {
          throw new Error(`Failed to upsert: ${upsertError.message}`);
        }

        results.push({
          ticker,
          price: currentPrice,
          changePct: changePct.toFixed(2),
          success: true,
        });

        console.log(`✓ ${ticker}: $${currentPrice} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`);

        // Rate limiting - wait between requests
        await new Promise((resolve) => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`✗ ${ticker}: ${error.message}`);
        results.push({
          ticker,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Sync complete: ${successCount}/${results.length} tickers updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount}/${results.length} tickers`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock sync failed:', error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
