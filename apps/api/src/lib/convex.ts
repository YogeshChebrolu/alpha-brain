import { ConvexHttpClient } from "convex/browser";

// Build one Convex HTTP client per request. When a Convex Auth JWT is forwarded
// from the browser, setAuth makes every query/mutation run as that user.
export function getConvexClient(token?: string): ConvexHttpClient {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Set CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) for the API");
  }
  const client = new ConvexHttpClient(url);
  if (token) client.setAuth(token);
  return client;
}

export const convexClient = getConvexClient;