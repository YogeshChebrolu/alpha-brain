// Public entrypoint for the Convex backend, consumed by apps/web and apps/api.
//
// `api` / `internal` and the data-model types are code-generated and DO NOT
// EXIST until you run codegen:
//
//     bun run dev        # `convex dev` — watches + regenerates
//     # or one-off:
//     bun run codegen
//
// Until then, TypeScript reports "./convex/_generated/*" as missing. Expected.
export { api, internal } from "./convex/_generated/api";
export type { Doc, Id } from "./convex/_generated/dataModel";
