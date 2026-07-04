// Public entrypoint for the @alpha-brain/agent package.
//
// The Agent class is transport-agnostic AI logic powered by the Vercel AI SDK
// over OpenRouter. Consumers run it server-side and expose it however they like
// — apps/api streams it to the browser over SSE.
export { Agent, type AgentConfig, type ChatMessage } from "./src/agent";
export { createOpenRouterClient, DEFAULT_MODEL } from "./lib/openrouter";
