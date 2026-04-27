/**
 * Yahoo Finance API Helper
 *
 * Fetches historical stock prices from Yahoo Finance API (no API key required)
 * Used for backfilling historical data and daily price updates
 */

export interface HistoricalPrices {
  [date: string]: number; // ISO date string -> closing price
}

/**
 * Fetch historical stock prices from Yahoo Finance
 *
 * @param ticker - Stock symbol (e.g., 'AAPL', 'TSLA')
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Object mapping dates to closing prices
 */
export async function fetchHistoricalPrices(
  ticker: string,
  startDate: string,
  endDate: string
): Promise<HistoricalPrices> {
  try {
    // Convert dates to Unix timestamps (Yahoo Finance API requirement)
    const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
    const endUnix = Math.floor(new Date(endDate).getTime() / 1000);

    // Validate timestamps
    if (isNaN(startUnix) || isNaN(endUnix)) {
      throw new Error(`Invalid date format: start=${startDate}, end=${endDate}`);
    }

    if (startUnix > endUnix) {
      throw new Error(`Start date (${startDate}) is after end date (${endDate})`);
    }

    // Yahoo Finance API endpoint for historical data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${startUnix}&period2=${endUnix}`;

    console.log(`Fetching historical data for ${ticker}: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Yahoo Finance error for ${ticker}:`, errorText);
      throw new Error(`Yahoo Finance API returned ${response.status} for ${ticker}`);
    }

    const data = await response.json();

    // Validate response structure
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

    // Build date -> price mapping
    const historicalPrices: HistoricalPrices = {};

    for (let i = 0; i < timestamps.length; i++) {
      const closePrice = closePrices[i];

      // Skip null values (market holidays, data gaps)
      if (closePrice === null || closePrice === undefined) {
        continue;
      }

      // Convert Unix timestamp to ISO date string (YYYY-MM-DD)
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      historicalPrices[date] = closePrice;
    }

    return historicalPrices;

  } catch (error) {
    throw new Error(
      `Failed to fetch historical prices for ${ticker}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Fetch current stock price from Yahoo Finance
 *
 * @param ticker - Stock symbol (e.g., 'AAPL', 'TSLA')
 * @returns Object with current price and change percentage
 */
export async function fetchCurrentPrice(ticker: string): Promise<{
  price: number;
  changePct: number;
}> {
  try {
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

    return {
      price: currentPrice,
      changePct,
    };

  } catch (error) {
    throw new Error(
      `Failed to fetch current price for ${ticker}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
