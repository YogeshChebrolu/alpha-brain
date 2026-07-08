import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const YF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

const EXCHANGE_SUFFIXES = [".NS", ".BO"] as const;

function normalizeStockTicker(value: string): string {
  let ticker = value.toUpperCase().trim().replace(/\s+/g, "");

  for (const suffix of EXCHANGE_SUFFIXES) {
    while (ticker.endsWith(`${suffix}${suffix}`)) {
      ticker = ticker.slice(0, -suffix.length);
    }
  }

  return ticker;
}

// Yahoo Finance historical closes as a { "YYYY-MM-DD": price } map (no API key).
async function fetchHistoricalPrices(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
  const endUnix = Math.floor(new Date(endDate).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${startUnix}&period2=${endUnix}`;
  const response = await fetch(url, { headers: YF_HEADERS });
  if (!response.ok) {
    throw new Error(`Yahoo Finance returned ${response.status} for ${ticker}`);
  }
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const timestamps: number[] | undefined = result?.timestamp;
  const closePrices: (number | null)[] | undefined =
    result?.indicators?.quote?.[0]?.close;
  if (!timestamps || !closePrices) {
    throw new Error(`No price data for ${ticker}`);
  }
  const prices: Record<string, number> = {};
  for (let i = 0; i < timestamps.length; i++) {
    const close = closePrices[i];
    if (close === null || close === undefined) continue;
    const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
    prices[date] = close;
  }
  return prices;
}

async function fetchCurrentPrice(
  ticker: string,
): Promise<{ price: number; changePct: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const response = await fetch(url, { headers: YF_HEADERS });
  if (!response.ok) {
    throw new Error(`Yahoo Finance returned ${response.status} for ${ticker}`);
  }
  const data = await response.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Invalid Yahoo response for ${ticker}`);
  const price: number = meta.regularMarketPrice;
  const prev: number | undefined = meta.previousClose ?? meta.chartPreviousClose;
  const changePct = prev ? ((price - prev) / prev) * 100 : 0;
  return { price, changePct };
}

// Fetches a ticker's prices from Yahoo and upserts them into Convex. Replaces
// the old /api/sync-stock Next route (which wrote to Supabase). Runs in a Convex
// action because it makes external fetch calls.
export const sync = action({
  args: { ticker: v.string(), createdAt: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ ticker: string; price: number; dataPoints: number }> => {
    const ticker = normalizeStockTicker(args.ticker);
    const today = new Date().toISOString().split("T")[0];

    const { price, changePct } = await fetchCurrentPrice(ticker);
    const existing = await ctx.runQuery(api.stocks.getByTicker, { ticker });

    let historicalPrices: Record<string, number>;
    if (!existing) {
      // First sync — backfill from creation date (min 30 days for a useful chart).
      let startDate =
        args.createdAt ||
        new Date(Date.now() - 90 * 864e5).toISOString().split("T")[0];
      const daysDiff = Math.floor(
        (new Date(today).getTime() - new Date(startDate).getTime()) / 864e5,
      );
      if (daysDiff < 30) {
        startDate = new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0];
      }
      historicalPrices = await fetchHistoricalPrices(ticker, startDate, today);
      historicalPrices[today] = price;
    } else {
      historicalPrices = (existing.historicalPrices as Record<string, number>) || {};
      if (!historicalPrices[today]) historicalPrices[today] = price;
    }

    await ctx.runMutation(api.stocks.upsert, {
      ticker,
      closePrice: price,
      changePct,
      historicalPrices,
    });

    return { ticker, price, dataPoints: Object.keys(historicalPrices).length };
  },
});

// Global stock-price cache (not user-scoped). Read + upsert by ticker.
export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, { ticker }) => {
    const normalizedTicker = normalizeStockTicker(ticker);
    return await ctx.db
      .query("daily_stock_prices")
      .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    ticker: v.string(),
    closePrice: v.optional(v.number()),
    changePct: v.optional(v.number()),
    historicalPrices: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const ticker = normalizeStockTicker(args.ticker);
    const existing = await ctx.db
      .query("daily_stock_prices")
      .withIndex("by_ticker", (q) => q.eq("ticker", ticker))
      .unique();
    const doc = {
      ticker,
      closePrice: args.closePrice,
      changePct: args.changePct,
      historicalPrices: args.historicalPrices,
      lastSyncedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("daily_stock_prices", doc);
  },
});
