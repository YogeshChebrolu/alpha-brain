import { ConvexHttpClient } from "convex/browser";

// Server-to-server Convex client for Hono routes (e.g. reading data to feed the
// agent, or a webhook writing a mutation). Not used yet — ready for when routes
// need Convex.
export function convexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Set CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) for the API");
  }
  return new ConvexHttpClient(url);
}
