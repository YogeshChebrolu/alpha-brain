# WhatsApp Integration Technical Documentation

## Overview

Alpha Brain's WhatsApp integration enables users to interact with the application via WhatsApp messaging. This document covers the architecture, implementation details, and how the system works.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Phone                              │
│                     (WhatsApp Client)                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ WhatsApp Multi-Device Protocol
                          │ (WebSocket + Signal Protocol)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp Gateway                              │
│                   (Express + Baileys)                            │
│                     Port: 3001                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Connection Manager                                       │    │
│  │  - Per-user socket management                            │    │
│  │  - Auto-reconnection with exponential backoff            │    │
│  │  - Credential persistence                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Message Handler                                          │    │
│  │  - Echo responses (MVP)                                  │    │
│  │  - Command processing (/help, /status, /ping)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP API
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application                           │
│                       Port: 3000                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Routes (/api/whatsapp/*)                            │    │
│  │  - initiate-pairing                                      │    │
│  │  - status                                                │    │
│  │  - pairing-status/[sessionId]                            │    │
│  │  - disconnect                                            │    │
│  │  - logout                                                │    │
│  │  - send                                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Frontend UI (/settings/whatsapp)                        │    │
│  │  - QR Code display                                       │    │
│  │  - Link Code entry                                       │    │
│  │  - Connection status                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase                                   │
│  - whatsapp_connections table                                   │
│  - whatsapp_messages table                                      │
│  - notification_preferences (extended)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Gateway Server | Express.js + TypeScript | HTTP API for WhatsApp operations |
| WhatsApp Client | Baileys | WhatsApp Multi-Device protocol implementation |
| WebSocket Server | ws | Real-time event streaming to frontend |
| Frontend | Next.js + React | User interface for connection management |
| Database | Supabase (PostgreSQL) | Connection state and message history |
| Auth Storage | File system | WhatsApp credentials per user |

## Key Components

### 1. Gateway Server (`gateway/src/server.ts`)

The gateway is a standalone Express server that manages WhatsApp connections:

```typescript
// Endpoints
POST /api/pairing/initiate     // Start QR code or link code pairing
GET  /api/pairing/:sessionId/status  // Poll pairing session status
POST /api/send                 // Send a message
GET  /api/connection/:userId/status  // Get connection status
POST /api/connection/:userId/disconnect  // Disconnect (keep credentials)
POST /api/connection/:userId/logout      // Logout (clear credentials)

// WebSocket
ws://localhost:3001/ws?userId=<userId>  // Real-time events
```

### 2. Connection Manager (`gateway/src/connection-manager.ts`)

Manages multiple WhatsApp connections (one per user):

**Key Features:**
- **Per-user isolation**: Each user has their own WhatsApp socket
- **Auto-reconnection**: Exponential backoff with jitter (2s initial, 30s max)
- **Credential restoration**: Reconnects on server restart using stored credentials
- **Event emission**: Broadcasts connection and message events

**Auto-Reconnection Algorithm:**
```typescript
private scheduleReconnect(userId: string): void {
  const connection = this.connections.get(userId)
  if (!connection || connection.reconnectAttempts >= this.maxReconnectAttempts) return

  // Exponential backoff: 2s, 4s, 8s, 16s, 30s (capped)
  const baseDelay = 2000
  const maxDelay = 30000
  const delay = Math.min(baseDelay * Math.pow(2, connection.reconnectAttempts), maxDelay)

  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5)
  const finalDelay = delay + jitter

  setTimeout(() => this.reconnect(userId), finalDelay)
  connection.reconnectAttempts++
}
```

**Server Restart Restoration:**
```typescript
// On startup, restore connections from stored credentials
async restoreConnections(): Promise<void> {
  const storedUsers = await this.authStorage.listStoredUsers()
  for (const userId of storedUsers) {
    await this.reconnect(userId)  // Creates connection record if missing
  }
}
```

**Connection States:**
```
pending → qr_generated → connecting → connected
                ↓                        ↓
          link_code_generated      disconnected → (reconnect)
                                        ↓
                                   logged_out
```

### 3. Auth Storage (`gateway/src/auth-storage.ts`)

Persists WhatsApp credentials to disk:

```
gateway/.whatsapp-auth/
└── user-<userId>/
    ├── creds.json           # Authentication credentials
    └── app-state-sync-key-*.json  # Signal Protocol keys
```

### 4. Socket Factory (`gateway/src/socket-factory.ts`)

Creates configured Baileys WhatsApp sockets:

```typescript
const sock = makeWASocket({
  version,
  auth: { creds, keys },
  printQRInTerminal: false,
  browser: ['Alpha Brain', 'Web', '1.0.0'],
  syncFullHistory: false,
  markOnlineOnConnect: false,
})
```

### 5. Message Handler (`gateway/src/message-handler.ts`)

Processes incoming messages:

**MVP Echo Handler:**
- Responds to "hi", "hello", "hey" with "Hi how are you doing"

**Command Handler:**
- `/help` - Show available commands
- `/status` - Check connection status
- `/ping` - Test bot responsiveness

```typescript
// Key implementation - preserving JID format for replies
return async (message: InboundMessage) => {
  const { userId, from, fromJid, body, isGroup } = message

  if (normalizedBody === 'hi' || normalizedBody === 'hello' || normalizedBody === 'hey') {
    // Use fromJid (original JID) for replying - handles both @s.whatsapp.net and @lid
    const result = await connectionManager.sendMessage(userId, fromJid, 'Hi how are you doing')
  }
}
```

### 6. Next.js API Routes (`app/api/whatsapp/`)

Proxy routes that handle authentication and forward requests to the gateway:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/whatsapp/initiate-pairing` | POST | Start QR/link code pairing |
| `/api/whatsapp/pairing-status/[sessionId]` | GET | Poll pairing session |
| `/api/whatsapp/status` | GET | Get connection status |
| `/api/whatsapp/disconnect` | POST | Disconnect (keep creds) |
| `/api/whatsapp/logout` | POST | Logout (clear creds) |
| `/api/whatsapp/send` | POST | Send a message |

### 7. Frontend UI (`app/(dashboard)/settings/whatsapp/page.tsx`)

React component with multi-step pairing flow:

**Steps:**
1. `method` - Choose QR code or link code pairing
2. `phone` - Enter phone number (link code only)
3. `pairing` - Display QR code or enter 8-digit code
4. `connected` - Show connection status and management options

```typescript
// Polling with fallback connection check
const pollPairingStatus = async () => {
  const data = await fetch(`/api/whatsapp/pairing-status/${session.sessionId}`)

  // Check connection status first - takes priority over expiry
  if (data.status === 'connected') {
    await checkConnectionStatus()
    return
  }

  // Before showing expired, do one final connection check
  if (new Date(data.expiresAt) < new Date()) {
    const statusData = await fetch('/api/whatsapp/status')
    if (statusData.connected) {
      setStep('connected')
      return
    }
    setError('Pairing session expired')
  }
}
```

## WhatsApp Protocol Details

### Baileys Library

Baileys is a TypeScript implementation of the WhatsApp Multi-Device protocol:

1. **Noise Protocol**: Used for initial handshake and key exchange
2. **Signal Protocol**: End-to-end encryption for all messages
3. **WebSocket**: Persistent connection to WhatsApp servers

### JID Formats

WhatsApp uses different JID (Jabber ID) formats:

| Format | Example | Description |
|--------|---------|-------------|
| Phone | `919876543210@s.whatsapp.net` | Traditional phone-based |
| LID | `133010858967262@lid` | Linked ID (newer format) |
| Group | `123456789@g.us` | Group chats |

**Important**: Messages must be replied to using the same JID format they were received with.

### JID Handling Implementation

This was a critical fix - messages received from LID format (`@lid`) must be replied to using the same format:

```typescript
// In connection-manager.ts - normalizeMessage()
const senderJid = isGroup ? (msg.key.participant || remoteJid) : remoteJid

return {
  from: extractPhoneFromJid(senderJid),  // Phone number for display
  fromJid: senderJid,                     // Original JID for replying
}

// In socket-factory.ts - formatPhoneForSending()
export function formatPhoneForSending(phoneOrJid: string): string {
  // If already a full JID (contains @), return as-is
  if (phoneOrJid.includes('@')) {
    return phoneOrJid  // Preserves @lid or @s.whatsapp.net
  }
  // Plain phone number - add @s.whatsapp.net
  return `${cleaned}@s.whatsapp.net`
}
```

### Pairing Methods

**QR Code Pairing:**
1. Gateway generates QR code via Baileys
2. User scans with WhatsApp mobile app
3. Connection established after successful scan

**Link Code Pairing:**
1. User provides phone number
2. Gateway requests 8-digit pairing code from WhatsApp
3. User enters code in WhatsApp mobile app
4. Connection established after code verification

## Database Schema

### whatsapp_connections

```sql
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  phone_number TEXT,              -- E.164 format
  jid TEXT,                       -- WhatsApp JID
  status TEXT NOT NULL DEFAULT 'pending',
  pairing_method TEXT,            -- 'qr_code' or 'link_code'
  pairing_session_id TEXT,
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  device_info JSONB,
  connection_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### whatsapp_messages

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id),
  message_id TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  direction TEXT NOT NULL,        -- 'inbound' or 'outbound'
  message_type TEXT DEFAULT 'text',
  body TEXT,
  message_timestamp TIMESTAMPTZ NOT NULL,
  from_number TEXT,
  to_number TEXT,
  sender_name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### whatsapp_credentials (encrypted storage)

```sql
CREATE TABLE whatsapp_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  encrypted_creds JSONB,           -- AES-256-GCM encrypted creds.json
  encrypted_keys JSONB,            -- AES-256-GCM encrypted Signal keys
  creds_version INTEGER DEFAULT 1,
  key_count INTEGER DEFAULT 0,
  last_restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Encrypted Data Format:**
```json
{
  "iv": "base64-encoded-16-bytes",
  "data": "base64-encoded-ciphertext",
  "authTag": "base64-encoded-16-bytes",
  "salt": "base64-encoded-32-bytes"
}
```

### notification_preferences (extended)

```sql
ALTER TABLE notification_preferences ADD COLUMN whatsapp_connected BOOLEAN;
ALTER TABLE notification_preferences ADD COLUMN whatsapp_action_reminders BOOLEAN;
ALTER TABLE notification_preferences ADD COLUMN whatsapp_portfolio_updates BOOLEAN;
ALTER TABLE notification_preferences ADD COLUMN whatsapp_daily_summary BOOLEAN;
```

## API Flow Examples

### Pairing Flow

```
Frontend                  Next.js API              Gateway
   │                          │                       │
   │ POST /initiate-pairing   │                       │
   │─────────────────────────>│                       │
   │                          │ POST /pairing/initiate│
   │                          │──────────────────────>│
   │                          │                       │ Create socket
   │                          │                       │ Generate QR
   │                          │<──────────────────────│
   │                          │ { sessionId, qrCode } │
   │<─────────────────────────│                       │
   │                          │                       │
   │ Poll /pairing-status     │                       │
   │─────────────────────────>│                       │
   │          ...             │          ...          │
   │                          │                       │
   │                          │ { status: connected } │
   │<─────────────────────────│                       │
```

### Message Flow

```
WhatsApp                  Gateway              Message Handler
   │                         │                       │
   │ messages.upsert event   │                       │
   │────────────────────────>│                       │
   │                         │ normalizeMessage()    │
   │                         │──────────────────────>│
   │                         │                       │ Process "Hi"
   │                         │                       │ Generate response
   │                         │<──────────────────────│
   │                         │ sendMessage()         │
   │<────────────────────────│                       │
   │ "Hi how are you doing"  │                       │
```

## Running the Integration

### Development

```bash
# Install dependencies
bun install
bun run gateway:install

# Run both services
bun run dev:all
```

### Environment Variables

```env
# Gateway Configuration
GATEWAY_PORT=3001
GATEWAY_HOST=0.0.0.0
GATEWAY_API_KEY=development-key
LOG_LEVEL=info

# Auth Storage Configuration
# Options: 'file' (default) or 'supabase'
# If Supabase env vars are set, defaults to 'supabase'
AUTH_STORAGE_TYPE=supabase

# File-based storage (development only)
WHATSAPP_AUTH_PATH=./.whatsapp-auth

# Supabase storage (production recommended)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption key for credentials (REQUIRED for production)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
WHATSAPP_ENCRYPTION_KEY=your-base64-encoded-32-byte-key
```

**Storage Options:**

| Option | Use Case | Persistence | Multi-Instance |
|--------|----------|-------------|----------------|
| `file` | Development | Local files | No |
| `supabase` | Production | PostgreSQL | Yes |


### Scripts

| Script | Description |
|--------|-------------|
| `bun run dev:all` | Run Next.js + Gateway concurrently |
| `bun run dev:gateway` | Run gateway only |
| `bun run gateway:install` | Install gateway dependencies |
| `bun run build` | Build both Next.js and gateway |

## Troubleshooting

### Common Issues

**1. "Not connected" error on message send**
- Cause: Message processed before connection fully established
- Solution: Gateway now creates connection record before socket initialization

**2. "Pairing session expired" but phone shows connected**
- Cause: Frontend polling didn't detect connection in time
- Solution: Added fallback connection status check before showing expiry error

**3. Connection not restored on restart**
- Cause: `reconnect()` returned early if no connection in memory
- Solution: Now creates connection record from stored credentials

**4. Reply not received (LID format)**
- Cause: Sending to wrong JID format (`@s.whatsapp.net` instead of `@lid`)
- Solution: Preserve original `fromJid` and use it for replies

### Debugging

Check gateway logs for:
```
INFO: Connected to WhatsApp
INFO: Message received
INFO: Processing message
INFO: Response sent successfully
```

## WebSocket Events

The gateway emits real-time events via WebSocket for frontend integration:

| Event Type | Payload | Description |
|------------|---------|-------------|
| `connection:connected` | `{ phoneNumber, jid }` | Successfully connected |
| `connection:disconnected` | `{ reason }` | Connection lost |
| `connection:qr` | `{ qr, qrImage }` | New QR code generated |
| `connection:linkCode` | `{ code }` | Link code generated |
| `message:received` | `{ from, body, timestamp }` | Incoming message |
| `message:sent` | `{ to, messageId }` | Outgoing message confirmed |

**WebSocket Connection:**
```typescript
const ws = new WebSocket(`ws://localhost:3001/ws?userId=${userId}`)
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data)
  // Handle events...
}
```

## Gateway Client Helper (`lib/helpers/whatsapp.ts`)

Helper functions for Next.js API routes to communicate with the gateway:

```typescript
const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:3001'

export async function initiatePairing(params: InitiatePairingParams) {
  const response = await fetch(`${GATEWAY_URL}/api/pairing/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return response.json()
}

export async function getConnectionStatus(userId: string) {
  const response = await fetch(`${GATEWAY_URL}/api/connection/${userId}/status`)
  return response.json()
}

export async function sendMessage(userId: string, to: string, message: string) {
  const response = await fetch(`${GATEWAY_URL}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, to, message }),
  })
  return response.json()
}
```

## Security Considerations

1. **Credential Storage**: WhatsApp credentials stored locally in `.whatsapp-auth/`
2. **Git Ignored**: Auth directory excluded from version control
3. **Row Level Security**: Database tables protected by user-specific RLS policies
4. **API Key**: Gateway can require API key for non-development environments

## TypeScript Interfaces

### InboundMessage (`gateway/src/types.ts`)

```typescript
export interface InboundMessage {
  id: string
  userId: string
  from: string          // Phone number extracted from JID
  fromJid: string       // Original JID for replying (preserves @lid or @s.whatsapp.net)
  fromName?: string     // Sender's push name
  body: string
  timestamp: Date
  isGroup: boolean
  groupId?: string
  groupName?: string
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker'
  mediaUrl?: string
  quotedMessageId?: string
  quotedMessage?: string
}
```

### ConnectionStatus

```typescript
export type ConnectionStatus =
  | 'pending'
  | 'qr_generated'
  | 'link_code_generated'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'logged_out'
  | 'error'
```

## Testing the Integration

### Manual Testing Steps

1. **Start the services:**
   ```bash
   bun run dev:all
   ```

2. **Navigate to WhatsApp settings:**
   - Go to `http://localhost:3000/settings/whatsapp`
   - Choose QR code or link code pairing

3. **Pair your device:**
   - Scan QR code with WhatsApp mobile app, or
   - Enter phone number and use the 8-digit link code

4. **Test echo response:**
   - Send "hi", "hello", or "hey" from another WhatsApp account
   - Verify response: "Hi how are you doing"

5. **Test commands:**
   - `/help` - Shows available commands
   - `/status` - Shows connection status
   - `/ping` - Returns "Pong! Alpha Brain is active."

### Verifying in Gateway Logs

```
INFO: Connected to WhatsApp
INFO: Message received { from: "919876543210", body: "hi" }
INFO: Processing message { fromJid: "133010858967262@lid" }
INFO: Matched greeting, sending response
INFO: Response sent successfully { messageId: "..." }
```

## Future Enhancements

1. **Full AI Agent Integration**: Process messages through AI for intelligent responses
2. **Database Message Logging**: Store all messages for analytics
3. **Webhook Support**: Notify external services of events
4. **Multi-Channel Abstraction**: Unified interface for WhatsApp, Telegram, etc.
5. **Rate Limiting**: Prevent abuse and respect WhatsApp limits
6. **Media Support**: Handle images, documents, and other media types

## File Structure

```
alpha-brain/
├── gateway/
│   ├── src/
│   │   ├── server.ts           # Express + WebSocket server
│   │   ├── connection-manager.ts  # Multi-user connection handling
│   │   ├── socket-factory.ts   # Baileys socket creation
│   │   ├── auth-storage.ts     # Credential persistence
│   │   ├── message-handler.ts  # Message processing
│   │   └── types.ts            # TypeScript interfaces
│   ├── .whatsapp-auth/         # Per-user credentials (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── app/
│   ├── api/whatsapp/
│   │   ├── initiate-pairing/route.ts
│   │   ├── status/route.ts
│   │   ├── pairing-status/[sessionId]/route.ts
│   │   ├── disconnect/route.ts
│   │   ├── logout/route.ts
│   │   └── send/route.ts
│   └── (dashboard)/settings/whatsapp/page.tsx
├── lib/helpers/whatsapp.ts     # Gateway client helpers
└── supabase/migrations/
    └── 20260511000001_whatsapp_integration.sql
```
