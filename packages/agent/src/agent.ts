import {
  generateText,
  streamText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
} from "ai";
import { createOpenRouterClient, DEFAULT_MODEL } from "../lib/openrouter";

// -----------------------------------------------------------------------------
// Agent - a thin wrapper around the Vercel AI SDK, powered by OpenRouter.
//
// The package owns model choice, default persona, and generation primitives.
// Product routes inject request-scoped tools and persistence.
// -----------------------------------------------------------------------------

export type ChatMessage = ModelMessage;

export interface AgentConfig {
  /** OpenRouter API key. Defaults to `OPENROUTER_API_KEY` from the env. */
  apiKey?: string;
  /** OpenRouter model id. Defaults to a free Llama model. */
  model?: string;
  /** System prompt that defines the agent's persona and rules. */
  system?: string;
  /** Sampling temperature (0-1). */
  temperature?: number;
  /** Tools the model may call. Empty by default - add your own. */
  tools?: ToolSet;
}

const DEFAULT_SYSTEM =
  "You are Alpha Brain's idea companion: part meticulous librarian, part candid " +
  "friend, part creative editor. Be warm, playful, and constructively critical. " +
  "Help the user capture ideas, turn them into action deadlines, research them, " +
  "and draft article-ready notes with tags and references. When a tool can save " +
  "work to the app, use it after briefly confirming the shape in your own mind. " +
  "Do not pretend web research happened if the web tools return a setup message. " +
  "Never give individualized investment advice; add a short disclaimer when discussing markets.";

export class Agent {
  private readonly model: LanguageModel;
  private readonly system: string;
  private readonly temperature: number;
  private readonly tools: ToolSet;

  constructor(config: AgentConfig = {}) {
    const openrouter = createOpenRouterClient(config.apiKey);
    this.model = openrouter.chat(config.model ?? DEFAULT_MODEL);
    this.system = config.system ?? DEFAULT_SYSTEM;
    this.temperature = config.temperature ?? 0.7;
    this.tools = config.tools ?? {};
  }

  /**
   * Stream a response token-by-token. Returns the AI SDK stream result; the
   * caller decides how to deliver it (e.g. `result.fullStream` over SSE).
   */
  stream(messages: ChatMessage[]): StreamTextResult<ToolSet, never> {
    return streamText({
      model: this.model,
      system: this.system,
      temperature: this.temperature,
      tools: this.tools,
      stopWhen: stepCountIs(8),
      messages,
    });
  }

  /** Convenience for a one-shot, non-streaming completion. */
  async generate(messages: ChatMessage[]): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: this.system,
      temperature: this.temperature,
      tools: this.tools,
      stopWhen: stepCountIs(8),
      messages,
    });
    return text;
  }

  /** Shorthand: stream a reply to a single user prompt. */
  ask(prompt: string): StreamTextResult<ToolSet, never> {
    return this.stream([{ role: "user", content: prompt }]);
  }
}