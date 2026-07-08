import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireUser } from "./helpers";

async function requireOwnedConversation(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
) {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation || conversation.userId !== userId || conversation.archived) {
    throw new Error("Conversation not found");
  }
  return conversation;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return conversations
      .filter((c) => !c.archived)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUser(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== userId || conversation.archived) {
      return null;
    }
    return conversation;
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUser(ctx);
    await requireOwnedConversation(ctx, userId, conversationId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    return messages.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const create = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, { title }) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("conversations", {
      userId,
      title: title?.trim() || "New chat",
      lastMessageAt: Date.now(),
    });
  },
});

export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolEvents: v.optional(v.array(v.any())),
  },
  handler: async (ctx, { conversationId, role, content, toolEvents }) => {
    const userId = await requireUser(ctx);
    const conversation = await requireOwnedConversation(ctx, userId, conversationId);
    const messageId = await ctx.db.insert("messages", {
      userId,
      conversationId,
      role,
      content,
      ...(toolEvents ? { toolEvents } : {}),
    });

    const patch: Partial<{
      title: string;
      lastMessageAt: number;
    }> = { lastMessageAt: Date.now() };
    if (role === "user" && conversation.title === "New chat") {
      const title = content.trim().replace(/\s+/g, " ").slice(0, 64);
      if (title) patch.title = title;
    }
    await ctx.db.patch(conversationId, patch);
    return messageId;
  },
});

export const rename = mutation({
  args: { conversationId: v.id("conversations"), title: v.string() },
  handler: async (ctx, { conversationId, title }) => {
    const userId = await requireUser(ctx);
    await requireOwnedConversation(ctx, userId, conversationId);
    await ctx.db.patch(conversationId, {
      title: title.trim() || "Untitled chat",
    });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUser(ctx);
    await requireOwnedConversation(ctx, userId, conversationId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    await ctx.db.patch(conversationId, {
      archived: true,
      lastMessageAt: Date.now(),
    });
  },
});