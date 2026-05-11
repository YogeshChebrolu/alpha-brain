Perfect! Let me read the documentation you've created and then plan out the WhatsApp integration in great detail.

Now let me create a comprehensive plan for implementing WhatsApp login + auth with multi-user support in Alpha-Brain.

---

## **WhatsApp Integration Plan for Alpha-Brain: Detailed Design**

### **Key Architectural Difference from OpenClaw**

**OpenClaw**: Single-user personal assistant
- One gateway process
- One WhatsApp connection (one phone number)
- All messages go to one agent

**Alpha-Brain**: Multi-user SaaS application
- Multiple users, each with their own WhatsApp
- Each user connects their own number
- Need to manage multiple concurrent Baileys sockets
- Need per-user isolation and security

---

## **1. Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                  Alpha-Brain Next.js App                     │
│                  (Frontend + API Routes)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/WebSocket
                     │
┌────────────────────▼────────────────────────────────────────┐
│            WhatsApp Gateway Service                          │
│            (Separate Node.js Process)                        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Connection Manager                             │        │
│  │  - Per-user socket registry                    │        │
│  │  - Lifecycle management                        │        │
│  │  - Health monitoring                           │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ User A     │  │ User B     │  │ User C     │          │
│  │ Socket     │  │ Socket     │  │ Socket     │   ...    │
│  │ (Baileys)  │  │ (Baileys)  │  │ (Baileys)  │          │
│  └────────────┘  └────────────┘  └────────────┘          │
└──────────────────────────────────────────────────────────────┘
                     │
                     │ WhatsApp Protocol
                     │
           ┌─────────▼─────────┐
           │ WhatsApp Servers  │
           └───────────────────┘
```

---

## **2. Database Schema Design**

### **2.1 Core Tables**

```sql
-- WhatsApp connection credentials and state
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Connection identity
  phone_number TEXT, -- E.164 format (+1234567890)
  jid TEXT, -- WhatsApp JID (unique identifier)
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending | qr_generated | linking | connected | disconnected | logged_out | error
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  
  -- Pairing methods
  pairing_method TEXT, -- 'qr_code' | 'link_code'
  qr_code TEXT, -- Base64 QR code for scanning
  qr_code_generated_at TIMESTAMPTZ,
  qr_code_expires_at TIMESTAMPTZ,
  link_code TEXT, -- 8-digit alphanumeric code
  link_code_generated_at TIMESTAMPTZ,
  link_code_expires_at TIMESTAMPTZ,
  
  -- Credentials storage path
  auth_dir_path TEXT, -- Path to auth credentials on disk
  
  -- Metadata
  device_info JSONB, -- Browser/device info shown in WhatsApp
  connection_metadata JSONB, -- Any additional connection data
  
  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id), -- One WhatsApp connection per user
  CHECK (status IN ('pending', 'qr_generated', 'linking', 'connected', 'disconnected', 'logged_out', 'error'))
);

-- Message history (for debugging and analytics)
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  
  -- Message identity
  message_id TEXT NOT NULL, -- WhatsApp message ID
  remote_jid TEXT NOT NULL, -- Chat/sender JID
  
  -- Direction
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'
  
  -- Content
  message_type TEXT NOT NULL, -- 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact'
  body TEXT,
  media_url TEXT, -- If media, URL to stored file
  media_mimetype TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  from_number TEXT,
  to_number TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  group_id TEXT,
  sender_name TEXT,
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (direction IN ('inbound', 'outbound'))
);

-- Connection health tracking
CREATE TABLE whatsapp_connection_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  
  -- Health metrics
  status_code INTEGER, -- HTTP-like status codes (200, 440, 499, etc.)
  health_state TEXT, -- 'healthy' | 'logged-out' | 'conflict' | 'reconnecting' | 'failed'
  
  -- Reconnection tracking
  reconnect_attempts INTEGER DEFAULT 0,
  last_reconnect_at TIMESTAMPTZ,
  
  -- Activity tracking
  last_inbound_message_at TIMESTAMPTZ,
  last_outbound_message_at TIMESTAMPTZ,
  last_transport_activity_at TIMESTAMPTZ,
  
  -- Error details
  error_message TEXT,
  error_details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE whatsapp_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What to send
  action_reminders BOOLEAN DEFAULT TRUE,
  portfolio_updates BOOLEAN DEFAULT TRUE,
  daily_summary BOOLEAN DEFAULT FALSE,
  
  -- When to send
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX idx_whatsapp_connections_status ON whatsapp_connections(status);
CREATE INDEX idx_whatsapp_messages_connection_id ON whatsapp_messages(whatsapp_connection_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX idx_whatsapp_connection_health_connection_id ON whatsapp_connection_health(whatsapp_connection_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_connection_health_updated_at
  BEFORE UPDATE ON whatsapp_connection_health
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## **3. WhatsApp Gateway Service Architecture**

### **3.1 Service Structure**

```
whatsapp-gateway/
├── src/
│   ├── server.ts                 # Main HTTP/WS server
│   ├── connection-manager.ts     # Manages all user sockets
│   ├── socket-factory.ts         # Creates Baileys sockets
│   ├── auth-storage.ts           # Credentials management
│   ├── message-handler.ts        # Inbound message processing
│   ├── message-sender.ts         # Outbound message sending
│   ├── health-monitor.ts         # Connection health tracking
│   ├── reconnect-manager.ts      # Reconnection logic
│   ├── event-emitter.ts          # Internal event bus
│   └── types.ts                  # TypeScript types
├── package.json
├── tsconfig.json
└── Dockerfile
```

### **3.2 Connection Manager (Core Component)**

**Responsibilities:**
- Maintain a registry of active sockets: `Map<userId, BaileysSocket>`
- Handle socket lifecycle (create, connect, disconnect, cleanup)
- Monitor health of each connection
- Trigger reconnections when needed
- Isolate users from each other

**Key Methods:**
```typescript
class ConnectionManager {
  private connections: Map<string, UserConnection>
  
  // Pairing methods
  async initiatePairing(userId: string, method: 'qr' | 'link'): Promise<PairingData>
  async waitForPairing(userId: string): Promise<ConnectionResult>
  
  // Lifecycle
  async connectUser(userId: string): Promise<void>
  async disconnectUser(userId: string): Promise<void>
  async getConnection(userId: string): Promise<UserConnection | null>
  
  // Health
  async checkHealth(userId: string): Promise<HealthStatus>
  async reconnectUser(userId: string): Promise<void>
  
  // Messaging
  async sendMessage(userId: string, to: string, message: Message): Promise<SendResult>
  
  // Event subscriptions
  on(event: string, callback: Function): void
}
```

---

## **4. Authentication Flow Design**

### **4.1 QR Code Pairing Flow**

```
User Action                  Frontend                  Backend API               WhatsApp Gateway          Supabase
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

1. Click \"Connect            →                         →                         →
   WhatsApp\"

2.                           POST /api/whatsapp/       Check if user             Create socket
                             initiate-pairing          already connected ────────→ Call makeWASocket
                                                                                   with QR callback
                             
3.                           ← Return session_id       ← Insert record           ← Socket created
                                                         with status='pending'
                                                         
4. Open WebSocket            WS /api/whatsapp/         Forward events
   connection for            pairing-status?           to client
   real-time updates         session={id}
   
5.                                                                                QR event fired
                                                                                  by Baileys
                                                                                  
6.                           ← QR code data            ← Update DB with QR        ← Emit 'qr' event
                             (Base64 image)              status='qr_generated'      to API
                             
7. Display QR code
   on screen
   
8. User scans QR                                                                  Baileys receives
   with WhatsApp                                                                  pairing confirmation
   
9.                                                                                'creds.update' event
                                                                                  Save credentials
                                                                                  to disk
                                                                                  
10.                                                                               'connection.update'
                                                                                  connection='open'
                                                                                  
11.                          ← \"Connected!\"            ← Update DB               ← Emit 'connected'
                             status update               status='connected'        event
                                                        phone_number, jid
                                                        
12. Redirect to              ✓ Connection              ✓ Start health            Socket active
    dashboard                 established               monitoring                and listening
```

### **4.2 Link Code Pairing Flow**

```
User Action                  Frontend                  Backend API               WhatsApp Gateway          WhatsApp
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

1. Click \"Use                →                         →                         →
   Link Code\"

2.                           POST /api/whatsapp/       Check user                Create socket with
                             initiate-link-pairing     authorization             requestPairingCode: true
                                                                                  
3.                           ← Return 8-digit code     ← Insert record           ← Baileys generates
                             \"AB12-CD34\"                 status='qr_generated'     pairing code
                             
4. Display code
   on screen with
   instructions
   
5. User opens WhatsApp                                                           [User opens WhatsApp]
   → Settings                                                                     → Linked Devices
   → Linked Devices                                                              → Link a Device
   → Link a Device                                                               → Link with phone number
   → Link with phone                                                             → Enter code
     number
   → Enter code
   
6.                                                                                Pairing request
                                                                                  received by Baileys
                                                                                  
7.                           ← \"Linking...\"            ← Update status           ← 'pairing-code' event
                             status update               ='linking'
                             
8.                                                                                'creds.update' event
                                                                                  Save credentials
                                                                                  
9.                           ← \"Connected!\"            ← Update status           ← 'connection.update'
                             ✓                           ='connected'              connection='open'
                             
10. Redirect to              Connection                Health monitoring         Socket active
    dashboard                established               started
```

---

## **5. API Routes Design**

### **5.1 Pairing Endpoints**

**POST `/api/whatsapp/initiate-pairing`**
```typescript
Request:
{
  method: 'qr_code' | 'link_code'
}

Response:
{
  session_id: string // UUID for tracking this pairing attempt
  status: 'pending'
  method: 'qr_code' | 'link_code'
  link_code?: string // Only if method='link_code'
  expires_at: string // ISO timestamp
}
```

**WebSocket `/api/whatsapp/pairing-status`**
```typescript
// Client subscribes to pairing events
Events:
- 'qr_generated': { qr_code: string (base64) }
- 'qr_expired': { message: string }
- 'linking': { message: string }
- 'connected': { phone_number: string, jid: string }
- 'error': { error: string }
```

**POST `/api/whatsapp/disconnect`**
```typescript
Response:
{
  success: boolean
  message: string
}
```

**GET `/api/whatsapp/status`**
```typescript
Response:
{
  connected: boolean
  phone_number?: string
  last_connected_at?: string
  status: 'connected' | 'disconnected' | 'error'
  health?: {
    last_inbound_at: string
    reconnect_attempts: number
  }
}
```

### **5.2 Messaging Endpoints**

**POST `/api/whatsapp/send`**
```typescript
Request:
{
  to: string // Phone number or JID
  message: string
}

Response:
{
  message_id: string
  sent_at: string
}
```

---

## **6. Frontend Flow Design**

### **6.1 Connect WhatsApp Page (`/dashboard/settings/whatsapp`)**

**UI Components:**

```
┌──────────────────────────────────────────────────────────────┐
│  Connect Your WhatsApp                                       │
│                                                              │
│  Choose a pairing method:                                    │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │  QR Code           │  │  Link Code         │           │
│  │  ▢                 │  │  ▢                 │           │
│  │  Scan QR code with │  │  Enter 8-digit     │           │
│  │  your phone        │  │  code in WhatsApp  │           │
│  │  ✓ Fastest         │  │  ✓ No camera needed│           │
│  └────────────────────┘  └────────────────────┘           │
│                                                              │
│  [Continue]                                                  │
└──────────────────────────────────────────────────────────────┘
```

**QR Code Screen:**
```
┌──────────────────────────────────────────────────────────────┐
│  Scan QR Code                                                │
│                                                              │
│  ┌────────────────────┐                                     │
│  │                    │                                     │
│  │   QR CODE HERE     │  1. Open WhatsApp on your phone    │
│  │                    │  2. Tap Menu (⋮) → Linked Devices  │
│  │                    │  3. Tap \"Link a Device\"            │
│  └────────────────────┘  4. Scan this QR code              │
│                                                              │
│  ⏱ Expires in: 45s                                          │
│                                                              │
│  [Refresh QR Code]    [Use Link Code Instead]              │
└──────────────────────────────────────────────────────────────┘
```

**Link Code Screen:**
```
┌──────────────────────────────────────────────────────────────┐
│  Enter Link Code                                             │
│                                                              │
│  Your code:                                                  │
│                                                              │
│  ┌─────────────────────────────────────┐                   │
│  │         AB12-CD34                   │                   │
│  │         [Copy Code]                 │                   │
│  └─────────────────────────────────────┘                   │
│                                                              │
│  How to link:                                               │
│  1. Open WhatsApp on your phone                            │
│  2. Tap Menu (⋮) → Linked Devices                          │
│  3. Tap \"Link a Device\"                                    │
│  4. Tap \"Link with phone number instead\"                   │
│  5. Enter the code above                                   │
│                                                              │
│  ⏱ Expires in: 2m 30s                                       │
│                                                              │
│  Status: Waiting for you to enter code...                  │
│                                                              │
│  [Refresh Code]    [Use QR Code Instead]                   │
└──────────────────────────────────────────────────────────────┘
```

**Connected Screen:**
```
┌──────────────────────────────────────────────────────────────┐
│  ✓ WhatsApp Connected                                        │
│                                                              │
│  Connected as: +1 (555) 123-4567                            │
│  Connected at: May 11, 2026, 3:45 PM                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Test Connection                                       │ │
│  │                                                        │ │
│  │  Send a test message to verify your connection:       │ │
│  │                                                        │ │
│  │  [Send Test Message]                                  │ │
│  │                                                        │ │
│  │  ✓ Test message sent! Check your WhatsApp.           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Disconnect WhatsApp]                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## **7. Gateway Service Implementation Details**

### **7.1 Socket Factory (`socket-factory.ts`)**

**Purpose:** Create and configure Baileys sockets for each user

**Key Responsibilities:**
- Load user credentials from disk
- Configure socket with user-specific settings
- Register event listeners
- Handle credentials persistence

```typescript
interface SocketConfig {
  userId: string
  authDir: string
  onQR?: (qr: string) => void
  onPairingCode?: (code: string) => void
  onCredsUpdate?: () => void
  onConnectionUpdate?: (update: ConnectionUpdate) => void
}

async function createUserSocket(config: SocketConfig): Promise<BaileysSocket> {
  // 1. Load auth state from disk
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir)
  
  // 2. Get Baileys version
  const { version } = await fetchLatestBaileysVersion()
  
  // 3. Create socket
  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ['Alpha Brain', 'Web', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    
    // QR code callback
    ...(config.onQR ? { qr: config.onQR } : {}),
    
    // Link code callback (if supported)
    ...(config.onPairingCode ? { requestPairingCode: true } : {})
  })
  
  // 4. Register event listeners
  sock.ev.on('creds.update', () => {
    saveCreds()
    config.onCredsUpdate?.()
  })
  
  sock.ev.on('connection.update', (update) => {
    config.onConnectionUpdate?.(update)
    
    // Handle QR
    if (update.qr) {
      config.onQR?.(update.qr)
    }
    
    // Handle connection states
    if (update.connection === 'open') {
      // Connected!
    }
    
    if (update.connection === 'close') {
      // Handle disconnect
      const statusCode = getStatusCode(update.lastDisconnect?.error)
      if (statusCode === 401) {
        // Logged out - delete credentials
      }
    }
  })
  
  sock.ev.on('messages.upsert', async ({ messages }) => {
    // Handle inbound messages
  })
  
  return sock
}
```

### **7.2 Auth Storage (`auth-storage.ts`)**

**Purpose:** Manage credentials on disk per user

**Directory Structure:**
```
/var/whatsapp-auth/
├── user-{uuid-1}/
│   ├── creds.json          # Baileys credentials
│   └── keys/               # Signal protocol keys
│       ├── app-state-sync-key-{id}.json
│       └── pre-key-{id}.json
├── user-{uuid-2}/
│   ├── creds.json
│   └── keys/
└── user-{uuid-3}/
    ├── creds.json
    └── keys/
```

**Functions:**
```typescript
function getAuthDirForUser(userId: string): string {
  return `/var/whatsapp-auth/user-${userId}`
}

async function ensureAuthDirExists(userId: string): Promise<string> {
  const authDir = getAuthDirForUser(userId)
  await fs.mkdir(authDir, { recursive: true })
  await fs.mkdir(path.join(authDir, 'keys'), { recursive: true })
  return authDir
}

async function clearUserAuth(userId: string): Promise<void> {
  const authDir = getAuthDirForUser(userId)
  await fs.rm(authDir, { recursive: true, force: true })
}

async function hasExistingAuth(userId: string): Promise<boolean> {
  const authDir = getAuthDirForUser(userId)
  try {
    await fs.access(path.join(authDir, 'creds.json'))
    return true
  } catch {
    return false
  }
}
```

### **7.3 Message Handler (`message-handler.ts`)**

**Purpose:** Process inbound messages and route to appropriate handlers

```typescript
interface InboundMessage {
  userId: string
  messageId: string
  from: string // Phone number or JID
  body: string
  timestamp: Date
  isGroup: boolean
  groupId?: string
  mediaType?: string
  mediaUrl?: string
}

class MessageHandler {
  async handleInbound(message: InboundMessage): Promise<void> {
    // 1. Save to database
    await this.saveMessage(message)
    
    // 2. Check for commands/triggers
    if (this.isCommand(message.body)) {
      await this.handleCommand(message)
      return
    }
    
    // 3. Simple echo test (for MVP)
    if (message.body.toLowerCase().trim() === 'hi') {
      await this.sendResponse(message.userId, message.from, 'Hi how are you doing')
      return
    }
    
    // 4. Future: Route to AI agent, action handlers, etc.
  }
  
  private async sendResponse(userId: string, to: string, message: string): Promise<void> {
    const connection = connectionManager.getConnection(userId)
    if (!connection) {
      throw new Error('User not connected')
    }
    
    await connection.socket.sendMessage(to, { text: message })
  }
}
```

---

## **8. Security Considerations**

### **8.1 Credential Security**

**Risks:**
- Credentials stored on disk could be accessed
- Users could impersonate each other
- Credentials could be stolen

**Mitigations:**
1. **Encryption at Rest**
   - Encrypt `creds.json` with user-specific key
   - Derive encryption key from user ID + app secret
   - Use AES-256-GCM

2. **File Permissions**
   - Auth directories: `700` (owner only)
   - Credential files: `600` (owner read/write only)
   - Run gateway service as dedicated user

3. **Access Control**
   - Every gateway API call requires valid JWT
   - Verify user ID matches requested resource
   - Rate limit pairing attempts

### **8.2 Multi-Tenancy Isolation**

**Risks:**
- User A could access User B's messages
- Socket confusion could route messages incorrectly

**Mitigations:**
1. **Strict User ID Validation**
   ```typescript
   function validateUserAccess(requestUserId: string, resourceUserId: string) {
     if (requestUserId !== resourceUserId) {
       throw new Error('Unauthorized access')
     }
   }
   ```

2. **Socket Registry Isolation**
   - Each socket tagged with user ID
   - Every operation checks user ID match
   - No global message bus

3. **Database Row-Level Security (RLS)**
   ```sql
   -- Only allow users to access their own connections
   CREATE POLICY whatsapp_connections_policy ON whatsapp_connections
     FOR ALL
     USING (auth.uid() = user_id);
   
   -- Only allow users to access their own messages
   CREATE POLICY whatsapp_messages_policy ON whatsapp_messages
     FOR ALL
     USING (
       auth.uid() = (
         SELECT user_id FROM whatsapp_connections 
         WHERE id = whatsapp_connection_id
       )
     );
   ```

### **8.3 WhatsApp Ban Prevention**

**Risks:**
- High message volume
- Automated patterns
- Server IP detection

**Mitigations:**
1. **Rate Limiting**
   - Max 100 messages per user per hour
   - Max 1000 messages per day
   - Exponential backoff on failures

2. **Human-Like Patterns**
   - Add random delays (1-3s) between messages
   - Vary typing indicators
   - Don't operate 24/7 (respect quiet hours)

3. **Connection Best Practices**
   - Don't reconnect immediately on disconnect
   - Use exponential backoff (2s, 4s, 8s, 16s, 30s max)
   - Max 12 reconnect attempts

4. **User Education**
   - Show warning about ban risks
   - Recommend dedicated number if possible
   - Warn against spammy behavior

---

## **9. Error Handling & Edge Cases**

### **9.1 Pairing Failures**

| Scenario | Detection | Handling |
|----------|-----------|----------|
| QR code expires | Timeout (60s) | Generate new QR, notify frontend |
| User scans wrong QR | Invalid credentials event | Show error, regenerate QR |
| Network failure during pairing | Socket timeout | Retry with backoff, show error |
| User cancels pairing | No connection after 5min | Clean up session, allow retry |
| Link code incorrect | Baileys error event | Show error, regenerate code |

### **9.2 Connection Issues**

| Scenario | Detection | Handling |
|----------|-----------|----------|
| WhatsApp logged out (401) | `connection.update` status 401 | Clear credentials, notify user to re-pair |
| Session conflict (440) | Status 440 | Notify user another device is active, offer disconnect |
| Network disconnect | Socket close event | Auto-reconnect with backoff |
| Watchdog timeout | No activity for 5 minutes | Force close, reconnect |
| Server restart | Process signal | Gracefully close all sockets, save state |

### **9.3 Message Delivery Failures**

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Recipient doesn't exist | Baileys error | Return error to caller |
| Socket disconnected | No active socket | Queue message, retry after reconnect (max 3 attempts) |
| Rate limit hit | Error response | Return 429, ask user to wait |
| Media too large | File size check | Reject before sending, show error |

---

## **10. Testing Strategy**

### **10.1 Test: Simple Echo (Hi → Hi how are you doing)**

**Setup:**
1. User A pairs their WhatsApp
2. Connection established
3. Message handler active

**Test Flow:**
```
1. User A sends \"Hi\" from their WhatsApp to themselves (self-chat mode)
2. Gateway receives message via Baileys
3. Message handler detects body === \"hi\" (case-insensitive)
4. Gateway sends reply: \"Hi how are you doing\"
5. User A receives reply in WhatsApp
```

**Success Criteria:**
- ✓ Message received within 2 seconds
- ✓ Reply is exactly \"Hi how are you doing\"
- ✓ Message appears in user's WhatsApp chat
- ✓ Database logs both messages (inbound + outbound)

### **10.2 Test: Multi-User Isolation**

**Setup:**
1. User A and User B both pair WhatsApp
2. Both have active sockets

**Test Flow:**
```
1. User A sends \"Hi\" → receives \"Hi how are you doing\" ✓
2. User B sends \"Hi\" → receives \"Hi how are you doing\" ✓
3. Verify User A doesn't receive User B's messages
4. Verify User B doesn't receive User A's messages
```

### **10.3 Test: Reconnection**

**Setup:**
1. User A connected
2. Simulate network failure

**Test Flow:**
```
1. Force close socket
2. Gateway detects disconnect
3. Reconnection logic triggers
4. Socket reconnects with existing credentials
5. User A sends \"Hi\" → still works ✓
```

### **10.4 Test: QR Expiry & Regeneration**

**Setup:**
1. User starts pairing with QR

**Test Flow:**
```
1. QR generated, displayed for 60 seconds
2. User doesn't scan
3. QR expires, frontend notified
4. User clicks \"Refresh QR Code\"
5. New QR generated ✓
6. User scans new QR → connects ✓
```

---

## **11. Deployment Considerations**

### **11.1 Gateway Service Deployment**

**Options:**

**Option A: Separate Service (Recommended)**
- Dedicated Node.js process
- Run on same server or separate container
- Communicate via HTTP/WebSocket
- Can scale independently

**Option B: Next.js API Route**
- Run in Next.js serverless functions
- ⚠️ Problem: Stateful connections don't work in serverless
- ❌ Not recommended for Baileys

**Recommendation:** Use **Option A** with Docker

```dockerfile
# Dockerfile for WhatsApp Gateway
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create auth directory
RUN mkdir -p /var/whatsapp-auth && chmod 700 /var/whatsapp-auth

EXPOSE 3001

CMD [\"node\", \"dist/server.js\"]
```

### **11.2 Process Management**

**Use PM2 for reliability:**
```bash
pm2 start dist/server.js --name whatsapp-gateway --instances 1 --max-memory-restart 500M
```

**Why single instance?**
- Baileys sockets are stateful
- Can't load balance across multiple processes
- Each process needs its own auth storage

**Scaling strategy:**
- Vertical scaling (more RAM/CPU)
- If needed: Shard users across multiple gateway instances
  - Gateway 1: Users A-M
  - Gateway 2: Users N-Z

---

## **12. Monitoring & Observability**

### **12.1 Metrics to Track**

**Connection Metrics:**
- Active connections count
- Connection success rate
- Average pairing time
- Reconnection frequency
- Error rate by type

**Message Metrics:**
- Messages sent per minute
- Messages received per minute
- Message delivery success rate
- Average response time
- Queue depth (if implementing queue)

**Health Metrics:**
- Socket uptime
- Memory usage per socket
- CPU usage
- Auth directory size

### **12.2 Logging Strategy**

```typescript
// Structured logging with correlation IDs
logger.info({
  event: 'message_received',
  user_id: userId,
  message_id: messageId,
  from: redactPhoneNumber(from),
  body_length: body.length,
  timestamp: Date.now()
})

logger.info({
  event: 'message_sent',
  user_id: userId,
  to: redactPhoneNumber(to),
  message_id: sentMessageId,
  latency_ms: Date.now() - startTime
})

logger.error({
  event: 'connection_failed',
  user_id: userId,
  error: error.message,
  status_code: statusCode,
  reconnect_attempt: attempt
})
```

---

## **13. Rollout Plan**

### **Phase 1: Foundation (Week 1)**
- Set up database tables
- Create gateway service scaffolding
- Implement socket factory
- Implement auth storage

### **Phase 2: Pairing (Week 1-2)**
- Implement QR code pairing
- Implement link code pairing
- Build frontend pairing UI
- Test pairing flow end-to-end

### **Phase 3: Messaging (Week 2)**
- Implement message handler
- Implement simple echo (\"Hi\" → \"Hi how are you doing\")
- Test message delivery
- Test multi-user isolation

### **Phase 4: Stability (Week 3)**
- Implement reconnection logic
- Implement health monitoring
- Add error handling
- Load testing

### **Phase 5: Production (Week 4)**
- Deploy gateway service
- Set up monitoring/alerts
- Documentation
- Beta testing with real users

---

## **14. Open Questions to Decide**

1. **Self-chat vs Dedicated Number?**
   - Allow users to message themselves?
   - Or require dedicated WhatsApp number?
   - **Recommendation:** Allow self-chat for simplicity, warn about limitations

2. **Message Queue?**
   - Queue outbound messages for offline users?
   - Or fail immediately?
   - **Recommendation:** Start with fail-fast, add queue later if needed

3. **Media Handling?**
   - Support sending images, documents, audio?
   - Where to store media files?
   - **Recommendation:** Start with text only, add media in Phase 2

4. **Rate Limiting Strategy?**
   - Per-user limits?
   - Global limits?
   - **Recommendation:** 100 messages/hour per user, 10,000/day globally

5. **Billing Integration?**
   - Charge for WhatsApp feature?
   - Usage-based pricing?
   - **Recommendation:** Free for beta, consider pricing later

---

## **15. MVP Definition**

**Minimum Viable Product:**
- ✅ User can pair WhatsApp via QR code
- ✅ User can pair WhatsApp via link code
- ✅ Connection persists across server restarts
- ✅ User sends \"Hi\" → receives \"Hi how are you doing\"
- ✅ Multi-user: Each user has isolated connection
- ✅ Reconnection works after disconnect
- ✅ Frontend shows connection status
- ✅ Basic error handling (logged out, expired QR, etc.)

**Out of Scope for MVP:**
- ❌ AI agent integration
- ❌ Action reminders
- ❌ Portfolio notifications
- ❌ Media support (images, audio)
- ❌ Group message support
- ❌ Advanced analytics

---

**Ready to proceed?** This plan covers:
✅ Architecture for multi-user SaaS
✅ Database schema
✅ Authentication flows (QR + link code)
✅ Gateway service design
✅ Security & isolation
✅ Error handling
✅ Testing strategy
✅ Deployment approach

Would you like me to:
1. **Dive deeper into any specific section?**
2. **Adjust the architecture based on your preferences?**
3. **Start implementing the code?** (when you're ready)
