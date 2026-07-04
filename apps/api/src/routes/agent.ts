import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ChatMessage } from "@alpha-brain/agent";
import { getAgent } from "../lib/agent";

// -----------------------------------------------------------------------------
// Agent — real LLM streaming, powered by the AI SDK over Claude.
//
// Streaming is exactly what Hono is best at: it relays the model's tokens to the
// browser as Server-Sent Events. The agent itself is transport-agnostic
// (@alpha-brain/agent); this route only owns delivery.
//
// SSE frames:
//   event: delta  data: <text chunk>   (zero or more)
//   event: error  data: <message>      (on failure)
//   event: done   data: [DONE]         (always last on success)
//
// Mounted at "/api/agent".
// -----------------------------------------------------------------------------
export const agent = new Hono();

agent.post("/chat", async (c) => {
  let body: { messages?: ChatMessage[]; prompt?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body must be JSON" }, 400);
  }

  // Accept either a full message history or a single prompt for convenience.
  const messages: ChatMessage[] =
    body.messages ??
    (body.prompt ? [{ role: "user", content: body.prompt }] : []);

  if (messages.length === 0) {
    return c.json({ error: "Provide `messages` or `prompt`" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const fail = async (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("agent stream error:", message);
      await stream.writeSSE({ event: "error", data: message });
    };

    try {
      // Consume `fullStream` (not `textStream`) so stream-time failures surface
      // as `error` parts instead of ending silently as a false success.
      const result = getAgent().stream(messages);
      for await (const part of result.fullStream) {
        switch (part.type) {
          case "text-delta":
            await stream.writeSSE({ event: "delta", data: part.text });
            break;
          case "error":
            return fail(part.error);
          case "abort":
            return;
        }
      }
      await stream.writeSSE({ event: "done", data: "[DONE]" });
    } catch (err) {
      await fail(err);
    }
  });
});
