import { Hono } from "hono";

// Liveness + a friendly root. Handy for uptime checks and "is it up?" curls.
export const meta = new Hono();

meta.get("/", (c) => c.json({ name: "alpha-brain-api", ok: true }));
meta.get("/health", (c) => c.json({ status: "healthy" }));
