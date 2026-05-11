# Alpha-Brain: Scalable Multi-Channel Agent Architecture

> **Goal:** Build a maintainable, extensible system that supports multiple messaging channels (WhatsApp, Telegram, etc.) and enables a full-featured AI agent to interact with the database (ideas, actions, portfolios) across all channels.

**Inspired by:** OpenClaw's channel abstraction and agent framework patterns

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [System Architecture Overview](#system-architecture-overview)
3. [Layer Breakdown](#layer-breakdown)
4. [Channel Abstraction](#channel-abstraction)
5. [Agent Framework](#agent-framework)
6. [Tool System](#tool-system)
7. [Database Access Pattern](#database-access-pattern)
8. [Adding New Channels](#adding-new-channels)
9. [Adding New Agent Capabilities](#adding-new-agent-capabilities)
10. [Testing Strategy](#testing-strategy)
11. [Configuration Management](#configuration-management)
12. [Example Flows](#example-flows)

---

## Core Principles

### 1. **Separation of Concerns**
- **Transport Layer**: Channel-specific connection management (Baileys, grammY, etc.)
- **Adapter Layer**: Normalize messages to/from channels
- **Agent Layer**: Business logic, AI reasoning, tool execution
- **Data Layer**: Database operations, unified API

### 2. **Channel Agnostic Agent**
- Agent doesn't know if it's talking to WhatsApp or Telegram
- Same tools work across all channels
- Same command parsing, intent detection
- Same database operations

### 3. **Plugin Architecture**
- Channels are plugins (easy to add/remove)
- Tools are plugins (easy to extend agent capabilities)
- Database adapters are pluggable (Supabase, Prisma, etc.)

### 4. **Testability**
- Mock channels easily
- Mock database easily
- Test agent logic independently
- Integration tests per channel

### 5. **Maintainability**
- Clear boundaries between layers
- Consistent patterns across channels
- Single source of truth for business logic
- Easy to trace bugs

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Devices                                 │
│  WhatsApp  │  Telegram  │  Discord  │  Slack  │  Web UI             │
└─────────────────────────────────────────────────────────────────────┘
            │           │           │          │           │
            ▼           ▼           ▼          ▼           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Channel Adapters (Plugins)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ WhatsApp │  │ Telegram │  │ Discord  │  │   Web    │           │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
            │           │           │          │           │
            └───────────┴───────────┴──────────┴───────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Message Pipeline (Core)                         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  1. Normalize  →  2. Route  →  3. Process  →  4. Reply  │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────────┐  ┌─────────────────┐
│  Command Parser  │  │   Agent (AI Core)    │  │  Event System   │
│  - /add-idea     │  │  - LangChain/DSPy    │  │  - Hooks        │
│  - /show-actions │  │  - Tool Selection    │  │  - Triggers     │
│  - /portfolio    │  │  - Context Building  │  │  - Scheduled    │
└──────────────────┘  └──────────────────────┘  └─────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Tool Registry (Plugins)                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐    │
│  │ Add Idea  │  │ List      │  │ Portfolio │  │ Search      │    │
│  │ Tool      │  │ Actions   │  │ Summary   │  │ Ideas       │    │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────┘    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐    │
│  │ Update    │  │ Write     │  │ Send      │  │ Attach      │    │
│  │ Action    │  │ Article   │  │ Reminder  │  │ Resource    │    │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Database Layer (Abstraction)                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  Ideas API  │  Actions API  │  Portfolio API  │  etc. │        │
│  └────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Supabase PostgreSQL                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### **1. Channel Adapter Layer**

Each channel implements the `ChannelAdapter` interface:

```typescript
// packages/channels/src/types.ts

export interface ChannelAdapter {
  // Identification
  name: 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'web'

  // Lifecycle
  initialize(config: ChannelConfig): Promise<void>
  connect(userId: string): Promise<ConnectionResult>
  disconnect(userId: string): Promise<void>

  // Inbound (Receiving)
  onMessage(handler: MessageHandler): void
  onReaction(handler: ReactionHandler): void
  onMediaReceived(handler: MediaHandler): void

  // Outbound (Sending)
  sendText(target: string, text: string, options?: SendOptions): Promise<SendResult>
  sendMedia(target: string, media: MediaPayload, options?: SendOptions): Promise<SendResult>
  sendReaction(target: string, messageId: string, emoji: string): Promise<void>

  // Capabilities
  capabilities: ChannelCapabilities
}

export interface ChannelCapabilities {
  supportsStreaming: boolean
  supportsReactions: boolean
  supportsThreads: boolean
  supportsPolls: boolean
  supportsInlineButtons: boolean
  maxMessageLength: number
  supportedMediaTypes: string[]
}

export interface NormalizedMessage {
  // Universal fields across all channels
  id: string
  channelUserId: string // User's ID within this channel
  appUserId: string // Alpha-Brain user ID (mapped)
  channel: ChannelName

  // Content
  body: string
  mediaUrls?: string[]
  mediaTypes?: string[]

  // Context
  isGroup: boolean
  groupId?: string
  threadId?: string
  replyToMessageId?: string

  // Metadata
  timestamp: Date

  // Reply functions (channel-specific, but unified interface)
  reply(text: string, options?: ReplyOptions): Promise<void>
  sendMedia(media: MediaPayload, options?: ReplyOptions): Promise<void>
}
```

**Key Insight:** All channels normalize messages to this common format before passing to the agent.

---

### **2. Message Pipeline (Core)**

The pipeline processes every message, regardless of channel:

```typescript
// packages/core/src/pipeline.ts

export class MessagePipeline {
  constructor(
    private toolRegistry: ToolRegistry,
    private agentCore: AgentCore,
    private database: DatabaseLayer,
    private eventBus: EventBus
  ) {}

  async process(message: NormalizedMessage): Promise<void> {
    // 1. Normalize (already done by channel adapter)

    // 2. Route
    const route = await this.resolveRoute(message)

    // 3. Check access control
    const authorized = await this.checkAccess(message, route)
    if (!authorized) {
      await message.reply('Unauthorized')
      return
    }

    // 4. Parse commands vs natural language
    const intent = await this.parseIntent(message.body)

    // 5. Execute
    if (intent.type === 'command') {
      await this.executeCommand(message, intent)
    } else {
      await this.executeAgentTurn(message, intent)
    }

    // 6. Emit events
    this.eventBus.emit('message:processed', { message, intent })
  }

  private async parseIntent(text: string): Promise<Intent> {
    // Check for explicit commands first
    if (text.startsWith('/')) {
      return parseCommand(text)
    }

    // Use AI to detect intent
    return this.agentCore.detectIntent(text)
  }

  private async executeCommand(
    message: NormalizedMessage,
    intent: CommandIntent
  ): Promise<void> {
    const tool = this.toolRegistry.get(intent.command)
    if (!tool) {
      await message.reply(`Unknown command: ${intent.command}`)
      return
    }

    const result = await tool.execute({
      userId: message.appUserId,
      params: intent.params,
      message
    })

    await message.reply(result.response)
  }

  private async executeAgentTurn(
    message: NormalizedMessage,
    intent: NaturalIntent
  ): Promise<void> {
    // Build context with user data, conversation history
    const context = await this.buildAgentContext(message)

    // Agent decides which tools to use
    const response = await this.agentCore.run({
      input: message.body,
      context,
      availableTools: this.toolRegistry.getAllTools(),
      userId: message.appUserId
    })

    // Stream or send final response
    if (message.channel.capabilities.supportsStreaming) {
      await this.streamResponse(message, response)
    } else {
      await message.reply(response.finalText)
    }
  }
}
```

---

### **3. Agent Core**

The agent is channel-agnostic and powered by LangChain or similar framework:

```typescript
// packages/agent/src/agent-core.ts

export class AgentCore {
  constructor(
    private llm: ChatModel,
    private toolRegistry: ToolRegistry,
    private memory: ConversationMemory
  ) {}

  async run(params: AgentRunParams): Promise<AgentResponse> {
    const { input, context, availableTools, userId } = params

    // 1. Load conversation memory
    const conversationHistory = await this.memory.load(userId)

    // 2. Build system prompt
    const systemPrompt = this.buildSystemPrompt(context)

    // 3. Create agent with tools
    const agent = new AgentExecutor({
      llm: this.llm,
      tools: availableTools.map(t => t.toLangChainTool()),
      memory: conversationHistory,
      systemMessage: systemPrompt,
      maxIterations: 10
    })

    // 4. Execute
    const result = await agent.run(input)

    // 5. Save to memory
    await this.memory.save(userId, input, result)

    return {
      finalText: result.output,
      toolCalls: result.intermediateSteps,
      reasoning: result.reasoning
    }
  }

  private buildSystemPrompt(context: AgentContext): string {
    return `You are Alpha Brain, an AI assistant for investment tracking and idea management.

Current user: ${context.user.name}
Channel: ${context.channel}
Time: ${context.timestamp}

User's recent actions:
${context.recentActions.map(a => `- ${a.text} (${a.status})`).join('\n')}

User's active ideas: ${context.activeIdeas.length}
Portfolio value: ₹${context.portfolioValue}

Available tools:
${context.availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Guidelines:
- Be concise (messaging context, not long-form)
- Use tools to fetch/modify data
- Confirm before destructive actions
- Use markdown for formatting
- Adapt tone to channel (WhatsApp = casual, Telegram = slightly formal)
`
  }
}
```

---

### **4. Tool System**

Tools are the agent's hands - they perform actual operations:

```typescript
// packages/tools/src/tool-base.ts

export abstract class Tool {
  abstract name: string
  abstract description: string
  abstract parameters: ToolParameter[]

  abstract execute(context: ToolContext): Promise<ToolResult>

  // Convert to LangChain tool format
  toLangChainTool(): LangChainTool {
    return new DynamicTool({
      name: this.name,
      description: this.description,
      func: async (input: string) => {
        const params = JSON.parse(input)
        const result = await this.execute({
          userId: params.userId,
          params,
          db: this.db
        })
        return result.output
      }
    })
  }
}

// Example: Add Idea Tool
export class AddIdeaTool extends Tool {
  name = 'add_idea'
  description = 'Create a new investment idea with title, explanation, and optional actions'

  parameters = [
    { name: 'title', type: 'string', required: true },
    { name: 'explanation', type: 'string', required: true },
    { name: 'category', type: 'string', required: false },
    { name: 'actions', type: 'array', required: false }
  ]

  async execute(context: ToolContext): Promise<ToolResult> {
    const { title, explanation, category, actions } = context.params

    // Create idea in database
    const idea = await context.db.ideas.create({
      userId: context.userId,
      title,
      content_json: {
        explanation,
        category: category || 'General'
      }
    })

    // If actions provided, create them
    if (actions && actions.length > 0) {
      await context.db.actions.createMany(
        actions.map(a => ({
          idea_id: idea.id,
          text: a.text,
          due_time: a.due_time,
          status: 'pending'
        }))
      )
    }

    return {
      success: true,
      output: `✅ Created idea: "${title}"\n📋 ${actions?.length || 0} actions added\n\nID: ${idea.id}`,
      data: { ideaId: idea.id }
    }
  }
}

// Example: List Actions Tool
export class ListActionsTool extends Tool {
  name = 'list_actions'
  description = 'Get all pending, in-progress, or completed actions'

  parameters = [
    { name: 'status', type: 'string', enum: ['pending', 'inprogress', 'done'], required: false },
    { name: 'limit', type: 'number', required: false }
  ]

  async execute(context: ToolContext): Promise<ToolResult> {
    const { status = 'pending', limit = 10 } = context.params

    const actions = await context.db.actions.findMany({
      where: {
        user_id: context.userId,
        status
      },
      include: {
        idea: {
          select: { title: true }
        }
      },
      orderBy: { due_time: 'asc' },
      limit
    })

    if (actions.length === 0) {
      return {
        success: true,
        output: `No ${status} actions found.`
      }
    }

    const formatted = actions.map(a =>
      `• ${a.text}\n  Idea: ${a.idea.title}\n  Due: ${a.due_time ? formatDate(a.due_time) : 'No deadline'}`
    ).join('\n\n')

    return {
      success: true,
      output: `**${status.toUpperCase()} Actions (${actions.length}):**\n\n${formatted}`,
      data: { actions }
    }
  }
}

// Example: Update Action Tool
export class UpdateActionTool extends Tool {
  name = 'update_action'
  description = 'Update an action status or text'

  parameters = [
    { name: 'action_id', type: 'string', required: true },
    { name: 'status', type: 'string', enum: ['pending', 'inprogress', 'done'], required: false },
    { name: 'text', type: 'string', required: false }
  ]

  async execute(context: ToolContext): Promise<ToolResult> {
    const { action_id, status, text } = context.params

    // Verify ownership
    const action = await context.db.actions.findFirst({
      where: { id: action_id, user_id: context.userId }
    })

    if (!action) {
      return {
        success: false,
        output: '❌ Action not found or you don\'t have permission'
      }
    }

    // Update
    await context.db.actions.update({
      where: { id: action_id },
      data: {
        ...(status ? { status } : {}),
        ...(text ? { text } : {})
      }
    })

    return {
      success: true,
      output: `✅ Updated action: "${action.text}"\n${status ? `Status: ${status}` : ''}`,
      data: { action_id }
    }
  }
}

// Example: Portfolio Summary Tool
export class PortfolioSummaryTool extends Tool {
  name = 'portfolio_summary'
  description = 'Get current portfolio summary with top performers, gainers, losers'

  parameters = []

  async execute(context: ToolContext): Promise<ToolResult> {
    // Fetch user's portfolio
    const holdings = await context.db.holdings.findMany({
      where: { user_id: context.userId },
      include: { stock_prices: true }
    })

    if (holdings.length === 0) {
      return {
        success: true,
        output: '📊 Your portfolio is empty. Add holdings to see summary.'
      }
    }

    // Calculate metrics
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0)
    const totalGain = holdings.reduce((sum, h) => sum + h.gain_loss, 0)
    const gainPct = (totalGain / (totalValue - totalGain)) * 100

    const topPerformer = holdings.sort((a, b) => b.gain_pct - a.gain_pct)[0]
    const worstPerformer = holdings.sort((a, b) => a.gain_pct - b.gain_pct)[0]

    const output = `📊 **Portfolio Summary**

**Total Value:** ₹${totalValue.toLocaleString()}
**Total Gain/Loss:** ₹${totalGain.toLocaleString()} (${gainPct.toFixed(2)}%)

**Top Performer:** ${topPerformer.symbol} (+${topPerformer.gain_pct.toFixed(2)}%)
**Worst Performer:** ${worstPerformer.symbol} (${worstPerformer.gain_pct.toFixed(2)}%)

**Holdings:** ${holdings.length} stocks
`

    return {
      success: true,
      output,
      data: { totalValue, totalGain, gainPct, holdings: holdings.length }
    }
  }
}

// Example: Write Article Tool
export class WriteArticleTool extends Tool {
  name = 'write_article'
  description = 'Write a detailed article/analysis on an idea or topic'

  parameters = [
    { name: 'idea_id', type: 'string', required: false },
    { name: 'topic', type: 'string', required: true },
    { name: 'outline', type: 'array', required: false }
  ]

  async execute(context: ToolContext): Promise<ToolResult> {
    const { idea_id, topic, outline } = context.params

    // If idea_id, fetch idea context
    let ideaContext = ''
    if (idea_id) {
      const idea = await context.db.ideas.findFirst({
        where: { id: idea_id, user_id: context.userId }
      })

      if (idea) {
        ideaContext = `Based on your idea: "${idea.title}"\n${idea.content_json.explanation}\n\n`
      }
    }

    // Generate article using AI
    const article = await context.llm.generate({
      prompt: `Write a detailed investment article on: ${topic}

${ideaContext}

${outline ? `Structure:\n${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

Write a comprehensive, well-researched article with:
- Clear introduction
- Data-backed arguments
- Risk analysis
- Conclusion with actionable insights

Format in markdown.
`,
      maxTokens: 2000
    })

    // Save as attachment to idea or create new idea
    let savedId: string
    if (idea_id) {
      await context.db.idea_attachments.create({
        idea_id,
        type: 'article',
        content: article,
        name: topic
      })
      savedId = idea_id
    } else {
      const newIdea = await context.db.ideas.create({
        userId: context.userId,
        title: topic,
        content_json: {
          type: 'article',
          content: article
        }
      })
      savedId = newIdea.id
    }

    return {
      success: true,
      output: `✍️ **Article Written: "${topic}"**\n\n${article.slice(0, 300)}...\n\n[Full article saved to idea ${savedId}]`,
      data: { ideaId: savedId, article }
    }
  }
}
```

---

### **5. Database Layer**

Unified API for database operations, abstracted from the agent:

```typescript
// packages/database/src/api.ts

export class DatabaseAPI {
  constructor(private client: SupabaseClient) {}

  // Ideas
  ideas = {
    create: async (data: CreateIdeaInput) => {
      const { data: idea, error } = await this.client
        .from('ideas')
        .insert(data)
        .select()
        .single()

      if (error) throw new DatabaseError(error)
      return idea
    },

    findById: async (id: string, userId: string) => {
      const { data, error } = await this.client
        .from('ideas')
        .select('*, actions(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) throw new DatabaseError(error)
      return data
    },

    search: async (query: string, userId: string) => {
      const { data, error } = await this.client
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .textSearch('title', query)
        .limit(10)

      if (error) throw new DatabaseError(error)
      return data
    },

    // ... more methods
  },

  // Actions
  actions = {
    create: async (data: CreateActionInput) => { /* ... */ },
    update: async (id: string, data: UpdateActionInput) => { /* ... */ },
    findByStatus: async (userId: string, status: ActionStatus) => { /* ... */ },
    // ... more methods
  },

  // Portfolio
  portfolio = {
    getSummary: async (userId: string) => { /* ... */ },
    getHoldings: async (userId: string) => { /* ... */ },
    // ... more methods
  }
}
```

**Key Insight:** Tools use this API, never raw SQL. Easy to switch databases if needed.

---

## Channel Abstraction

### WhatsApp Adapter Implementation

```typescript
// packages/channels/src/whatsapp/whatsapp-adapter.ts

export class WhatsAppAdapter implements ChannelAdapter {
  name = 'whatsapp' as const
  private connectionManager: ConnectionManager
  private messageHandler?: MessageHandler

  capabilities: ChannelCapabilities = {
    supportsStreaming: false,
    supportsReactions: true,
    supportsThreads: false,
    supportsPolls: true,
    supportsInlineButtons: false,
    maxMessageLength: 4000,
    supportedMediaTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf']
  }

  async connect(userId: string): Promise<ConnectionResult> {
    // Create Baileys socket for user
    const socket = await this.connectionManager.createSocket(userId)

    // Register event handlers
    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        const normalized = await this.normalizeMessage(msg, userId)
        if (normalized) {
          await this.messageHandler?.(normalized)
        }
      }
    })

    return { connected: true }
  }

  private async normalizeMessage(
    msg: WAMessage,
    appUserId: string
  ): Promise<NormalizedMessage> {
    const body = extractText(msg.message)
    const mediaUrls = await this.downloadMedia(msg)

    return {
      id: msg.key.id!,
      channelUserId: msg.key.remoteJid!,
      appUserId,
      channel: 'whatsapp',
      body: body || '',
      mediaUrls,
      isGroup: msg.key.remoteJid?.endsWith('@g.us') || false,
      timestamp: new Date(msg.messageTimestamp as number * 1000),

      // Reply functions
      reply: async (text, options) => {
        await this.sendText(msg.key.remoteJid!, text, options)
      },
      sendMedia: async (media, options) => {
        await this.sendMedia(msg.key.remoteJid!, media, options)
      }
    }
  }

  async sendText(target: string, text: string, options?: SendOptions): Promise<SendResult> {
    const socket = this.connectionManager.getSocket(options?.userId!)

    const result = await socket.sendMessage(target, { text })

    return {
      messageId: result.key.id!,
      timestamp: new Date()
    }
  }
}
```

### Telegram Adapter Implementation

```typescript
// packages/channels/src/telegram/telegram-adapter.ts

export class TelegramAdapter implements ChannelAdapter {
  name = 'telegram' as const
  private bots: Map<string, Bot> = new Map()

  capabilities: ChannelCapabilities = {
    supportsStreaming: true, // ✅ Telegram supports edit-based streaming
    supportsReactions: true,
    supportsThreads: true,
    supportsPolls: true,
    supportsInlineButtons: true,
    maxMessageLength: 4096,
    supportedMediaTypes: ['*/*']
  }

  async connect(userId: string): Promise<ConnectionResult> {
    // Get user's bot token
    const token = await this.getUserBotToken(userId)

    // Create grammY bot
    const bot = new Bot(token)
    this.bots.set(userId, bot)

    // Register handlers
    bot.on('message', async (ctx) => {
      const normalized = await this.normalizeMessage(ctx, userId)
      await this.messageHandler?.(normalized)
    })

    // Start polling
    await bot.start()

    return { connected: true }
  }

  private async normalizeMessage(
    ctx: Context,
    appUserId: string
  ): Promise<NormalizedMessage> {
    const msg = ctx.message!

    return {
      id: String(msg.message_id),
      channelUserId: String(msg.from?.id),
      appUserId,
      channel: 'telegram',
      body: msg.text || '',
      mediaUrls: await this.extractMedia(msg),
      isGroup: msg.chat.type === 'group' || msg.chat.type === 'supergroup',
      threadId: msg.message_thread_id ? String(msg.message_thread_id) : undefined,
      timestamp: new Date(msg.date * 1000),

      // Reply functions
      reply: async (text, options) => {
        if (options?.streaming) {
          // Telegram-specific streaming
          const sent = await ctx.reply(text)
          return {
            update: async (newText) => {
              await ctx.api.editMessageText(msg.chat.id, sent.message_id, newText)
            }
          }
        }

        await ctx.reply(text)
      },
      sendMedia: async (media, options) => {
        const file = new InputFile(media.buffer, media.filename)
        await ctx.replyWithPhoto(file, { caption: media.caption })
      }
    }
  }
}
```

---

## Agent Framework

### Tool Registry

```typescript
// packages/agent/src/tool-registry.ts

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  registerMany(tools: Tool[]): void {
    tools.forEach(t => this.register(t))
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  getToolsByCategory(category: string): Tool[] {
    return this.getAllTools().filter(t => t.category === category)
  }
}

// Initialize with all tools
export function createToolRegistry(db: DatabaseAPI): ToolRegistry {
  const registry = new ToolRegistry()

  // Idea management tools
  registry.registerMany([
    new AddIdeaTool(db),
    new SearchIdeaTool(db),
    new UpdateIdeaTool(db),
    new DeleteIdeaTool(db),
    new AttachResourceTool(db)
  ])

  // Action management tools
  registry.registerMany([
    new ListActionsTool(db),
    new AddActionTool(db),
    new UpdateActionTool(db),
    new DeleteActionTool(db)
  ])

  // Portfolio tools
  registry.registerMany([
    new PortfolioSummaryTool(db),
    new AddHoldingTool(db),
    new RemoveHoldingTool(db),
    new PortfolioPerformanceTool(db)
  ])

  // Content generation tools
  registry.registerMany([
    new WriteArticleTool(db),
    new SummarizeIdeaTool(db),
    new GenerateReportTool(db)
  ])

  // Notification tools
  registry.registerMany([
    new SendReminderTool(db),
    new ScheduleNotificationTool(db)
  ])

  return registry
}
```

---

## Adding New Channels

To add a new channel (e.g., Discord), implement the `ChannelAdapter` interface:

### Step 1: Create Adapter

```typescript
// packages/channels/src/discord/discord-adapter.ts

export class DiscordAdapter implements ChannelAdapter {
  name = 'discord' as const

  capabilities = {
    supportsStreaming: false,
    supportsReactions: true,
    supportsThreads: true,
    supportsPolls: false,
    supportsInlineButtons: true,
    maxMessageLength: 2000,
    supportedMediaTypes: ['*/*']
  }

  async connect(userId: string): Promise<ConnectionResult> {
    // Discord bot setup
    const client = new Client({ intents: [...] })
    await client.login(token)

    client.on('messageCreate', async (msg) => {
      const normalized = await this.normalizeMessage(msg, userId)
      await this.messageHandler?.(normalized)
    })

    return { connected: true }
  }

  private async normalizeMessage(msg: Message, appUserId: string): Promise<NormalizedMessage> {
    return {
      id: msg.id,
      channelUserId: msg.author.id,
      appUserId,
      channel: 'discord',
      body: msg.content,
      // ... rest of normalization
      reply: async (text) => msg.reply(text),
      sendMedia: async (media) => msg.channel.send({ files: [media.buffer] })
    }
  }

  async sendText(target: string, text: string): Promise<SendResult> {
    // Discord-specific sending
  }
}
```

### Step 2: Register in Channel Manager

```typescript
// packages/core/src/channel-manager.ts

export class ChannelManager {
  private adapters: Map<ChannelName, ChannelAdapter> = new Map()

  registerChannel(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }
}

// In initialization
const channelManager = new ChannelManager()
channelManager.registerChannel(new WhatsAppAdapter())
channelManager.registerChannel(new TelegramAdapter())
channelManager.registerChannel(new DiscordAdapter()) // ✅ New channel!
```

### Step 3: Add Configuration

```typescript
// config/channels.ts

export const channelConfigs = {
  whatsapp: {
    enabled: true,
    requiresPairing: true,
    authType: 'qr_code'
  },
  telegram: {
    enabled: true,
    requiresPairing: false,
    authType: 'bot_token'
  },
  discord: {
    enabled: true,
    requiresPairing: false,
    authType: 'bot_token'
  }
}
```

**That's it!** The agent automatically works with the new channel. No changes needed to:
- Tool implementations
- Database layer
- Agent core
- Message pipeline

---

## Adding New Agent Capabilities

To add a new capability (e.g., "Schedule WhatsApp Reminder"):

### Step 1: Create Tool

```typescript
// packages/tools/src/notifications/schedule-reminder.ts

export class ScheduleReminderTool extends Tool {
  name = 'schedule_reminder'
  description = 'Schedule a reminder to be sent via WhatsApp/Telegram at a specific time'

  parameters = [
    { name: 'message', type: 'string', required: true },
    { name: 'send_at', type: 'datetime', required: true },
    { name: 'channel', type: 'string', enum: ['whatsapp', 'telegram'], required: false }
  ]

  async execute(context: ToolContext): Promise<ToolResult> {
    const { message, send_at, channel } = context.params

    // Save to database
    const reminder = await context.db.scheduled_notifications.create({
      user_id: context.userId,
      message,
      send_at: new Date(send_at),
      channel: channel || 'whatsapp',
      status: 'pending'
    })

    // Schedule job with Inngest
    await inngest.send({
      name: 'notification/send-reminder',
      data: {
        reminderId: reminder.id,
        userId: context.userId,
        message,
        channel
      },
      ts: new Date(send_at).getTime()
    })

    return {
      success: true,
      output: `⏰ Reminder scheduled for ${formatDate(send_at)}\n"${message}"`,
      data: { reminderId: reminder.id }
    }
  }
}
```

### Step 2: Register Tool

```typescript
// In tool registry initialization

registry.register(new ScheduleReminderTool(db))
```

### Step 3: Agent Automatically Uses It

```
User: "Remind me tomorrow at 9am to review my portfolio"

Agent: *detects intent, calls schedule_reminder tool*
- Parses "tomorrow at 9am" → datetime
- Calls tool.execute({ message: "Review portfolio", send_at: "2026-05-12T09:00:00Z" })

Response: "⏰ Reminder scheduled for May 12, 2026 at 9:00 AM
'Review portfolio'"
```

**No code changes needed to agent core or channels!**

---

## Testing Strategy

### 1. **Unit Tests: Tools**

```typescript
// packages/tools/src/__tests__/add-idea.test.ts

describe('AddIdeaTool', () => {
  let tool: AddIdeaTool
  let mockDb: MockDatabase

  beforeEach(() => {
    mockDb = createMockDatabase()
    tool = new AddIdeaTool(mockDb)
  })

  it('should create idea with title and explanation', async () => {
    const result = await tool.execute({
      userId: 'user-1',
      params: {
        title: 'Test Idea',
        explanation: 'This is a test'
      },
      db: mockDb
    })

    expect(result.success).toBe(true)
    expect(mockDb.ideas.create).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Test Idea',
      content_json: {
        explanation: 'This is a test',
        category: 'General'
      }
    })
  })

  it('should create actions if provided', async () => {
    await tool.execute({
      userId: 'user-1',
      params: {
        title: 'Test',
        explanation: 'Test',
        actions: [
          { text: 'Action 1', due_time: '2026-05-15' }
        ]
      },
      db: mockDb
    })

    expect(mockDb.actions.createMany).toHaveBeenCalled()
  })
})
```

### 2. **Unit Tests: Channel Adapters**

```typescript
// packages/channels/src/whatsapp/__tests__/whatsapp-adapter.test.ts

describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter
  let mockSocket: MockBaileysSocket

  beforeEach(() => {
    mockSocket = createMockSocket()
    adapter = new WhatsAppAdapter()
  })

  it('should normalize WhatsApp message', async () => {
    const waMessage = createMockWAMessage({
      text: 'Hello',
      from: '+1234567890'
    })

    const normalized = await adapter.normalizeMessage(waMessage, 'user-1')

    expect(normalized).toMatchObject({
      body: 'Hello',
      channelUserId: '+1234567890',
      appUserId: 'user-1',
      channel: 'whatsapp'
    })
  })

  it('should send text message', async () => {
    await adapter.sendText('+1234567890', 'Test message')

    expect(mockSocket.sendMessage).toHaveBeenCalledWith(
      '+1234567890',
      { text: 'Test message' }
    )
  })
})
```

### 3. **Integration Tests: Pipeline**

```typescript
// packages/core/src/__tests__/pipeline.integration.test.ts

describe('MessagePipeline Integration', () => {
  let pipeline: MessagePipeline
  let mockDb: MockDatabase
  let mockAgent: MockAgent

  beforeEach(() => {
    mockDb = createMockDatabase()
    mockAgent = createMockAgent()
    const toolRegistry = createToolRegistry(mockDb)

    pipeline = new MessagePipeline(toolRegistry, mockAgent, mockDb, eventBus)
  })

  it('should execute command and call tool', async () => {
    const message = createNormalizedMessage({
      body: '/add-idea title="Test" explanation="Test explanation"',
      appUserId: 'user-1'
    })

    await pipeline.process(message)

    expect(mockDb.ideas.create).toHaveBeenCalled()
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('Created idea: "Test"')
    )
  })

  it('should handle natural language and call agent', async () => {
    const message = createNormalizedMessage({
      body: 'Show me my pending actions',
      appUserId: 'user-1'
    })

    mockAgent.setResponse('Here are your pending actions: ...')

    await pipeline.process(message)

    expect(mockAgent.run).toHaveBeenCalled()
    expect(message.reply).toHaveBeenCalled()
  })
})
```

### 4. **End-to-End Tests: Per Channel**

```typescript
// e2e/whatsapp.e2e.test.ts

describe('WhatsApp E2E', () => {
  it('should receive message and create idea', async () => {
    // Setup real WhatsApp connection in test mode
    const adapter = new WhatsAppAdapter()
    await adapter.connect('test-user')

    // Simulate incoming message
    const result = await simulateIncomingMessage(adapter, {
      from: '+1234567890',
      text: '/add-idea title="Test Idea" explanation="Test"'
    })

    // Verify database
    const ideas = await db.ideas.findMany({
      where: { user_id: 'test-user' }
    })

    expect(ideas).toHaveLength(1)
    expect(ideas[0].title).toBe('Test Idea')
  })
})
```

---

## Configuration Management

### Per-User, Per-Channel Configuration

```typescript
// config/user-channel-config.ts

export interface UserChannelConfig {
  userId: string
  channel: ChannelName

  // General
  enabled: boolean
  language: string
  timezone: string

  // Notifications
  notifications: {
    actionReminders: boolean
    portfolioUpdates: boolean
    dailySummary: boolean
    quietHours?: {
      start: string // "22:00"
      end: string   // "08:00"
    }
  }

  // Agent behavior
  agent: {
    responseStyle: 'concise' | 'detailed'
    confirmDestructiveActions: boolean
    autoExecuteSimpleCommands: boolean
  }

  // Channel-specific
  channelSpecific: WhatsAppConfig | TelegramConfig | DiscordConfig
}

// Load config
export async function getUserChannelConfig(
  userId: string,
  channel: ChannelName
): Promise<UserChannelConfig> {
  const config = await db.user_channel_configs.findFirst({
    where: { user_id: userId, channel }
  })

  return config || getDefaultConfig(channel)
}
```

---

## Example Flows

### Flow 1: User Adds Idea via WhatsApp

```
1. User sends WhatsApp message:
   "Add idea: Invest in HDFC Bank due to strong fundamentals"

2. WhatsApp Adapter receives message
   → Normalizes to NormalizedMessage

3. Message Pipeline:
   → parseIntent() → Natural language (not command)
   → executeAgentTurn()

4. Agent Core:
   → Detects intent: "create_investment_idea"
   → Selects tool: AddIdeaTool
   → Calls tool.execute({
       title: "Invest in HDFC Bank",
       explanation: "Strong fundamentals",
       category: "Stock Investment"
     })

5. AddIdeaTool:
   → db.ideas.create(...)
   → Returns: "✅ Created idea: 'Invest in HDFC Bank'"

6. Agent replies via WhatsApp:
   ← "✅ Created idea: 'Invest in HDFC Bank'
      📋 0 actions added
      ID: abc-123"

7. User receives message in WhatsApp ✓
```

### Flow 2: User Lists Actions via Telegram

```
1. User sends Telegram message: "/actions"

2. Telegram Adapter receives
   → Normalizes

3. Pipeline:
   → parseIntent() → Command
   → executeCommand() with intent.command = "actions"

4. Command mapped to ListActionsTool
   → tool.execute({ status: 'pending', limit: 10 })

5. ListActionsTool:
   → db.actions.findMany({ where: { user_id, status: 'pending' } })
   → Formats response

6. Agent replies via Telegram:
   ← "**PENDING Actions (3):**

      • Research competitor financials
        Idea: HDFC Bank Investment
        Due: May 15, 2026

      • Analyze Q4 results
        Idea: Tech Stock Portfolio
        Due: May 20, 2026

      • Review diversification
        Idea: Portfolio Rebalance
        Due: No deadline"

7. User receives in Telegram with markdown formatting ✓
```

### Flow 3: Agent Writes Article (Multi-turn)

```
1. User: "Write an article about why HDFC Bank is undervalued"

2. Agent:
   → Detects intent: write_analysis
   → Calls SearchIdeaTool to find related ideas
   → Calls PortfolioSummaryTool to check current holdings
   → Calls WriteArticleTool with context

3. WriteArticleTool:
   → Uses LLM to generate comprehensive article
   → Saves as attachment to relevant idea
   → Returns article summary

4. Agent (streaming on Telegram):
   ← "✍️ **Article: 'Why HDFC Bank is Undervalued'**

      [Streams article content in real-time via editMessageText]

      ## Introduction
      HDFC Bank has been trading below its historical...

      ## Financial Analysis
      Looking at the Q4 results...

      ...

      ## Conclusion
      With a P/E ratio of 18x vs industry average of 22x...

      [Full article saved to idea abc-123]"

5. User reads article in Telegram with live updates ✓
```

---

## File Structure

```
alpha-brain/
├── apps/
│   ├── web/                          # Next.js frontend
│   └── gateway/                      # Channel gateway service
│
├── packages/
│   ├── channels/                     # Channel adapters
│   │   ├── src/
│   │   │   ├── types.ts              # Common interfaces
│   │   │   ├── whatsapp/
│   │   │   │   ├── whatsapp-adapter.ts
│   │   │   │   ├── connection-manager.ts
│   │   │   │   └── __tests__/
│   │   │   ├── telegram/
│   │   │   │   ├── telegram-adapter.ts
│   │   │   │   └── __tests__/
│   │   │   └── discord/
│   │   │       ├── discord-adapter.ts
│   │   │       └── __tests__/
│   │   └── package.json
│   │
│   ├── core/                         # Core pipeline
│   │   ├── src/
│   │   │   ├── pipeline.ts           # Message processing pipeline
│   │   │   ├── channel-manager.ts    # Manages all adapters
│   │   │   ├── intent-parser.ts      # Command & NL intent detection
│   │   │   ├── access-control.ts     # Authorization
│   │   │   └── __tests__/
│   │   └── package.json
│   │
│   ├── agent/                        # AI agent
│   │   ├── src/
│   │   │   ├── agent-core.ts         # Main agent logic
│   │   │   ├── tool-registry.ts      # Tool management
│   │   │   ├── memory.ts             # Conversation memory
│   │   │   ├── prompts.ts            # System prompts
│   │   │   └── __tests__/
│   │   └── package.json
│   │
│   ├── tools/                        # Agent tools
│   │   ├── src/
│   │   │   ├── tool-base.ts          # Base Tool class
│   │   │   ├── ideas/
│   │   │   │   ├── add-idea.ts
│   │   │   │   ├── search-idea.ts
│   │   │   │   └── update-idea.ts
│   │   │   ├── actions/
│   │   │   │   ├── list-actions.ts
│   │   │   │   └── update-action.ts
│   │   │   ├── portfolio/
│   │   │   │   └── portfolio-summary.ts
│   │   │   ├── content/
│   │   │   │   ├── write-article.ts
│   │   │   │   └── generate-report.ts
│   │   │   └── notifications/
│   │   │       └── schedule-reminder.ts
│   │   └── package.json
│   │
│   ├── database/                     # Database layer
│   │   ├── src/
│   │   │   ├── api.ts                # Unified DB API
│   │   │   ├── client.ts             # Supabase client
│   │   │   ├── migrations/           # DB migrations
│   │   │   └── __tests__/
│   │   └── package.json
│   │
│   └── shared/                       # Shared utilities
│       ├── src/
│       │   ├── types.ts              # Common types
│       │   ├── errors.ts             # Error classes
│       │   ├── utils.ts              # Utilities
│       │   └── constants.ts
│       └── package.json
│
├── config/
│   ├── channels.ts                   # Channel configurations
│   └── tools.ts                      # Tool configurations
│
├── scripts/
│   ├── migrate-db.ts                 # Run migrations
│   └── seed-test-data.ts             # Test data
│
├── docs/
│   ├── ARCHITECTURE.md               # This file
│   ├── ADDING_CHANNEL.md             # Guide to add channel
│   ├── ADDING_TOOL.md                # Guide to add tool
│   └── API.md                        # Database API docs
│
├── package.json                      # Root workspace
├── turbo.json                        # Turborepo config
└── tsconfig.json                     # Root TypeScript config
```

---

## Benefits of This Architecture

### 1. **Easy to Add New Channels**
- Implement `ChannelAdapter` interface (200-300 lines)
- Register in channel manager (1 line)
- Works immediately with all tools and agent

### 2. **Easy to Add New Capabilities**
- Create Tool class (50-100 lines)
- Register in tool registry (1 line)
- Agent automatically discovers and uses it

### 3. **Testable at Every Layer**
- Unit test tools independently
- Unit test channel adapters independently
- Integration test pipeline
- E2E test per channel

### 4. **Maintainable**
- Clear separation of concerns
- Each package has single responsibility
- Easy to find and fix bugs
- Easy to onboard new developers

### 5. **Scalable**
- Channel adapters can run in separate processes
- Tools can be distributed across services
- Database layer can be optimized/cached independently
- Agent can use different LLMs per channel

### 6. **Type-Safe**
- Shared TypeScript types across all packages
- Compile-time checks prevent bugs
- Great IDE autocomplete

---

## Migration Path

### Phase 1: Foundation (Week 1)
- ✅ Set up monorepo structure
- ✅ Create core packages (channels, core, agent, tools, database)
- ✅ Define interfaces (ChannelAdapter, Tool, etc.)
- ✅ Implement database API layer

### Phase 2: WhatsApp Channel (Week 2)
- ✅ Implement WhatsAppAdapter
- ✅ Create basic tools (AddIdea, ListActions)
- ✅ Implement message pipeline
- ✅ Test end-to-end

### Phase 3: Agent Core (Week 3)
- ✅ Integrate LangChain
- ✅ Implement tool registry
- ✅ Add conversation memory
- ✅ Test with multiple tools

### Phase 4: Telegram Channel (Week 4)
- ✅ Implement TelegramAdapter
- ✅ Test adapter works with existing tools
- ✅ Add streaming support
- ✅ Test cross-channel consistency

### Phase 5: Advanced Tools (Week 5)
- ✅ WriteArticleTool
- ✅ PortfolioSummaryTool
- ✅ ScheduleReminderTool
- ✅ GenerateReportTool

### Phase 6: Production Hardening (Week 6)
- ✅ Error handling
- ✅ Monitoring/logging
- ✅ Rate limiting
- ✅ Security audit
- ✅ Documentation

---

## Conclusion

This architecture provides:
- **Channel-agnostic agent** that works across WhatsApp, Telegram, Discord, etc.
- **Easy extensibility** for new channels (implement adapter interface)
- **Easy extensibility** for new capabilities (create tool class)
- **Clean separation** between transport, business logic, and data
- **Testability** at every layer
- **Maintainability** through clear patterns

**Key Insight from OpenClaw:** By abstracting channels and creating a common message processing pipeline with pluggable tools, you build once and deploy everywhere. New channels and features become additive, not disruptive.

---

**Ready to implement?** Start with Phase 1 (foundation) and build incrementally. Each phase delivers working functionality while maintaining the clean architecture.
