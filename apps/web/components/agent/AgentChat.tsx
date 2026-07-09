"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api, type Id } from "@alpha-brain/convex";
import {
  Bot,
  Loader2,
  Menu,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { streamAgentChat, type AgentToolEvent } from "@/lib/agent-client";
import { Streamdown } from "streamdown";

type Phase = "idle" | "streaming" | "settling";

type Conversation = {
  _id: Id<"conversations">;
  title: string;
  lastMessageAt: number;
};

type Message = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  toolEvents?: AgentToolEvent[];
};

const SUGGESTIONS = [
  "Create a research template for startup ideas with market, moat, risks, and next actions.",
  "Save an idea about building a Telegram-connected personal knowledge bot and give me deadlines.",
  "Draft an article outline from my previous AI-product ideas and tag it for my knowledge base.",
];

export default function AgentChat() {
  const token = useAuthToken();
  const conversations = useQuery(api.conversations.list) as Conversation[] | undefined;
  const createConversation = useMutation(api.conversations.create);
  const addMessage = useMutation(api.conversations.addMessage);
  const removeConversation = useMutation(api.conversations.remove);

  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const activeConversationId = selectedConversationId ?? conversations?.[0]?._id ?? null;
  const activeConversation = conversations?.find((conversation) => conversation._id === activeConversationId);
  const messages = useQuery(
    api.conversations.listMessages,
    activeConversationId ? { conversationId: activeConversationId } : "skip",
  ) as Message[] | undefined;

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [streamingText, setStreamingText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [liveTools, setLiveTools] = useState<AgentToolEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const syncHistoryState = () => setHistoryOpen(window.innerWidth >= 1024);
    syncHistoryState();
    window.addEventListener("resize", syncHistoryState);
    return () => window.removeEventListener("resize", syncHistoryState);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamingText, liveTools, statusText]);

  useEffect(() => {
    if (phase !== "settling") return;
    const last = messages?.[messages.length - 1];
    if (last?.role === "assistant") {
      const timer = window.setTimeout(() => {
        setStreamingText("");
        setLiveTools([]);
        setPhase("idle");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [messages, phase]);

  function closeHistoryOnSmallScreens() {
    if (window.innerWidth < 1024) setHistoryOpen(false);
  }

  function selectConversation(conversationId: Id<"conversations">) {
    setSelectedConversationId(conversationId);
    closeHistoryOnSmallScreens();
  }

  async function startNewChat() {
    const id = await createConversation({});
    setSelectedConversationId(id);
    setInput("");
    setError(null);
    closeHistoryOnSmallScreens();
  }

  async function submitPrompt(raw: string) {
    const prompt = raw.trim();
    if (!prompt || !token || phase === "streaming") return;

    const previousInput = input;
    setInput("");
    setError(null);

    try {
      let id = activeConversationId;
      if (!id) {
        id = await createConversation({});
        setSelectedConversationId(id);
      }
      await addMessage({ conversationId: id, role: "user", content: prompt });
      await runStream(id);
    } catch (err) {
      console.error("agent send failed:", err);
      setInput(previousInput || prompt);
      setError("Couldn't send that message. Please try again.");
      setPhase("idle");
    }
  }

  async function runStream(id: Id<"conversations">) {
    if (!token) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    stickToBottomRef.current = true;
    setPhase("streaming");
    setStreamingText("");
    setLiveTools([]);
    setStatusText("Thinking it through...");
    setError(null);

    let failed = false;
    try {
      await streamAgentChat(
        { conversationId: id, token },
        {
          signal: controller.signal,
          onDelta: (chunk) => {
            setStatusText("");
            setStreamingText((prev) => prev + chunk);
          },
          onStatus: setStatusText,
          onTool: (event) => {
            setLiveTools((prev) => [...prev, event]);
            if (event.type === "tool-result") setStatusText(event.summary);
          },
          onError: (message) => {
            failed = true;
            setError(message);
          },
        },
      );
    } catch {
      failed = true;
      setError((prev) => prev ?? "Couldn't reach the assistant. Check the API server and try again.");
    } finally {
      abortRef.current = null;
      setStatusText("");
      if (failed) {
        setStreamingText("");
        setLiveTools([]);
        setPhase("idle");
      } else {
        setPhase("settling");
      }
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submitPrompt(input);
  }

  const visibleMessages = messages ?? [];
  const empty = visibleMessages.length === 0 && phase === "idle";
  const streaming = phase === "streaming";

  return (
    <div className="relative -mx-4 -my-6 flex h-[calc(100dvh-4.5rem)] min-h-136 overflow-hidden border-y border-neutral-200 bg-white sm:mx-0 sm:my-0 sm:rounded-lg sm:border lg:h-[calc(100vh-9rem)]">
      {historyOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/20 lg:hidden"
          onClick={() => setHistoryOpen(false)}
          aria-label="Close conversation history"
        />
      ) : null}

      <aside
        className={`absolute inset-y-0 left-0 z-30 flex w-[min(20rem,calc(100vw-2rem))] min-h-0 flex-col border-r border-neutral-200 bg-neutral-50 shadow-xl transition-transform duration-200 lg:relative lg:z-auto lg:w-72 lg:shadow-none ${
          historyOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">Conversations</p>
            <p className="truncate text-xs text-neutral-500">Tied to your account</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void startNewChat()}
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-800"
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white lg:hidden"
              aria-label="Close conversation history"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {(conversations ?? []).length === 0 ? (
            <p className="px-3 py-6 text-sm text-neutral-500">No conversations yet.</p>
          ) : (
            (conversations ?? []).map((conversation) => {
              const active = conversation._id === activeConversationId;
              return (
                <div key={conversation._id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selectConversation(conversation._id)}
                    className={`w-full rounded-lg px-3 py-2 pr-10 text-left transition-colors ${
                      active ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600 hover:bg-white"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{conversation.title}</p>
                    <p className="truncate text-xs text-neutral-400">
                      {new Date(conversation.lastMessageAt).toLocaleDateString()}
                    </p>
                  </button>
                  {active ? (
                    <button
                      type="button"
                      onClick={() => {
                        void removeConversation({ conversationId: conversation._id });
                        setSelectedConversationId(null);
                      }}
                      className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600"
                      aria-label="Delete conversation"
                      title="Delete conversation"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-50"
              aria-label={historyOpen ? "Hide conversation history" : "Show conversation history"}
              title={historyOpen ? "Hide history" : "Show history"}
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {activeConversation?.title ?? "Alpha Brain Assistant"}
              </p>
              <p className="hidden truncate text-xs text-neutral-500 sm:block">
                Chat, capture, critique, and build from your ideas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void startNewChat()}
            className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:px-3"
          >
            <MessageSquarePlus className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            stickToBottomRef.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
            {empty ? (
              <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-neutral-900 text-white">
                  <Sparkles className="size-5" />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-neutral-950 sm:text-3xl">Alpha Brain Assistant</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                  Capture categories, turn ideas into dated actions, and draft research-backed articles. It can be friendly; it will also call out flimsy thinking.
                </p>
                <div className="mt-5 hidden flex-wrap justify-center gap-2 sm:flex">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submitPrompt(suggestion)}
                      disabled={!token}
                      className="max-w-full truncate whitespace-nowrap rounded-full border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-neutral-900 disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              visibleMessages.map((message) => (
                <Turn key={message._id} message={message} />
              ))
            )}

            {(streamingText || streaming || liveTools.length > 0) && (
              <Turn
                message={{
                  _id: "streaming",
                  role: "assistant",
                  content: streamingText,
                  toolEvents: liveTools,
                }}
                pending={streaming && !streamingText}
                status={statusText}
              />
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-white p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {error ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask to create, save, or draft…"
                rows={1}
                className="scrollbar-none max-h-36 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitPrompt(input);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!token || streaming || !input.trim()}
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function Turn({
  message,
  pending,
  status,
}: {
  message: Message;
  pending?: boolean;
  status?: string;
}) {
  const assistant = message.role === "assistant";
  return (
    <div className={`flex ${assistant ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[92%] sm:max-w-[88%] ${assistant ? "space-y-2" : ""}`}>
        {assistant ? (
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Bot className="size-4 text-neutral-900" /> Assistant
          </div>
        ) : null}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            assistant ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
          }`}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2 text-neutral-500">
              <Loader2 className="size-4 animate-spin" /> {status || "Thinking..."}
            </span>
          ) : assistant ? (
            <Streamdown
              parseIncompleteMarkdown
              controls={false}
              className="prose prose-neutral max-w-none text-sm leading-6 prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-3 prose-pre:rounded-lg prose-pre:bg-neutral-950 prose-code:text-[0.9em]"
            >
              {message.content}
            </Streamdown>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        {assistant && message.toolEvents?.length ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Wrench className="size-3.5" /> Tools
            </div>
            <div className="space-y-1">
              {message.toolEvents.slice(-6).map((event) => (
                <div key={event.id} className="text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700">{event.toolName}</span>: {event.summary}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}