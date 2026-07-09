import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";

// All non-archived categories for the current user, with their template.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = categories.filter((c) => !c.archived);
    return Promise.all(
      active.map(async (c) => ({
        ...c,
        template: c.templateId ? await ctx.db.get(c.templateId) : null,
      })),
    );
  },
});

export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const category = await ctx.db.get(id);
    if (!category || category.userId !== userId || category.archived) return null;
    return {
      ...category,
      template: category.templateId ? await ctx.db.get(category.templateId) : null,
    };
  },
});

// Creates a template + category together (the form builder saves both).
export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    gradient: v.optional(v.string()),
    icon: v.optional(v.string()),
    formStructure: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const templateId = await ctx.db.insert("templates", {
      userId,
      name: args.name,
      formStructure: args.formStructure,
    });
    return await ctx.db.insert("categories", {
      userId,
      templateId,
      name: args.name,
      color: args.color,
      gradient: args.gradient,
      icon: args.icon,
    });
  },
});


export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    color: v.string(),
    gradient: v.optional(v.string()),
    icon: v.optional(v.string()),
    formStructure: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const category = await ctx.db.get(args.id);
    if (!category || category.userId !== userId || category.archived) {
      throw new Error("Category not found");
    }

    let templateId = category.templateId;
    if (templateId) {
      const template = await ctx.db.get(templateId);
      if (!template || template.userId !== userId) {
        throw new Error("Template not found");
      }
      await ctx.db.patch(templateId, {
        name: args.name,
        formStructure: args.formStructure,
      });
    } else {
      templateId = await ctx.db.insert("templates", {
        userId,
        name: args.name,
        formStructure: args.formStructure,
      });
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      color: args.color,
      gradient: args.gradient,
      icon: args.icon,
      templateId,
    });
    return args.id;
  },
});
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const category = await ctx.db.get(id);
    if (!category || category.userId !== userId) throw new Error("Not found");
    // Soft delete to preserve ideas that reference it.
    await ctx.db.patch(id, { archived: true, archivedAt: Date.now() });
  },
});
