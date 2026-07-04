import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { meta } from "./routes/meta";
import { agent } from "./routes/agent";

// -----------------------------------------------------------------------------
// alpha-brain — Hono API (runs on Bun)
//
// Division of labour:
//   • Convex owns data, reactive queries, mutations, auth, and simple external
//     fetches (e.g. stock sync runs in a Convex action).
//   • Hono  owns things Convex isn't the right tool for: STREAMING AI responses
//     and third-party WEBHOOKS (e.g. a future Telegram bot).
//
// This file stays thin: middleware + route mounting only. Routes live in
// ./routes/*, shared clients in ./lib/*.
// -----------------------------------------------------------------------------

const app = new Hono();

// --- Middleware --------------------------------------------------------------
const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use("*", logger());
app.use("*", cors({ origin: allowedOrigins, credentials: true }));

// --- Routes ------------------------------------------------------------------
app.route("/", meta); //           GET  /  ·  GET /health
app.route("/api/agent", agent); //  POST /api/agent/chat  (streaming AI)
// Future: app.route("/api/telegram", telegram)  ← webhook lives here

// --- Server ------------------------------------------------------------------
const port = Number(process.env.PORT ?? 8787);
console.log(`🔥 alpha-brain API listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
  // SSE streams can sit idle while the model thinks; the default 10s would kill
  // them. 255s is Bun's max.
  idleTimeout: 255,
};
