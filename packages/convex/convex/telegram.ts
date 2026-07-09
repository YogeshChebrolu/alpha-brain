import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireUser } from "./helpers";

const DEFAULT_DECISION_TTL_MS = 10 * 60 * 1000;

function shortId() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

async function requireConnectionBySecret(
  ctx: QueryCtx | MutationCtx,
  connectionId: Id<"telegramBotConnections">,
  webhookSecret: string,
) {
  const connection = await ctx.db.get(connectionId);
  if (!connection || connection.webhookSecret !== webhookSecret || connection.status === "disconnected") {
    throw new Error("Telegram connection not found");
  }
  return connection;
}

async function recordUpdateOnce(
  ctx: MutationCtx,
  botConnectionId: Id<"telegramBotConnections">,
  updateId: string,
) {
  const existing = await ctx.db
    .query("telegramWebhookUpdates")
    .withIndex("by_connection_update", (q) =>
      q.eq("botConnectionId", botConnectionId).eq("updateId", updateId),
    )
    .unique();
  if (existing) return false;
  await ctx.db.insert("telegramWebhookUpdates", {
    botConnectionId,
    updateId,
    receivedAt: Date.now(),
  });
  return true;
}

async function getChatLink(
  ctx: QueryCtx | MutationCtx,
  botConnectionId: Id<"telegramBotConnections">,
  telegramChatId: string,
) {
  return await ctx.db
    .query("telegramChatLinks")
    .withIndex("by_connection_chat", (q) =>
      q.eq("botConnectionId", botConnectionId).eq("telegramChatId", telegramChatId),
    )
    .unique();
}

async function createConversationForUser(ctx: MutationCtx, userId: Id<"users">, title: string) {
  return await ctx.db.insert("conversations", {
    userId,
    title: title.trim().replace(/\s+/g, " ").slice(0, 64) || "Telegram chat",
    lastMessageAt: Date.now(),
    profile: { source: "telegram" },
  });
}

async function addUserMessage(
  ctx: MutationCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
  content: string,
) {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation || conversation.userId !== userId || conversation.archived) {
    throw new Error("Conversation not found");
  }
  await ctx.db.insert("messages", {
    userId,
    conversationId,
    role: "user",
    content,
  });
  const patch: Partial<{ title: string; lastMessageAt: number }> = { lastMessageAt: Date.now() };
  if (conversation.title === "New chat" || conversation.title === "Telegram chat") {
    const title = content.trim().replace(/\s+/g, " ").slice(0, 64);
    if (title) patch.title = title;
  }
  await ctx.db.patch(conversationId, patch);
}

export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const connections = await ctx.db
      .query("telegramBotConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return connections
      .filter((connection) => connection.status !== "disconnected")
      .sort((a, b) => b.connectedAt - a.connectedAt)
      .map((connection) => ({
        _id: connection._id,
        botId: connection.botId,
        botUsername: connection.botUsername,
        botFirstName: connection.botFirstName,
        tokenHint: connection.tokenHint,
        status: connection.status,
        webhookUrl: connection.webhookUrl,
        lastError: connection.lastError,
        connectedAt: connection.connectedAt,
        disconnectedAt: connection.disconnectedAt,
        lastWebhookUpdateAt: connection.lastWebhookUpdateAt,
      }));
  },
});

export const createConnection = mutation({
  args: {
    botId: v.string(),
    botUsername: v.string(),
    botFirstName: v.optional(v.string()),
    encryptedToken: v.string(),
    tokenHint: v.string(),
    webhookSecret: v.string(),
    connectNonce: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("telegramBotConnections", {
      userId,
      botId: args.botId,
      botUsername: args.botUsername,
      botFirstName: args.botFirstName,
      encryptedToken: args.encryptedToken,
      tokenHint: args.tokenHint,
      webhookSecret: args.webhookSecret,
      connectNonce: args.connectNonce,
      status: "pending",
      connectedAt: Date.now(),
    });
  },
});

export const getOwnedConnection = query({
  args: { connectionId: v.id("telegramBotConnections") },
  handler: async (ctx, { connectionId }) => {
    const userId = await requireUser(ctx);
    const connection = await ctx.db.get(connectionId);
    if (!connection || connection.userId !== userId || connection.status === "disconnected") return null;
    return {
      _id: connection._id,
      botId: connection.botId,
      botUsername: connection.botUsername,
      botFirstName: connection.botFirstName,
      encryptedToken: connection.encryptedToken,
      tokenHint: connection.tokenHint,
      status: connection.status,
      webhookUrl: connection.webhookUrl,
      lastError: connection.lastError,
      connectedAt: connection.connectedAt,
    };
  },
});

export const markConnectionStatus = mutation({
  args: {
    connectionId: v.id("telegramBotConnections"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("broken"), v.literal("disconnected")),
    webhookUrl: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) throw new Error("Telegram connection not found");
    await ctx.db.patch(args.connectionId, {
      status: args.status,
      webhookUrl: args.webhookUrl,
      lastError: args.lastError,
      ...(args.status === "disconnected" ? { disconnectedAt: Date.now() } : {}),
    });
  },
});

export const getConnectionForWebhook = query({
  args: { connectionId: v.id("telegramBotConnections"), webhookSecret: v.string() },
  handler: async (ctx, { connectionId, webhookSecret }) => {
    const connection = await requireConnectionBySecret(ctx, connectionId, webhookSecret);
    return {
      _id: connection._id,
      botId: connection.botId,
      botUsername: connection.botUsername,
      encryptedToken: connection.encryptedToken,
      status: connection.status,
    };
  },
});

export const resolveIncomingMessage = mutation({
  args: {
    connectionId: v.id("telegramBotConnections"),
    webhookSecret: v.string(),
    updateId: v.string(),
    telegramChatId: v.string(),
    telegramUserId: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    text: v.string(),
    inactivityMs: v.number(),
    decisionTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const connection = await requireConnectionBySecret(ctx, args.connectionId, args.webhookSecret);
    const isNewUpdate = await recordUpdateOnce(ctx, connection._id, args.updateId);
    if (!isNewUpdate) return { kind: "ignored" as const };

    await ctx.db.patch(connection._id, { lastWebhookUpdateAt: Date.now() });

    const now = Date.now();
    const text = args.text.trim();
    let link = await getChatLink(ctx, connection._id, args.telegramChatId);

    if (!link) {
      const [, payload = ""] = text.match(/^\/start(?:\s+(.+))?$/i) ?? [];
      if (payload && payload === connection.connectNonce) {
        const linkId = await ctx.db.insert("telegramChatLinks", {
          userId: connection.userId,
          botConnectionId: connection._id,
          telegramUserId: args.telegramUserId,
          telegramChatId: args.telegramChatId,
          username: args.username,
          firstName: args.firstName,
          lastName: args.lastName,
          linkedAt: now,
        });
        link = await ctx.db.get(linkId);
        return {
          kind: "linked" as const,
          message: "Connected. Send me an idea, question, or rough note and I'll keep it with your Alpha Brain workspace.",
        };
      }
      return {
        kind: "unlinked" as const,
        message: `This bot is not linked to Alpha Brain yet. Open https://t.me/${connection.botUsername}?start=${connection.connectNonce} to connect it.`,
      };
    }

    if (link.pendingDecisionId) {
      const pending = await ctx.db.get(link.pendingDecisionId);
      if (pending && pending.status === "pending" && pending.expiresAt > now) {
        await ctx.db.patch(pending._id, { status: "expired" });
      }
      const conversationId = await createConversationForUser(ctx, connection.userId, text || "Telegram chat");
      await addUserMessage(ctx, connection.userId, conversationId, text);
      await ctx.db.patch(link._id, {
        activeConversationId: conversationId,
        lastMessageAt: now,
        pendingDecisionId: undefined,
      });
      return { kind: "process" as const, conversationId, notice: "Started a fresh conversation." };
    }

    const lastMessageAt = link.lastMessageAt ?? link.linkedAt;
    const isIdle = Boolean(link.activeConversationId) && now - lastMessageAt > args.inactivityMs;
    if (isIdle && link.activeConversationId) {
      const decisionId = await ctx.db.insert("telegramConversationDecisions", {
        userId: connection.userId,
        botConnectionId: connection._id,
        telegramChatId: args.telegramChatId,
        previousConversationId: link.activeConversationId,
        pendingMessageText: text,
        shortId: shortId(),
        status: "pending",
        expiresAt: now + (args.decisionTtlMs ?? DEFAULT_DECISION_TTL_MS),
      });
      const decision = await ctx.db.get(decisionId);
      await ctx.db.patch(link._id, { pendingDecisionId: decisionId });
      return {
        kind: "askDecision" as const,
        shortId: decision?.shortId ?? "missing",
        expiresAt: decision?.expiresAt ?? now,
      };
    }

    const conversationId = link.activeConversationId ?? (await createConversationForUser(ctx, connection.userId, text || "Telegram chat"));
    await addUserMessage(ctx, connection.userId, conversationId, text);
    await ctx.db.patch(link._id, {
      activeConversationId: conversationId,
      lastMessageAt: now,
    });
    return { kind: "process" as const, conversationId };
  },
});

export const resolveCallbackDecision = mutation({
  args: {
    connectionId: v.id("telegramBotConnections"),
    webhookSecret: v.string(),
    updateId: v.string(),
    telegramChatId: v.string(),
    shortId: v.string(),
    action: v.union(v.literal("continue"), v.literal("new")),
  },
  handler: async (ctx, args) => {
    const connection = await requireConnectionBySecret(ctx, args.connectionId, args.webhookSecret);
    const isNewUpdate = await recordUpdateOnce(ctx, connection._id, args.updateId);
    if (!isNewUpdate) return { kind: "ignored" as const };

    const link = await getChatLink(ctx, connection._id, args.telegramChatId);
    if (!link) return { kind: "unlinked" as const, message: "This chat is not linked yet." };

    const decision = await ctx.db
      .query("telegramConversationDecisions")
      .withIndex("by_connection_short", (q) =>
        q.eq("botConnectionId", connection._id).eq("shortId", args.shortId),
      )
      .unique();

    if (!decision || decision.telegramChatId !== args.telegramChatId || decision.status !== "pending") {
      return { kind: "ignored" as const };
    }

    const now = Date.now();
    const expired = decision.expiresAt <= now;
    const conversationId =
      !expired && args.action === "continue"
        ? decision.previousConversationId
        : await createConversationForUser(ctx, connection.userId, decision.pendingMessageText || "Telegram chat");

    await addUserMessage(ctx, connection.userId, conversationId, decision.pendingMessageText);
    await ctx.db.patch(decision._id, {
      status: expired ? "expired" : "resolved",
      resolvedConversationId: conversationId,
    });
    await ctx.db.patch(link._id, {
      activeConversationId: conversationId,
      lastMessageAt: now,
      pendingDecisionId: undefined,
    });
    await ctx.db.patch(connection._id, { lastWebhookUpdateAt: now });

    return {
      kind: "process" as const,
      conversationId,
      notice: expired ? "That choice expired, so I started a fresh conversation." : undefined,
    };
  },
});

export const listMessagesForTelegram = query({
  args: {
    connectionId: v.id("telegramBotConnections"),
    webhookSecret: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const connection = await requireConnectionBySecret(ctx, args.connectionId, args.webhookSecret);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== connection.userId || conversation.archived) {
      throw new Error("Conversation not found");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return messages
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((message) => ({ role: message.role, content: message.content }));
  },
});

export const addAssistantMessageForTelegram = mutation({
  args: {
    connectionId: v.id("telegramBotConnections"),
    webhookSecret: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await requireConnectionBySecret(ctx, args.connectionId, args.webhookSecret);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== connection.userId || conversation.archived) {
      throw new Error("Conversation not found");
    }
    await ctx.db.insert("messages", {
      userId: connection.userId,
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
    });
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
  },
});