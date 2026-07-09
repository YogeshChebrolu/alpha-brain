import { Hono } from "hono";
import { makeFunctionReference } from "convex/server";
import { z } from "zod";
import { Agent, type ChatMessage } from "@alpha-brain/agent";
import { getConvexClient } from "../lib/convex";
import {
  answerCallbackQuery,
  chunkTelegramText,
  decryptBotToken,
  deleteWebhook,
  encryptBotToken,
  getMe,
  randomTelegramSecret,
  sendMessage,
  setWebhook,
  tokenHint,
} from "../lib/telegram";

const createConnection = makeFunctionReference<"mutation">("telegram:createConnection");
const getOwnedConnection = makeFunctionReference<"query">("telegram:getOwnedConnection");
const markConnectionStatus = makeFunctionReference<"mutation">("telegram:markConnectionStatus");
const getConnectionForWebhook = makeFunctionReference<"query">("telegram:getConnectionForWebhook");
const resolveIncomingMessage = makeFunctionReference<"mutation">("telegram:resolveIncomingMessage");
const resolveCallbackDecision = makeFunctionReference<"mutation">("telegram:resolveCallbackDecision");
const listMessagesForTelegram = makeFunctionReference<"query">("telegram:listMessagesForTelegram");
const addAssistantMessageForTelegram = makeFunctionReference<"mutation">("telegram:addAssistantMessageForTelegram");

const connectSchema = z.object({ botToken: z.string().min(20) });
const INACTIVITY_MS = Number(process.env.TELEGRAM_CONVERSATION_INACTIVITY_MS ?? 60 * 60 * 1000);
const DECISION_TTL_MS = Number(process.env.TELEGRAM_CONVERSATION_DECISION_TTL_MS ?? 10 * 60 * 1000);

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: { id: number | string; type?: string };
  from?: TelegramFrom;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramFrom;
  data?: string;
  message?: { message_id: number; chat: { id: number | string; type?: string } };
}

interface TelegramFrom {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface WebhookConnection {
  _id: string;
  encryptedToken: string;
  botUsername: string;
}

interface ProcessResult {
  kind: "ignored" | "linked" | "unlinked" | "askDecision" | "process";
  message?: string;
  shortId?: string;
  conversationId?: string;
  notice?: string;
}

function publicApiBaseUrl() {
  return process.env.API_PUBLIC_URL?.replace(/\/$/, "");
}

function authToken(header?: string) {
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

function startUrl(botUsername: string, nonce: string) {
  return `https://t.me/${botUsername}?start=${nonce}`;
}

function friendlyAgentError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("telegram agent error:", message);
  return "I hit a snag while thinking through that. Try again in a moment.";
}

function asChatMessages(messages: Array<{ role: "user" | "assistant"; content: string }>): ChatMessage[] {
  return messages
    .filter((message) => message.content.trim())
    .map((message) => ({ role: message.role, content: message.content }));
}

async function sendLongReply(botToken: string, chatId: string, text: string) {
  for (const chunk of chunkTelegramText(text)) {
    await sendMessage(botToken, chatId, chunk);
  }
}

async function processConversationReply(args: {
  connectionId: string;
  webhookSecret: string;
  botToken: string;
  chatId: string;
  conversationId: string;
  notice?: string;
}) {
  const convex = getConvexClient();
  if (args.notice) await sendMessage(args.botToken, args.chatId, args.notice);

  try {
    const storedMessages = (await convex.query(listMessagesForTelegram, {
      connectionId: args.connectionId,
      webhookSecret: args.webhookSecret,
      conversationId: args.conversationId,
    })) as Array<{ role: "user" | "assistant"; content: string }>;

    const agent = new Agent({
      system:
        "You are Alpha Brain inside Telegram. Be warm, candid, concise, and useful. " +
        "You can discuss ideas, clarify next actions, and help the user think. " +
        "This Telegram MVP cannot call app tools yet, so do not claim you saved categories, ideas, or articles unless the user explicitly asks you to remember it in this chat.",
    });
    const reply = await agent.generate(asChatMessages(storedMessages));
    await convex.mutation(addAssistantMessageForTelegram, {
      connectionId: args.connectionId,
      webhookSecret: args.webhookSecret,
      conversationId: args.conversationId,
      content: reply,
    });
    await sendLongReply(args.botToken, args.chatId, reply);
  } catch (err) {
    await sendMessage(args.botToken, args.chatId, friendlyAgentError(err));
  }
}

export const telegram = new Hono();

telegram.post("/bots/connect", async (c) => {
  const token = authToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Missing Authorization bearer token" }, 401);

  let body: z.infer<typeof connectSchema>;
  try {
    body = connectSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: "Provide a valid botToken" }, 400);
  }

  const botToken = body.botToken.trim();
  let bot;
  try {
    bot = await getMe(botToken);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Telegram rejected that bot token" }, 400);
  }

  if (!bot.is_bot || !bot.username) {
    return c.json({ error: "That token did not resolve to a Telegram bot with a username" }, 400);
  }

  const convex = getConvexClient(token);
  const webhookSecret = randomTelegramSecret();
  const connectNonce = randomTelegramSecret().slice(0, 32);
  let encryptedToken: string;
  try {
    encryptedToken = encryptBotToken(botToken);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not encrypt bot token" }, 500);
  }

  const connectionId = (await convex.mutation(createConnection, {
    botId: String(bot.id),
    botUsername: bot.username,
    botFirstName: bot.first_name,
    encryptedToken,
    tokenHint: tokenHint(botToken),
    webhookSecret,
    connectNonce,
  })) as string;

  const baseUrl = publicApiBaseUrl();
  const webhookUrl = baseUrl ? `${baseUrl}/api/telegram/webhook/${connectionId}` : undefined;

  if (!webhookUrl) {
    await convex.mutation(markConnectionStatus, {
      connectionId,
      status: "pending",
      lastError: "Set API_PUBLIC_URL in apps/api/.env so Telegram can reach the webhook.",
    });
    return c.json({
      connectionId,
      botUsername: bot.username,
      status: "pending",
      startUrl: startUrl(bot.username, connectNonce),
      message: "Bot token saved. Set API_PUBLIC_URL, then reconnect to configure the Telegram webhook.",
    });
  }

  try {
    await setWebhook(botToken, webhookUrl, webhookSecret);
    await convex.mutation(markConnectionStatus, { connectionId, status: "active", webhookUrl });
  } catch (err) {
    await convex.mutation(markConnectionStatus, {
      connectionId,
      status: "broken",
      webhookUrl,
      lastError: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: err instanceof Error ? err.message : "Could not configure Telegram webhook" }, 502);
  }

  return c.json({
    connectionId,
    botUsername: bot.username,
    status: "active",
    webhookUrl,
    startUrl: startUrl(bot.username, connectNonce),
  });
});

telegram.post("/bots/:connectionId/disconnect", async (c) => {
  const token = authToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Missing Authorization bearer token" }, 401);

  const connectionId = c.req.param("connectionId");
  const convex = getConvexClient(token);
  const connection = (await convex.query(getOwnedConnection, { connectionId })) as
    | { encryptedToken: string }
    | null;
  if (!connection) return c.json({ error: "Telegram connection not found" }, 404);

  try {
    await deleteWebhook(decryptBotToken(connection.encryptedToken));
  } catch (err) {
    console.error("telegram deleteWebhook failed:", err);
  }

  await convex.mutation(markConnectionStatus, { connectionId, status: "disconnected" });
  return c.json({ ok: true });
});

telegram.post("/webhook/:connectionId", async (c) => {
  const connectionId = c.req.param("connectionId");
  const webhookSecret = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (!webhookSecret) return c.json({ ok: false }, 401);

  let update: TelegramUpdate;
  try {
    update = await c.req.json();
  } catch {
    return c.json({ ok: false }, 400);
  }

  const convex = getConvexClient();
  let connection: WebhookConnection;
  let botToken: string;
  try {
    connection = (await convex.query(getConnectionForWebhook, { connectionId, webhookSecret })) as WebhookConnection;
    botToken = decryptBotToken(connection.encryptedToken);
  } catch (err) {
    console.error("telegram webhook auth failed:", err);
    return c.json({ ok: false }, 401);
  }

  if (update.callback_query) {
    const callback = update.callback_query;
    await answerCallbackQuery(botToken, callback.id).catch((err) => console.error("answerCallbackQuery failed:", err));

    const chatId = callback.message?.chat.id;
    const data = callback.data ?? "";
    const match = data.match(/^conv_(continue|new):([A-Za-z0-9_-]+)$/);
    if (!chatId || !match) {
      await sendMessage(botToken, String(chatId ?? callback.from.id), "I could not read that choice, so send the message again and I will start fresh.");
      return c.json({ ok: true });
    }

    const result = (await convex.mutation(resolveCallbackDecision, {
      connectionId,
      webhookSecret,
      updateId: String(update.update_id),
      telegramChatId: String(chatId),
      action: match[1] === "continue" ? "continue" : "new",
      shortId: match[2],
    })) as ProcessResult;

    if (result.kind === "process" && result.conversationId) {
      await processConversationReply({
        connectionId,
        webhookSecret,
        botToken,
        chatId: String(chatId),
        conversationId: result.conversationId,
        notice: result.notice,
      });
    }
    return c.json({ ok: true });
  }

  const message = update.message;
  if (!message?.text) return c.json({ ok: true });

  const chatId = String(message.chat.id);
  const from = message.from;
  const result = (await convex.mutation(resolveIncomingMessage, {
    connectionId,
    webhookSecret,
    updateId: String(update.update_id),
    telegramChatId: chatId,
    telegramUserId: String(from?.id ?? message.chat.id),
    username: from?.username,
    firstName: from?.first_name,
    lastName: from?.last_name,
    text: message.text,
    inactivityMs: INACTIVITY_MS,
    decisionTtlMs: DECISION_TTL_MS,
  })) as ProcessResult;

  if (result.kind === "linked" || result.kind === "unlinked") {
    await sendMessage(botToken, chatId, result.message ?? "Done.");
    return c.json({ ok: true });
  }

  if (result.kind === "askDecision" && result.shortId) {
    await sendMessage(botToken, chatId, "Looks like we paused this thread. Continue here or start fresh?", {
      inline_keyboard: [
        [
          { text: "Continue Conversation", callback_data: `conv_continue:${result.shortId}` },
          { text: "New Conversation", callback_data: `conv_new:${result.shortId}` },
        ],
      ],
    });
    return c.json({ ok: true });
  }

  if (result.kind === "process" && result.conversationId) {
    await processConversationReply({
      connectionId,
      webhookSecret,
      botToken,
      chatId,
      conversationId: result.conversationId,
      notice: result.notice,
    });
  }

  return c.json({ ok: true });
});