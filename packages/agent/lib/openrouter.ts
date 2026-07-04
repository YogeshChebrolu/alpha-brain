import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";

// -----------------------------------------------------------------------------
// OpenRouter client factory
//
// OpenRouter (https://openrouter.ai) is a single API gateway in front of
// hundreds of models. One API key, swap models by id. Plugs straight into the
// Vercel AI SDK (`ai`).
// -----------------------------------------------------------------------------

/** The free Llama 3.2 3B Instruct model — good default for local/dev. */
export const DEFAULT_MODEL = "meta-llama/llama-3.2-3b-instruct:free";

let cached: OpenRouterProvider | null = null;

/**
 * Create (or reuse) an OpenRouter provider instance.
 *
 * Reads `OPENROUTER_API_KEY` from the environment by default. Pass an explicit
 * key to override (e.g. per-request keys, tests).
 */
export function createOpenRouterClient(
  apiKey: string | undefined = process.env.OPENROUTER_API_KEY,
): OpenRouterProvider {
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to apps/api/.env (get a key at https://openrouter.ai/keys).",
    );
  }
  // Cache the default-keyed client; build a fresh one for custom keys.
  if (apiKey === process.env.OPENROUTER_API_KEY && cached) {
    return cached;
  }
  const client = createOpenRouter({ apiKey });
  if (apiKey === process.env.OPENROUTER_API_KEY) {
    cached = client;
  }
  return client;
}
