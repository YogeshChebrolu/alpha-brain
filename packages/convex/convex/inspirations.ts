import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser } from "./helpers";

// Active inspiration cards for the home carousel, newest first, with their
// linked article (slug/title/banner) joined in. Returns [] when none exist so
// the carousel shows its empty "add your first article" state.
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("inspirations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const active = rows.filter((r) => r.isActive !== false).slice(0, 5);
    return Promise.all(
      active.map(async (r) => ({
        ...r,
        article: r.articleId ? await ctx.db.get(r.articleId) : null,
      })),
    );
  },
});

// The inspiration tied to a given article (for hydrating the editor toggle).
export const getForArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, { articleId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const insp = await ctx.db
      .query("inspirations")
      .withIndex("by_article", (q) => q.eq("articleId", articleId))
      .first();
    if (!insp || insp.userId !== userId) return null;
    return insp;
  },
});

const inspirationFields = {
  title: v.string(),
  description: v.string(),
  icon: v.optional(v.string()),
  gradient: v.optional(v.string()),
  bannerImageUrl: v.optional(v.string()),
  displayOrder: v.optional(v.number()),
  isActive: v.optional(v.boolean()),
};

export const create = mutation({
  args: { articleId: v.optional(v.id("articles")), ...inspirationFields },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("inspirations", {
      userId,
      ...args,
      icon: args.icon ?? "Brain",
      isActive: args.isActive ?? true,
    });
  },
});

export const update = mutation({
  args: { id: v.id("inspirations"), ...inspirationFields },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("inspirations") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

// Create-or-update the single inspiration tied to an article (the "Show as
// inspiration" toggle on the article editor).
export const upsertForArticle = mutation({
  args: { articleId: v.id("articles"), ...inspirationFields },
  handler: async (ctx, { articleId, ...fields }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("inspirations")
      .withIndex("by_article", (q) => q.eq("articleId", articleId))
      .first();
    if (existing) {
      if (existing.userId !== userId) throw new Error("Not found");
      await ctx.db.patch(existing._id, { ...fields, isActive: fields.isActive ?? true });
      return existing._id;
    }
    return await ctx.db.insert("inspirations", {
      userId,
      articleId,
      ...fields,
      icon: fields.icon ?? "Brain",
      isActive: fields.isActive ?? true,
    });
  },
});

// Remove the inspiration tied to an article (toggle turned off).
export const removeForArticle = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, { articleId }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("inspirations")
      .withIndex("by_article", (q) => q.eq("articleId", articleId))
      .first();
    if (existing && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }
  },
});
