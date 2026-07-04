import { Agent } from "@alpha-brain/agent";

// Lazily-instantiated singleton so we don't construct the model client per
// request. Reads ANTHROPIC_API_KEY from the env.
let instance: Agent | null = null;

export function getAgent(): Agent {
  if (!instance) instance = new Agent();
  return instance;
}
