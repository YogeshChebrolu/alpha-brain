import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("articles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    bannerImageUrl: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    ),
    readingTimeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("articles", {
      userId,
      ...args,
      status: args.status ?? "draft",
      publishedAt: args.status === "published" ? Date.now() : undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("articles"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    bannerImageUrl: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    ),
    readingTimeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const article = await ctx.db.get(id);
    if (!article || article.userId !== userId) throw new Error("Not found");
    if (patch.status === "published" && !article.publishedAt) {
      await ctx.db.patch(id, { ...patch, publishedAt: Date.now() });
    } else {
      await ctx.db.patch(id, patch);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const article = await ctx.db.get(id);
    if (!article || article.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
