import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Shared shape for a single form field config (see types/form-element.types.ts).
// Used by templates.formStructure.
const formElement = v.object({
  id: v.string(),
  type: v.union(
    v.literal("text"),
    v.literal("textarea"),
    v.literal("markdown"),
    v.literal("select"),
    v.literal("stock_graph"),
    v.literal("file_upload"),
    v.literal("checkbox"),
    v.literal("date"),
    v.literal("due_date"),
    v.literal("actions"),
    v.literal("link"),
  ),
  label: v.string(),
  placeholder: v.optional(v.string()),
  required: v.optional(v.boolean()),
  options: v.optional(v.array(v.string())),
  validation: v.optional(
    v.object({
      min: v.optional(v.number()),
      max: v.optional(v.number()),
      pattern: v.optional(v.string()),
    }),
  ),
});

export default defineSchema({
  // Convex Auth provides the `users` table and related auth tables.
  ...authTables,

  // Reusable form blueprints (system or user-owned) driving category/idea forms.
  templates: defineTable({
    userId: v.optional(v.id("users")), // system templates have no owner
    name: v.string(),
    formStructure: v.array(formElement),
    isSystem: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  // Groupings for ideas; each category may bind to a template for its form.
  categories: defineTable({
    userId: v.id("users"),
    templateId: v.optional(v.id("templates")),
    name: v.string(),
    color: v.string(),
    gradient: v.optional(v.string()),
    icon: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Core user content; content_json holds dynamic per-template field answers.
  ideas: defineTable({
    userId: v.id("users"),
    categoryId: v.optional(v.id("categories")),
    parentId: v.optional(v.id("ideas")), // self-reference for sub-ideas
    title: v.string(),
    // TODO: tighten - dynamic answers keyed by form field id, shape varies per template.
    contentJson: v.optional(v.any()),
    dueDate: v.optional(v.number()),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["categoryId"]),

  // Todo-style items attached to an idea.
  actions: defineTable({
    userId: v.id("users"),
    ideaId: v.id("ideas"),
    text: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
      ),
    ),
    dueTime: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_idea", ["ideaId"])
    .index("by_status", ["status"]),

  // Long-form blog articles (TipTap JSON stored as string in `content`).
  articles: defineTable({
    userId: v.id("users"),
    sourceIdeaId: v.optional(v.id("ideas")),
    linkedArticleIds: v.optional(v.array(v.id("articles"))),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    references: v.optional(
      v.array(
        v.object({
          title: v.string(),
          url: v.optional(v.string()),
          note: v.optional(v.string()),
        }),
      ),
    ),
    bannerImageUrl: v.optional(v.string()),
    bannerStoragePath: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived"),
      ),
    ),
    publishedAt: v.optional(v.number()),
    readingTimeMinutes: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_sourceIdea", ["sourceIdeaId"])
    .index("by_shareToken", ["shareToken"]),

  // User-owned assistant threads. Hono streams replies, Convex persists them.
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
    archived: v.optional(v.boolean()),
    profile: v.optional(v.any()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolEvents: v.optional(v.array(v.any())),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  // Curated inspiration cards; may be system-seeded (userId absent) or user-owned.
  inspirations: defineTable({
    userId: v.optional(v.id("users")), // system inspirations have no owner
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    gradient: v.optional(v.string()),
    articleId: v.optional(v.id("articles")),
    bannerImageUrl: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isSystem: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"])
    .index("by_article", ["articleId"]),

  // Global stock-price cache keyed by ticker (not user-scoped).
  // historicalPrices is a { "YYYY-MM-DD": number } map.
  daily_stock_prices: defineTable({
    ticker: v.string(),
    closePrice: v.optional(v.number()),
    changePct: v.optional(v.number()),
    // TODO: tighten - date->price map, e.g. v.record(v.string(), v.number()).
    historicalPrices: v.optional(v.any()),
    lastSyncedAt: v.optional(v.number()),
  }).index("by_ticker", ["ticker"]),
});