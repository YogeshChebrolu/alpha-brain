import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./helpers";

// Loads a category with its template joined in (the UI reads
// category.template.formStructure to render/validate the dynamic form).
async function categoryWithTemplate(
  ctx: QueryCtx,
  categoryId: Id<"categories"> | undefined,
) {
  if (!categoryId) return null;
  const category = await ctx.db.get(categoryId);
  if (!category) return null;
  const template = category.templateId
    ? await ctx.db.get(category.templateId)
    : null;
  return { ...category, template };
}

// Non-archived ideas for the user, optionally filtered by category. Each idea
// is returned with its category joined in (name/color/gradient) for the grid.
export const list = query({
  args: { categoryId: v.optional(v.id("categories")) },
  handler: async (ctx, { categoryId }) => {
    const userId = await requireUser(ctx);
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const filtered = ideas.filter(
      (i) => !i.archived && (!categoryId || i.categoryId === categoryId),
    );
    return Promise.all(
      filtered.map(async (i) => ({
        ...i,
        category: await categoryWithTemplate(ctx, i.categoryId),
      })),
    );
  },
});

export const get = query({
  args: { id: v.id("ideas") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const idea = await ctx.db.get(id);
    if (!idea) return null;
    const category = await categoryWithTemplate(ctx, idea.categoryId);
    const actions = await ctx.db
      .query("actions")
      .withIndex("by_idea", (q) => q.eq("ideaId", id))
      .collect();
    return { ...idea, category, actions };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return ideas.filter((i) => !i.archived).length;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    categoryId: v.optional(v.id("categories")),
    contentJson: v.optional(v.any()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("ideas", {
      userId,
      title: args.title || "Untitled Idea",
      categoryId: args.categoryId,
      contentJson: args.contentJson,
      dueDate: args.dueDate,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("ideas"),
    title: v.optional(v.string()),
    contentJson: v.optional(v.any()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const idea = await ctx.db.get(id);
    if (!idea || idea.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, patch);
  },
});

export const archive = mutation({
  args: { id: v.id("ideas") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const idea = await ctx.db.get(id);
    if (!idea || idea.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { archived: true, archivedAt: Date.now() });
  },
});
