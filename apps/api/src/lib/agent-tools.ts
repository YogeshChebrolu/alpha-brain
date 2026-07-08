import { tool, type ToolSet } from "ai";
import { webSearch as exaWebSearch } from "@exalabs/ai-sdk";
import type { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { z } from "zod";

const createCategory = makeFunctionReference<"mutation">("categories:create");
const createIdea = makeFunctionReference<"mutation">("ideas:create");
const createAction = makeFunctionReference<"mutation">("actions:create");
const createArticle = makeFunctionReference<"mutation">("articles:create");
const listArticles = makeFunctionReference<"query">("articles:listMine");
const listCategories = makeFunctionReference<"query">("categories:list");
const listIdeas = makeFunctionReference<"query">("ideas:list");

function timestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `${base || "article"}-${Math.random().toString(36).slice(2, 8)}`;
}

function block(type: "paragraph" | "heading", text: string, level = 2) {
  return {
    type,
    ...(type === "heading" ? { props: { level } } : {}),
    content: text,
  };
}

function articleBlocks(input: {
  title: string;
  excerpt?: string;
  sections: Array<{ heading: string; body: string }>;
  tags?: string[];
  references?: Array<{ title: string; url?: string; note?: string }>;
}) {
  const blocks = [block("heading", input.title, 1)];
  if (input.excerpt) blocks.push(block("paragraph", input.excerpt));
  for (const section of input.sections) {
    blocks.push(block("heading", section.heading, 2));
    for (const paragraph of section.body.split(/\n{2,}/).map((p) => p.trim())) {
      if (paragraph) blocks.push(block("paragraph", paragraph));
    }
  }
  if (input.tags?.length) {
    blocks.push(block("heading", "Tags", 2));
    blocks.push(block("paragraph", input.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")));
  }
  if (input.references?.length) {
    blocks.push(block("heading", "References", 2));
    for (const ref of input.references) {
      const parts = [ref.title, ref.url, ref.note].filter(Boolean).join(" - ");
      blocks.push(block("paragraph", parts));
    }
  }
  return blocks;
}

async function fetchText(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs can be fetched");
  }
  const response = await fetch(parsed, {
    headers: { "User-Agent": "alpha-brain-agent/0.1" },
  });
  if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
  const text = await response.text();
  return text.replace(/\s+/g, " ").slice(0, 6000);
}

export function createAlphaBrainTools(convex: ConvexHttpClient): ToolSet {
  return {
    listCategories: tool({
      description: "List the user's current idea categories before choosing or creating one.",
      inputSchema: z.object({}),
      execute: async () => convex.query(listCategories, {}),
    }),

    createCategory: tool({
      description:
        "Create a user-owned idea category and its custom template using the same element types as the app template builder. Use when the user asks for a new capture workflow.",
      inputSchema: z.object({
        name: z.string(),
        color: z.string().default("#111827"),
        icon: z.string().optional(),
        fields: z
          .array(
            z.object({
              id: z.string(),
              type: z.enum([
                "text",
                "textarea",
                "markdown",
                "select",
                "stock_graph",
                "file_upload",
                "checkbox",
                "date",
                "due_date",
                "actions",
                "link",
              ]),
              label: z.string(),
              placeholder: z.string().optional(),
              required: z.boolean().optional(),
              options: z.array(z.string()).optional(),
            }),
          )
          .min(1),
      }),
      execute: async ({ name, color, icon, fields }) => {
        const categoryId = await convex.mutation(createCategory, {
          name,
          color,
          icon,
          formStructure: fields,
        });
        return { categoryId, name, fields: fields.length };
      },
    }),

    listIdeas: tool({
      description: "List the user's recent ideas, optionally filtered by category.",
      inputSchema: z.object({ categoryId: z.string().optional() }),
      execute: async ({ categoryId }) =>
        convex.query(listIdeas, categoryId ? { categoryId } : {}),
    }),

    addIdea: tool({
      description:
        "Create an idea, optional due date, and optional action items with deadlines.",
      inputSchema: z.object({
        title: z.string(),
        categoryId: z.string().optional(),
        dueDate: z.string().describe("ISO date or datetime").optional(),
        notes: z.string().optional(),
        actions: z
          .array(
            z.object({
              text: z.string(),
              dueTime: z.string().describe("ISO date or datetime").optional(),
            }),
          )
          .optional(),
      }),
      execute: async ({ title, categoryId, dueDate, notes, actions }) => {
        const ideaId = await convex.mutation(createIdea, {
          title,
          ...(categoryId ? { categoryId } : {}),
          ...(timestamp(dueDate) ? { dueDate: timestamp(dueDate) } : {}),
          ...(notes ? { contentJson: { notes } } : {}),
        });
        const actionIds = [];
        for (const action of actions ?? []) {
          actionIds.push(
            await convex.mutation(createAction, {
              ideaId,
              text: action.text,
              status: "pending",
              ...(timestamp(action.dueTime)
                ? { dueTime: timestamp(action.dueTime) }
                : {}),
            }),
          );
        }
        return { ideaId, title, actionsCreated: actionIds.length, actionIds };
      },
    }),

    listPreviousArticles: tool({
      description:
        "List the user's previous articles so a new draft can reference and cross-link them.",
      inputSchema: z.object({}),
      execute: async () => convex.query(listArticles, {}),
    }),

    writeArticle: tool({
      description:
        "Create a draft article from researched ideas, with tags, references, and links to previous articles.",
      inputSchema: z.object({
        title: z.string(),
        excerpt: z.string().optional(),
        sourceIdeaId: z.string().optional(),
        linkedArticleIds: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        sections: z
          .array(
            z.object({
              heading: z.string(),
              body: z.string(),
            }),
          )
          .min(1),
        references: z
          .array(
            z.object({
              title: z.string(),
              url: z.string().url().optional(),
              note: z.string().optional(),
            }),
          )
          .optional(),
      }),
      execute: async (input) => {
        const content = JSON.stringify(articleBlocks(input));
        const articleId = await convex.mutation(createArticle, {
          title: input.title,
          slug: slugify(input.title),
          content,
          excerpt: input.excerpt,
          sourceIdeaId: input.sourceIdeaId,
          linkedArticleIds: input.linkedArticleIds,
          tags: input.tags,
          references: input.references,
          status: "draft",
          readingTimeMinutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 220)),
        });
        return { articleId, title: input.title, status: "draft" };
      },
    }),

    webSearch: exaWebSearch() as unknown as ToolSet[string],

    webFetch: tool({
      description: "Fetch and lightly extract text from a specific URL for article research.",
      inputSchema: z.object({ url: z.string().url() }),
      execute: async ({ url }) => ({ url, text: await fetchText(url) }),
    }),
  };
}