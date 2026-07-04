import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./helpers";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
);

// All actions for the user (kanban board + home sidebar), idea title joined in.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const actions = await ctx.db
      .query("actions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return Promise.all(
      actions.map(async (a) => {
        const idea = await ctx.db.get(a.ideaId);
        return { ...a, idea: idea ? { _id: idea._id, title: idea.title } : null };
      }),
    );
  },
});

export const create = mutation({
  args: {
    ideaId: v.id("ideas"),
    text: v.string(),
    status: v.optional(statusValidator),
    dueTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("actions", {
      userId,
      ideaId: args.ideaId,
      text: args.text,
      status: args.status ?? "pending",
      dueTime: args.dueTime,
    });
  },
});

// Kanban drag-to-move updates status here.
export const setStatus = mutation({
  args: { id: v.id("actions"), status: statusValidator },
  handler: async (ctx, { id, status }) => {
    const userId = await requireUser(ctx);
    const action = await ctx.db.get(id);
    if (!action || action.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { status });
  },
});

export const update = mutation({
  args: {
    id: v.id("actions"),
    text: v.optional(v.string()),
    dueTime: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const action = await ctx.db.get(id);
    if (!action || action.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("actions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const action = await ctx.db.get(id);
    if (!action || action.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
