const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export interface AgentToolEvent {
  id: string;
  createdAt: number;
  type: "tool-call" | "tool-result";
  toolName: string;
  input?: unknown;
  output?: unknown;
  summary: string;
}

export interface AgentStreamHandlers {
  signal?: AbortSignal;
  onDelta?: (chunk: string) => void;
  onStatus?: (message: string) => void;
  onTool?: (event: AgentToolEvent) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

function parseFrame(frame: string): { event: string; data: string } {
  let event = "message";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  return { event, data: data.join("\n") };
}

export async function streamAgentChat(
  payload: { conversationId: string; token: string },
  handlers: AgentStreamHandlers = {},
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.token}`,
    },
    body: JSON.stringify({ conversationId: payload.conversationId }),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    let message = `Agent request failed (${response.status})`;
    try {
      const json = (await response.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // Keep the status-based message.
    }
    handlers.onError?.(message);
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const raw of frames) {
        if (!raw.trim()) continue;
        const { event, data } = parseFrame(raw);
        if (event === "delta") handlers.onDelta?.(data);
        else if (event === "status") handlers.onStatus?.(data);
        else if (event === "tool") {
          try {
            handlers.onTool?.(JSON.parse(data) as AgentToolEvent);
          } catch {
            // Malformed tool telemetry should not break text streaming.
          }
        } else if (event === "error") handlers.onError?.(data);
        else if (event === "done") handlers.onDone?.();
      }
    }
  } finally {
    reader.releaseLock();
  }
}