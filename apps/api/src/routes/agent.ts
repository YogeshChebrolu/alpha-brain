import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { makeFunctionReference } from "convex/server";
import { Agent, type ChatMessage } from "@alpha-brain/agent";
import { getAgent } from "../lib/agent";
import { getConvexClient } from "../lib/convex";
import { createAlphaBrainTools } from "../lib/agent-tools";

// -----------------------------------------------------------------------------
// Agent chat - Hono owns streaming; Convex owns authenticated persistence.
//
// Preferred flow:
//   1. Browser creates/updates a Convex conversation and writes the user turn.
//   2. Browser POSTs { conversationId } with its Convex Auth JWT.
//   3. Hono reads the saved history as that user, streams the model reply, and
//      persists the assistant turn when the stream finishes.
//
// SSE protocol: delta | status | tool | error | done.
// Mounted at "/api/agent".
// -----------------------------------------------------------------------------

const getConversation = makeFunctionReference<"query">("conversations:get");
const listMessages = makeFunctionReference<"query">("conversations:listMessages");
const addMessage = makeFunctionReference<"mutation">("conversations:addMessage");

const TOOL_STATUS: Record<string, string> = {
  listCategories: "Looking at your current categories...",
  createCategory: "Creating that category and template...",
  listIdeas: "Reading your recent ideas...",
  addIdea: "Saving the idea and action deadlines...",
  listPreviousArticles: "Checking previous articles for references...",
  writeArticle: "Drafting and indexing the article...",
  webSearch: "Searching for research sources...",
  webFetch: "Reading the source...",
};

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

interface ToolEvent {
  id: string;
  createdAt: number;
  type: "tool-call" | "tool-result";
  toolName: string;
  input?: unknown;
  output?: unknown;
  summary: string;
}

function friendlyStreamError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const status = (err as { statusCode?: number } | null)?.statusCode;
  const lower = raw.toLowerCase();
  if (status === 402 || lower.includes("quota") || lower.includes("credit") || lower.includes("limit exceeded")) {
    return "The assistant hit its model usage limit for now. That's on our side; try again a little later.";
  }
  if (status === 429 || lower.includes("rate limit")) {
    return "The assistant is getting rate-limited. Give it a moment and try again.";
  }
  if (status === 401 || status === 403) {
    return "The assistant is temporarily unavailable because the model provider is not configured correctly.";
  }
  return "Something went wrong while talking to the assistant. Please try again.";
}

function summarizeToolCall(toolName: string): string {
  return TOOL_STATUS[toolName] ?? `Running ${toolName}...`;
}

function summarizeToolResult(toolName: string, output: unknown): string {
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (toolName === "createCategory") return `Created category ${String(record.name ?? "")}.`;
    if (toolName === "addIdea") return `Saved idea ${String(record.title ?? "")} with ${String(record.actionsCreated ?? 0)} action(s).`;
    if (toolName === "writeArticle") return `Created draft article ${String(record.title ?? "")}.`;
  }
  return `${toolName} finished.`;
}

function asChatMessages(history: StoredMessage[]): ChatMessage[] {
  return history
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content }));
}

export const agent = new Hono();

agent.post("/chat", async (c) => {
  let body: { conversationId?: string; messages?: ChatMessage[]; prompt?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body must be JSON" }, 400);
  }

  // Backwards-compatible raw prompt/message streaming for smoke tests and old clients.
  if (!body.conversationId) {
    const messages: ChatMessage[] =
      body.messages ?? (body.prompt ? [{ role: "user", content: body.prompt }] : []);
    if (messages.length === 0) return c.json({ error: "Provide `conversationId`, `messages`, or `prompt`" }, 400);

    return streamSSE(c, async (stream) => {
      try {
        const result = getAgent().stream(messages);
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") await stream.writeSSE({ event: "delta", data: part.text });
          else if (part.type === "error") await stream.writeSSE({ event: "error", data: friendlyStreamError(part.error) });
          else if (part.type === "abort") return;
        }
        await stream.writeSSE({ event: "done", data: "[DONE]" });
      } catch (err) {
        console.error("agent stream error:", err);
        await stream.writeSSE({ event: "error", data: friendlyStreamError(err) });
      }
    });
  }

  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) return c.json({ error: "Missing Authorization bearer token" }, 401);

  const convex = getConvexClient(token);
  const conversationId = body.conversationId;

  let history: StoredMessage[];
  try {
    const conversation = await convex.query(getConversation, { conversationId });
    if (!conversation) return c.json({ error: "Conversation not found" }, 404);
    history = (await convex.query(listMessages, { conversationId })) as StoredMessage[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("agent convex read error:", message);
    return c.json({ error: `Could not load conversation: ${message}` }, 502);
  }

  const messages = asChatMessages(history);
  if (messages.length === 0) return c.json({ error: "Conversation has no messages yet" }, 400);

  return streamSSE(c, async (stream) => {
    let assistant = "";
    const toolEvents: ToolEvent[] = [];
    let seq = 0;

    const pushToolEvent = async (event: Omit<ToolEvent, "id" | "createdAt">) => {
      const entry: ToolEvent = {
        id: `${Date.now()}-${seq++}`,
        createdAt: Date.now(),
        ...event,
      };
      toolEvents.push(entry);
      await stream.writeSSE({ event: "tool", data: JSON.stringify(entry) });
    };

    const fail = async (err: unknown) => {
      console.error("agent stream error:", err);
      await stream.writeSSE({ event: "error", data: friendlyStreamError(err) });
    };

    try {
      const alphaAgent = new Agent({ tools: createAlphaBrainTools(convex) });
      const result = alphaAgent.stream(messages);

      for await (const rawPart of result.fullStream) {
        const part = rawPart as Record<string, unknown> & { type: string };
        switch (part.type) {
          case "text-delta": {
            const text = typeof part.text === "string" ? part.text : "";
            assistant += text;
            await stream.writeSSE({ event: "delta", data: text });
            break;
          }
          case "tool-call": {
            const toolName = typeof part.toolName === "string" ? part.toolName : "unknown";
            await stream.writeSSE({ event: "status", data: summarizeToolCall(toolName) });
            await pushToolEvent({
              type: "tool-call",
              toolName,
              input: part.input,
              summary: summarizeToolCall(toolName),
            });
            break;
          }
          case "tool-result": {
            const toolName = typeof part.toolName === "string" ? part.toolName : "unknown";
            const output = "output" in part ? part.output : part.result;
            await pushToolEvent({
              type: "tool-result",
              toolName,
              output,
              summary: summarizeToolResult(toolName, output),
            });
            break;
          }
          case "error":
            await fail(part.error);
            return;
          case "abort":
            return;
        }
      }
    } catch (err) {
      await fail(err);
      return;
    }

    try {
      if (assistant.trim() || toolEvents.length > 0) {
        await convex.mutation(addMessage, {
          conversationId,
          role: "assistant",
          content: assistant,
          ...(toolEvents.length ? { toolEvents } : {}),
        });
      }
    } catch (err) {
      console.error("agent persist error:", err);
      await stream.writeSSE({ event: "error", data: "The reply streamed, but saving it failed." });
    }

    await stream.writeSSE({ event: "done", data: "[DONE]" });
  });
});