# Alert & Notification System - Technical Documentation

> **Last Updated:** 2026-05-09
> **Architecture:** Inngest-based Event-Driven Notification System

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Design](#architecture--design)
3. [How Inngest Works Internally](#how-inngest-works-internally)
4. [Complete Data Flow](#complete-data-flow)
5. [User Flows](#user-flows)
6. [Component Breakdown](#component-breakdown)
7. [File Reference](#file-reference)
8. [Database Schema](#database-schema)
9. [Configuration & Setup](#configuration--setup)
10. [Local Development](#local-development)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

---

## System Overview

### Purpose
The Alert System provides **event-driven, scheduled notifications** for actions and ideas. When users set due dates and enable notifications, the system:
1. Creates alert records in the database
2. Schedules events in Inngest Cloud with exact execution times
3. Executes notification functions at the scheduled time
4. Sends notifications through multiple channels (in-app, WhatsApp, SMS, push)

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Inngest over pg_cron** | Event-driven architecture is more efficient than polling every minute. Inngest provides built-in retries, observability, and doesn't waste resources on empty polls. |
| **No Realtime Subscriptions** | Users don't stay on the app continuously. Fetching on-demand when opening the notification center is more efficient than maintaining WebSocket connections. |
| **Service Role Client** | Background jobs (Inngest functions) need database access without user sessions. Service role bypasses RLS policies safely. |
| **Ngrok for Local Dev** | Enables testing with Inngest Cloud locally without deploying to production. Cloud handles scheduling while functions execute on localhost. |

### Architecture Principles
- **Event-Driven**: Actions trigger events, not polling
- **Scheduled Execution**: Inngest handles time-based triggers precisely
- **Stateless Functions**: Inngest functions are pure, side-effect-based
- **Optimistic UI**: Client updates immediately, syncs later
- **Database-First**: Database is source of truth, not in-memory state

---

## Architecture & Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐        │
│  │  Settings Page   │   │  Actions         │   │ Notification     │        │
│  │                  │   │  Component       │   │ Bell Center      │        │
│  │ - Phone number   │   │                  │   │                  │        │
│  │ - Channel toggles│   │ - Due date       │   │ - Fetch on open  │        │
│  │ - Quiet hours    │   │ - Notify toggle  │   │ - Manual refresh │        │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘        │
│           │                      │                      │                   │
└───────────┼──────────────────────┼──────────────────────┼───────────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NEXT.JS API ROUTES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /api/notifications/preferences  - GET/PUT user notification settings      │
│  /api/notifications              - GET notifications (with user session)   │
│  /api/notifications/[id]/read    - PUT mark notification as read           │
│  /api/notifications/[id]/dismiss - PUT dismiss notification                │
│  /api/inngest                    - POST/PUT/GET Inngest webhook endpoint   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            HELPER FUNCTIONS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  lib/helpers/notifications.ts    - syncActionAlerts() creates DB records   │
│                                    and sends events to Inngest              │
│                                                                             │
│  lib/helpers/actions.ts          - Calls syncActionAlerts() on save        │
│                                                                             │
│  lib/hooks/useNotifications.ts   - React hook for fetching notifications   │
│                                    (removed realtime subscription)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            │                      │
            │                      │
            ├──────────────────────┼───────────────────────────────┐
            │                      │                               │
            ▼                      ▼                               ▼
┌──────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────┐
│  SUPABASE DATABASE   │  │   INNGEST CLIENT        │  │  INNGEST CLOUD       │
├──────────────────────┤  ├─────────────────────────┤  ├──────────────────────┤
│                      │  │                         │  │                      │
│ notification_        │  │ lib/inngest/client.ts   │  │ Events stored in     │
│ preferences          │  │                         │  │ Inngest Cloud        │
│                      │  │ inngest.send({          │  │                      │
│ in_app_notifications │  │   name: 'notification/  │  │ Scheduled execution  │
│                      │  │         send',          │  │ engine               │
│ action_alerts        │  │   data: {...},          │  │                      │
│ idea_alerts          │  │   ts: scheduledTime     │  │ Retry logic          │
│                      │  │ })                      │  │ Observability        │
│                      │  │                         │  │                      │
└──────────────────────┘  └─────────────────────────┘  └──────────┬───────────┘
                                                                   │
                                                                   │ When ts is reached
                                                                   │
                                                                   ▼
                                      ┌─────────────────────────────────────────┐
                                      │   INNGEST FUNCTION (via webhook)        │
                                      ├─────────────────────────────────────────┤
                                      │                                         │
                                      │ lib/inngest/functions/send-             │
                                      │ notification.ts                         │
                                      │                                         │
                                      │ 1. check-alert-status                   │
                                      │    - Verify alert exists & active       │
                                      │                                         │
                                      │ 2. get-preferences                      │
                                      │    - Fetch user notification settings   │
                                      │    - Check quiet hours                  │
                                      │                                         │
                                      │ 3. create-in-app-notification           │
                                      │    - Insert into in_app_notifications   │
                                      │    - Uses Service Role Client           │
                                      │                                         │
                                      │ 4. mark-alert-completed                 │
                                      │    - Update alert.sent_at               │
                                      │    - Set status = 'completed'           │
                                      │                                         │
                                      └─────────────────────────────────────────┘
                                                      │
                                                      │
                                                      ▼
                                      ┌─────────────────────────────────────────┐
                                      │     EXTERNAL SERVICES (Future)          │
                                      ├─────────────────────────────────────────┤
                                      │                                         │
                                      │  Twilio WhatsApp API                    │
                                      │  Twilio SMS API                         │
                                      │  Web Push Notifications                 │
                                      │                                         │
                                      └─────────────────────────────────────────┘
```

### Event Flow Diagram

```
User saves action with due_time & notify=true
         │
         ▼
lib/helpers/actions.ts :: syncActionsToIdea()
         │
         ├─► Save action to database
         │
         └─► lib/helpers/notifications.ts :: syncActionAlerts()
                  │
                  ├─► Delete existing alerts for this action
                  │
                  ├─► Create alert records in action_alerts table
                  │    (one per enabled channel: in_app, whatsapp, etc.)
                  │
                  └─► For each alert:
                       │
                       └─► inngest.send({
                            name: 'notification/send',
                            data: {
                              alertId, userId, title, body, channel, link
                            },
                            ts: dueTime - reminderOffset  // Milliseconds
                          })
                          │
                          └─► Event stored in Inngest Cloud ────┐
                                                                 │
         ┌───────────────────────────────────────────────────────┘
         │ Time passes...
         │ Inngest Cloud waits until ts is reached
         │
         ▼
Inngest Cloud calls: POST https://your-app.vercel.app/api/inngest
         │
         │ (or for local dev: POST https://ngrok-url.app/api/inngest)
         │
         ▼
app/api/inngest/route.ts :: serve() handler
         │
         └─► Executes: lib/inngest/functions/send-notification.ts
                  │
                  ├─► STEP 1: check-alert-status
                  │    └─► Query action_alerts WHERE id = alertId
                  │         - If not found or status != 'active': SKIP
                  │
                  ├─► STEP 2: get-preferences
                  │    └─► Query notification_preferences WHERE user_id = userId
                  │         - Check quiet_hours_enabled
                  │         - If in quiet hours: SKIP
                  │         - Get channel-specific settings
                  │
                  ├─► STEP 3: create-in-app-notification (if channel = 'in_app')
                  │    └─► INSERT INTO in_app_notifications
                  │         - Uses Service Role Client (bypasses RLS)
                  │         - Sets: title, body, link, user_id, type, idea_id/action_id
                  │
                  ├─► STEP 4: send-whatsapp (if channel = 'whatsapp')
                  │    └─► POST to Twilio API
                  │
                  └─► STEP 5: mark-alert-completed
                       └─► UPDATE action_alerts SET
                            - sent_at = NOW()
                            - status = 'completed'
                           WHERE id = alertId
```

---

## How Inngest Works Internally

### Core Concepts

#### 1. **Events**
Events are the triggers for functions. They have:
- **name**: A string identifier (e.g., `notification/send`)
- **data**: Payload containing all info needed for execution
- **ts** (optional): Unix timestamp in milliseconds for scheduled execution
- **user** (optional): User context for tracking

```typescript
await inngest.send({
  name: 'notification/send',
  data: {
    alertId: '123',
    userId: 'abc',
    title: 'Task Due Soon',
    body: 'Your task is due in 15 minutes',
    channel: 'in_app',
    link: '/ideas/xyz'
  },
  ts: Date.now() + (15 * 60 * 1000) // 15 minutes from now
});
```

When you send an event:
1. **Client serializes** the event data to JSON
2. **HTTP POST** to Inngest Cloud API at `https://inn.gs/e/<event-key>`
3. Inngest Cloud **stores the event** in its database
4. If `ts` is provided, the event is **queued for future execution**
5. If no `ts`, the event executes **immediately**

#### 2. **Functions**
Functions are defined with:
- **ID**: Unique identifier (e.g., `send-notification`)
- **Triggers**: Events that invoke this function
- **Handler**: Async function that executes the logic

```typescript
export const sendNotification = inngest.createFunction(
  {
    id: 'send-notification',
    name: 'Send Notification Alert',
    triggers: { event: 'notification/send' },
  },
  async ({ event, step }) => {
    // Function logic
  }
);
```

Function Lifecycle:
1. **Registration**: When your app starts, `serve()` registers functions with Inngest
2. **Discovery**: Inngest Cloud calls `GET /api/inngest` to discover functions
3. **Execution**: When event fires, Inngest calls `POST /api/inngest?fnId=send-notification&stepId=step`
4. **Step Execution**: Each `step.run()` is executed sequentially with retries
5. **Completion**: Function returns success or failure

#### 3. **Steps**
Steps are the building blocks of functions. They provide:
- **Automatic retries**: Failed steps retry up to 3 times by default
- **Idempotency**: Same step always returns same result for same input
- **Observability**: Each step is logged and visualized in dashboard

```typescript
const alert = await step.run('check-alert-status', async () => {
  const { data } = await supabase
    .from('action_alerts')
    .select('*')
    .eq('id', event.data.alertId)
    .single();
  return data;
});
```

Step Execution Model:
- Inngest calls your function **once per step**
- Sends `stepId` in query params
- Your function executes **only that specific step**
- Inngest stores the result and moves to next step
- If step throws error, Inngest retries automatically

### Execution Flow (Deep Dive)

Let's trace a notification from creation to delivery:

#### Phase 1: Event Creation (User Action)

```
User saves action (due: May 9, 2026 10:00 AM)
         │
         ▼
syncActionAlerts() calculates alert time:
  alertTime = new Date('2026-05-09T10:00:00Z') - (15 * 60 * 1000)
  alertTime = 2026-05-09T09:45:00Z  // 15 min before
         │
         ▼
inngest.send() sends HTTP POST:
  POST https://inn.gs/e/<INNGEST_EVENT_KEY>
  Content-Type: application/json

  {
    "name": "notification/send",
    "data": {
      "alertId": "abc123",
      "userId": "user-789",
      "title": "Task: Review PR",
      "body": "Your task is due in 15 minutes",
      "channel": "in_app",
      "link": "/ideas/xyz"
    },
    "ts": 1746785100000  // May 9, 2026 09:45 AM
  }
         │
         ▼
Inngest Cloud receives event:
  - Validates event signature (if using signing key)
  - Stores event in Inngest's database
  - Queues event for execution at ts = 1746785100000
  - Returns 200 OK to client
```

#### Phase 2: Scheduled Wait

```
Inngest Cloud's Scheduler:
  - Maintains priority queue of scheduled events
  - Every second, checks: "Are any events due now?"
  - At 2026-05-09T09:45:00Z, finds our event
  - Triggers execution
```

#### Phase 3: Function Invocation

```
Inngest Cloud initiates function execution:
  1. Look up registered functions for event 'notification/send'
  2. Find function: send-notification
  3. Retrieve app URL from registration (e.g., https://your-app.vercel.app)
  4. Make HTTP POST request:

  POST https://your-app.vercel.app/api/inngest?fnId=alpha-brain-send-notification&stepId=step
  Content-Type: application/json
  X-Inngest-Signature: <HMAC signature>
  X-Inngest-Sdk: inngest-js:v4.2.6

  {
    "event": {
      "name": "notification/send",
      "data": {
        "alertId": "abc123",
        "userId": "user-789",
        ...
      },
      "ts": 1746785100000
    },
    "steps": {},
    "ctx": { "run_id": "...", "attempt": 1 }
  }
```

#### Phase 4: Step-by-Step Execution

Your Next.js app receives the request at `/api/inngest`:

**Request 1: Execute step "check-alert-status"**
```
POST /api/inngest?fnId=alpha-brain-send-notification&stepId=step

Your handler runs:
  const alert = await step.run('check-alert-status', async () => {
    // Query database
    return alertData;
  });

Response:
  {
    "status": 206,  // 206 = Partial (more steps to execute)
    "steps": {
      "check-alert-status": { "data": { ...alertData } }
    }
  }
```

**Request 2: Execute step "get-preferences"**
```
POST /api/inngest?fnId=alpha-brain-send-notification&stepId=step

Inngest sends previous step results:
  {
    "steps": {
      "check-alert-status": { "data": { ...alertData } }
    }
  }

Your handler runs:
  // Skips check-alert-status (already executed)
  const prefs = await step.run('get-preferences', async () => {
    // Query database
    return prefsData;
  });

Response:
  {
    "status": 206,
    "steps": {
      "check-alert-status": { ... },
      "get-preferences": { "data": { ...prefsData } }
    }
  }
```

**Request 3: Execute step "create-in-app-notification"**
```
POST /api/inngest?fnId=alpha-brain-send-notification&stepId=step

Inngest sends all previous results:
  {
    "steps": {
      "check-alert-status": { ... },
      "get-preferences": { ... }
    }
  }

Your handler runs:
  // Skips first two steps
  const result = await step.run('create-in-app-notification', async () => {
    // Insert into database
    await supabase.from('in_app_notifications').insert({ ... });
    return { success: true };
  });

Response:
  {
    "status": 206,
    "steps": {
      "check-alert-status": { ... },
      "get-preferences": { ... },
      "create-in-app-notification": { "data": { "success": true } }
    }
  }
```

**Request 4: Execute step "mark-alert-completed"**
```
POST /api/inngest?fnId=alpha-brain-send-notification&stepId=step

Your handler runs:
  const updated = await step.run('mark-alert-completed', async () => {
    // Update alert status
    await supabase.from('action_alerts').update({ ... });
    return { success: true };
  });

Response:
  {
    "status": 200,  // 200 = Complete
    "steps": {
      "check-alert-status": { ... },
      "get-preferences": { ... },
      "create-in-app-notification": { ... },
      "mark-alert-completed": { "data": { "success": true } }
    }
  }
```

Inngest Cloud marks the function as **completed successfully**.

### Retry Logic

If a step throws an error:

```typescript
await step.run('risky-operation', async () => {
  throw new Error('Database connection timeout');
});
```

Inngest's retry behavior:
1. **Attempt 1**: Fails immediately
2. **Wait 1 second**, then Attempt 2
3. **Wait 2 seconds**, then Attempt 3
4. **Wait 4 seconds**, then Attempt 4 (final)
5. If still failing, mark function as **failed**

Total retries: 3 (configurable)
Backoff: Exponential (1s, 2s, 4s)

### Why This Architecture?

**Advantages:**
- **Durability**: Events are persisted, never lost
- **Reliability**: Automatic retries handle transient failures
- **Observability**: Full execution trace in dashboard
- **Scalability**: Inngest handles concurrency automatically
- **Developer Experience**: No infrastructure to manage

**Tradeoffs:**
- **Latency**: Network round-trips for each step (acceptable for background jobs)
- **Cost**: Inngest Cloud charges per execution (generous free tier)
- **Vendor Lock-in**: Tied to Inngest's API (but easy to migrate with wrappers)

---

## Complete Data Flow

### Flow 1: User Configures Notification Preferences

```
1. User navigates to /settings
         │
         ▼
2. Settings page loads
   - Calls GET /api/notifications/preferences
   - Receives existing preferences or defaults
         │
         ▼
3. User updates settings:
   - Phone number: +1234567890
   - WhatsApp: ON
   - In-App: ON
   - Quiet hours: 22:00 - 08:00
         │
         ▼
4. User clicks "Save"
   - Calls PUT /api/notifications/preferences
         │
         ▼
5. API route validates and saves:
   - app/api/notifications/preferences/route.ts
   - Updates notification_preferences table
   - Returns updated preferences
         │
         ▼
6. UI shows success message
```

**Database State:**
```sql
-- Before
notification_preferences: (empty or default)

-- After
notification_preferences:
  user_id: 'user-789'
  phone_number: '+1234567890'
  whatsapp_enabled: true
  in_app_enabled: true
  quiet_hours_enabled: true
  quiet_hours_start: '22:00'
  quiet_hours_end: '08:00'
```

### Flow 2: User Creates Action with Notification

```
1. User edits idea, adds action
   - Text: "Review PR #123"
   - Due: May 9, 2026 10:00 AM
   - Notify: ON (bell icon clicked)
         │
         ▼
2. User saves idea
   - Calls handleUpdate() in IdeaDetailPage
   - Passes actions array to syncActionsToIdea()
         │
         ▼
3. lib/helpers/actions.ts :: syncActionsToIdea()
   - Inserts/updates action in actions table
   - Calls syncActionAlerts(actionId, dueTime, channels)
         │
         ▼
4. lib/helpers/notifications.ts :: syncActionAlerts()
   Step 1: Delete existing alerts
     DELETE FROM action_alerts WHERE action_id = 'action-123'

   Step 2: Get enabled channels
     SELECT * FROM notification_preferences WHERE user_id = 'user-789'
     → Returns: ['in_app', 'whatsapp']

   Step 3: Calculate alert time
     dueTime = new Date('2026-05-09T10:00:00Z')
     reminderMinutes = 15
     alertTime = dueTime - (15 * 60 * 1000)
     alertTime = 2026-05-09T09:45:00Z

   Step 4: Create alert records (one per channel)
     INSERT INTO action_alerts (action_id, channel, next_run_at, status)
     VALUES
       ('action-123', 'in_app', '2026-05-09T09:45:00Z', 'active'),
       ('action-123', 'whatsapp', '2026-05-09T09:45:00Z', 'active')

   Step 5: Send events to Inngest (one per channel)
     FOR EACH channel:
       await inngest.send({
         name: 'notification/send',
         data: {
           alertId: '<alert-id-in-app>',
           userId: 'user-789',
           channel: 'in_app',
           title: 'Action Reminder: Review PR #123',
           body: 'Review PR #123',
           link: '/ideas/xyz',
           actionId: 'action-123'
         },
         ts: 1746785100000  // May 9, 09:45 AM in ms
       });
         │
         ▼
5. Inngest Cloud receives events
   - Stores events in queue
   - Schedules for execution at ts
         │
         ▼
6. API returns success to UI
   - Action saved with notify = true
   - Alert records created
   - Events scheduled
```

**Database State After Save:**
```sql
actions:
  id: 'action-123'
  idea_id: 'idea-xyz'
  text: 'Review PR #123'
  status: 'pending'
  due_time: '2026-05-09T10:00:00Z'
  notify: true

action_alerts:
  (1) id: 'alert-in-app-456', action_id: 'action-123', channel: 'in_app', next_run_at: '2026-05-09T09:45:00Z', status: 'active'
  (2) id: 'alert-whatsapp-789', action_id: 'action-123', channel: 'whatsapp', next_run_at: '2026-05-09T09:45:00Z', status: 'active'

Inngest Cloud Event Queue:
  (1) Event: notification/send, ts: 1746785100000, data: {alertId: 'alert-in-app-456', ...}
  (2) Event: notification/send, ts: 1746785100000, data: {alertId: 'alert-whatsapp-789', ...}
```

### Flow 3: Scheduled Notification Execution

```
TIME: May 9, 2026 09:45:00 AM

1. Inngest Cloud Scheduler ticks
   - Checks event queue for ts <= NOW()
   - Finds 2 events ready to execute
         │
         ▼
2. Inngest Cloud initiates execution (Event 1: in_app)
   POST https://your-app.vercel.app/api/inngest
   Headers: X-Inngest-Signature, X-Inngest-Sdk
   Body: { event: {...}, steps: {} }
         │
         ▼
3. app/api/inngest/route.ts receives request
   - serve() handler validates signature
   - Routes to send-notification function
         │
         ▼
4. lib/inngest/functions/send-notification.ts executes

   STEP 1: check-alert-status
   ├─► Query: SELECT * FROM action_alerts WHERE id = 'alert-in-app-456'
   ├─► Check: status === 'active' ? ✅ : ❌ SKIP
   └─► Return: { id, action_id, channel, user_id, ... }

   STEP 2: get-preferences
   ├─► Query: SELECT * FROM notification_preferences WHERE user_id = 'user-789'
   ├─► Check quiet hours:
   │    - Now: 09:45 AM
   │    - Quiet hours: 22:00 - 08:00
   │    - In quiet hours? ❌ No
   └─► Return: { whatsapp_enabled, in_app_enabled, phone_number, ... }

   STEP 3: create-in-app-notification
   ├─► Uses Service Role Client (bypasses RLS)
   ├─► Query: INSERT INTO in_app_notifications
   │           (user_id, type, title, body, link, idea_id, action_id)
   │           VALUES ('user-789', 'action_reminder', 'Action Reminder: Review PR #123',
   │                   'Review PR #123', '/ideas/xyz', 'idea-xyz', 'action-123')
   └─► Return: { success: true }

   STEP 4: mark-alert-completed
   ├─► Query: UPDATE action_alerts
   │          SET sent_at = NOW(), status = 'completed'
   │          WHERE id = 'alert-in-app-456'
   └─► Return: { success: true }
         │
         ▼
5. Function returns success to Inngest Cloud
   - Status: 200 OK
   - Execution time: 1.8s (as shown in screenshot)
         │
         ▼
6. Inngest Cloud marks event as completed
   - Logs execution in dashboard
   - Stores step results for debugging
```

**Database State After Execution:**
```sql
in_app_notifications:
  id: 'notif-123'
  user_id: 'user-789'
  type: 'action_reminder'
  title: 'Action Reminder: Review PR #123'
  body: 'Review PR #123'
  link: '/ideas/xyz'
  idea_id: 'idea-xyz'
  action_id: 'action-123'
  read: false
  dismissed: false
  created_at: '2026-05-09T09:45:00Z'

action_alerts (updated):
  id: 'alert-in-app-456'
  sent_at: '2026-05-09T09:45:00Z'
  status: 'completed'
```

### Flow 4: User Sees Notification

```
1. User opens app
   - Loads homepage
   - Header component mounts
         │
         ▼
2. NotificationCenter component renders
   - Shows bell icon
   - Calls useNotifications() hook
         │
         ▼
3. useNotifications.ts :: fetchNotifications()
   - Calls GET /api/notifications?limit=10&includeRead=true
         │
         ▼
4. app/api/notifications/route.ts
   - Gets user from session
   - Queries: SELECT * FROM in_app_notifications
              WHERE user_id = 'user-789'
              AND dismissed = false
              ORDER BY created_at DESC
              LIMIT 10
   - Returns: [{ id: 'notif-123', title: '...', read: false, ... }]
         │
         ▼
5. useNotifications hook updates state
   - setNotifications([...])
   - setUnreadCount(1)
         │
         ▼
6. NotificationCenter re-renders
   - Shows badge with count "1"
   - Bell icon has red dot
         │
         ▼
7. User clicks bell icon
   - Dropdown opens
   - Shows notification with blue background (unread)
         │
         ▼
8. User clicks notification
   - Calls markAsRead(notif-123)
         │
         ▼
9. markAsRead() calls PUT /api/notifications/notif-123/read
   - Updates: UPDATE in_app_notifications
              SET read = true, read_at = NOW()
              WHERE id = 'notif-123'
         │
         ▼
10. Router navigates to /ideas/xyz
    - User sees the related idea
```

**UI State Changes:**
```
Before click:
  - Badge: "1"
  - Notification: Blue background
  - read: false

After click:
  - Badge: "0"
  - Notification: White background
  - read: true
  - User navigated to idea page
```

---

## User Flows

### User Flow 1: First-Time Setup

```
User Story: As a new user, I want to set up notifications for my tasks

Step 1: Navigate to settings
  URL: /settings
  UI: Settings page with empty form

Step 2: Enter phone number
  Input: +1234567890
  Validation: E.164 format (starts with +, only digits)

Step 3: Enable WhatsApp
  Toggle: OFF → ON
  UI: Green checkmark, toggle switches

Step 4: Configure quiet hours
  Enable: ON
  Start: 22:00 (10 PM)
  End: 08:00 (8 AM)
  Note: No notifications during sleep

Step 5: Set default reminder time
  Select: "15 minutes before" from dropdown
  Options: 5 min, 15 min, 30 min, 1 hour, 1 day

Step 6: Save settings
  Click: "Save" button
  API: PUT /api/notifications/preferences
  Result: Success toast message

Database Changes:
  notification_preferences table:
    - Row created with user's preferences
```

### User Flow 2: Creating a Reminder

```
User Story: As a user, I want to be notified 15 minutes before a task is due

Step 1: Navigate to idea
  URL: /ideas/<idea-id>

Step 2: Enter edit mode
  Click: "Edit" button
  UI: Form fields become editable

Step 3: Add action
  Section: Actions Element
  Click: "+ Add Action" button

Step 4: Fill action details
  Text: "Review PR #123"
  Due date: May 9, 2026
  Due time: 10:00 AM

Step 5: Enable notifications
  Click: Bell icon next to due time
  UI: Bell icon turns amber, shows "Notify"

Step 6: Save idea
  Click: "Save" button at bottom
  Loading: Spinner shows briefly

Background Processing:
  1. Action saved to database
  2. Alert records created (in_app + whatsapp)
  3. Events sent to Inngest
  4. Scheduled for 09:45 AM (15 min before)

Result:
  - Action saved with notify = true
  - User sees success message
  - Bell icon remains amber in view mode
```

### User Flow 3: Receiving a Notification

```
User Story: As a user, I want to see a notification when my task is due soon

TIME: May 9, 2026 09:45:00 AM

Step 1: Inngest executes function
  (Background, user not involved)
  - Notification created in database

Step 2: User opens app
  URL: / (homepage)
  UI: Header loads with NotificationCenter

Step 3: Bell icon shows badge
  Visual: Red dot with "1"
  Meaning: 1 unread notification

Step 4: User clicks bell icon
  Click: Bell icon in header
  UI: Dropdown opens below icon

Step 5: See notification
  List: Shows newest first
  Item: "Action Reminder: Review PR #123"
        "Review PR #123"
        "9:45 AM"
  Visual: Blue background (unread)

Step 6: Click notification
  Click: Notification item
  Actions:
    1. Marks as read (background API call)
    2. Navigates to /ideas/xyz
    3. Dropdown closes

Step 7: View related idea
  Page: Idea detail page opens
  Highlight: Action "Review PR #123" visible
  User: Can now work on the task
```

### User Flow 4: Managing Notifications

```
User Story: As a user, I want to manage my notifications (read, dismiss)

Scenario A: Mark single as read
  1. Open dropdown (click bell)
  2. Click notification
  3. Automatically marked as read
  4. Badge count decreases
  5. Background color changes to white

Scenario B: Mark all as read
  1. Open dropdown
  2. Click "Mark all read" link at bottom
  3. All notifications turn white
  4. Badge disappears

Scenario C: Dismiss notification
  1. Open dropdown
  2. Hover over notification
  3. Click "X" button (dismiss)
  4. Notification disappears from list
  5. Badge count decreases

Scenario D: Refresh notifications
  1. Bell dropdown is open
  2. Click bell again to close
  3. Click bell to re-open
  4. Calls refresh() to fetch latest
  5. Shows any new notifications
```

---

## Component Breakdown

### 1. Inngest Client (`lib/inngest/client.ts`)

**Purpose:** Configures the Inngest client for sending events

**Configuration:**
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "alpha-brain",               // App identifier
  name: "Alpha Brain Notifications",
  eventKey: process.env.INNGEST_EVENT_KEY, // For sending events
  isDev: false,                     // Force cloud mode (not dev)
});
```

**Key Points:**
- `eventKey`: Used to authenticate event sends to Inngest Cloud
- `isDev: false`: Forces production mode even in local dev (required for ngrok setup)
- No `signingKey` here (only used in serve() for webhooks)

**Usage:**
```typescript
import { inngest } from '@/lib/inngest/client';

// Send an event
await inngest.send({
  name: 'notification/send',
  data: { ... },
  ts: Date.now() + 60000, // 1 minute from now
});
```

### 2. Send Notification Function (`lib/inngest/functions/send-notification.ts`)

**Purpose:** Processes scheduled notification events and sends notifications

**Function Definition:**
```typescript
export const sendNotification = inngest.createFunction(
  {
    id: 'send-notification',
    name: 'Send Notification Alert',
    triggers: { event: 'notification/send' },
  },
  async ({ event, step }) => {
    // Function logic with steps
  }
);
```

**Steps Breakdown:**

#### Step 1: check-alert-status
```typescript
const alert = await step.run('check-alert-status', async () => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('action_alerts')
    .select('*')
    .eq('id', event.data.alertId)
    .single();

  if (error || !data) {
    throw new Error('Alert not found');
  }

  // Skip if already processed
  if (data.status !== 'active') {
    return { skip: true, reason: 'Alert already processed' };
  }

  return data;
});

if (alert.skip) {
  return { success: false, reason: alert.reason };
}
```

**Purpose:** Verify alert exists and hasn't been processed yet
**Uses:** Service Role Client (no user session needed)
**Error Handling:** Throws if alert not found, allowing Inngest to retry

#### Step 2: get-preferences
```typescript
const preferences = await step.run('get-preferences', async () => {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', event.data.userId)
    .single();

  return data || getDefaultPreferences();
});

// Check quiet hours
if (isQuietHours(preferences)) {
  return {
    success: false,
    reason: 'Quiet hours active',
    channel: event.data.channel
  };
}
```

**Purpose:** Get user's notification settings and check quiet hours
**Quiet Hours Logic:**
```typescript
function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
  const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
```

#### Step 3: create-in-app-notification
```typescript
if (payload.channel === 'in_app') {
  const result = await step.run('create-in-app-notification', async () => {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: payload.userId,
        type: payload.alertType === 'action' ? 'action_reminder' : 'idea_reminder',
        title: payload.title,
        body: payload.body,
        link: payload.link,
        idea_id: payload.ideaId,
        action_id: payload.actionId,
      });

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return { success: true };
  });
}
```

**Purpose:** Create in-app notification record
**Critical:** Uses Service Role Client to bypass RLS policies
**Error Handling:** Throws error to trigger retry if database insert fails

#### Step 4: mark-alert-completed
```typescript
await step.run('mark-alert-completed', async () => {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('action_alerts')
    .update({
      sent_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', event.data.alertId);

  if (error) {
    throw new Error(`Failed to mark alert as completed: ${error.message}`);
  }

  return { success: true };
});
```

**Purpose:** Mark alert as processed to prevent duplicate sends
**Idempotency:** Safe to run multiple times (upsert behavior)

**Return Value:**
```typescript
return {
  success: true,
  channel: payload.channel,
  userId: payload.userId,
  alertId: payload.alertId,
};
```

### 3. Inngest API Route (`app/api/inngest/route.ts`)

**Purpose:** Webhook endpoint for Inngest to call when executing functions

**Implementation:**
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendNotification } from "@/lib/inngest/functions/send-notification";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendNotification],
  servePath: "/api/inngest",
});
```

**HTTP Methods:**
- **GET**: Function discovery (Inngest calls this to register functions)
- **POST**: Function execution (Inngest calls this to run steps)
- **PUT**: Function discovery (alternative method)

**Request Flow:**
```
Inngest Cloud → POST https://your-app.vercel.app/api/inngest?fnId=send-notification&stepId=step
                 ↓
              serve() handler
                 ↓
              Validates signature using INNGEST_SIGNING_KEY
                 ↓
              Routes to sendNotification function
                 ↓
              Executes specific step based on stepId
                 ↓
              Returns step result to Inngest Cloud
```

**Security:**
- Validates `X-Inngest-Signature` header
- Uses `INNGEST_SIGNING_KEY` from environment
- Rejects requests with invalid signatures

### 4. Service Role Client (`lib/supabase/service.ts`)

**Purpose:** Supabase client with admin privileges for background jobs

**Why Needed:**
- Inngest functions run without user sessions
- Regular client requires authenticated user for RLS
- Service role client bypasses RLS policies

**Implementation:**
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
```

**Critical Difference:**
```typescript
// Regular client (for API routes with user session)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient(); // Uses cookies, enforces RLS

// Service client (for Inngest functions)
import { createServiceClient } from '@/lib/supabase/service';
const supabase = createServiceClient(); // Bypasses RLS, admin access
```

**Security Warning:**
- **Never** use service role client in client-side code
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to browser
- Only use in secure server contexts (API routes, Inngest functions)

### 5. Notification Helpers (`lib/helpers/notifications.ts`)

**Purpose:** Helper functions for managing notifications and alerts

**Key Functions:**

#### syncActionAlerts()
```typescript
export async function syncActionAlerts(
  actionId: string,
  dueTime: string | undefined,
  channels: NotificationChannel[],
  reminderMinutes: number = 15
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Not authenticated');

  // Step 1: Delete existing alerts
  await deleteActionAlerts(actionId);

  // Step 2: If no due time or channels, nothing to create
  if (!dueTime || channels.length === 0) return;

  // Step 3: Calculate alert time
  const dueDate = new Date(dueTime);
  const alertTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);

  // Step 4: Don't create alerts for past times
  if (alertTime <= new Date()) return;

  // Step 5: Get action details for notification
  const action = await getActionDetails(actionId);

  // Step 6: Create alerts and send events
  for (const channel of channels) {
    // Create alert record
    const alert = await createActionAlert(actionId, {
      alert_type: 'one-time',
      channel,
      reminder_minutes: reminderMinutes,
      next_run_at: alertTime.toISOString(),
    });

    // Send event to Inngest
    await inngest.send({
      name: 'notification/send',
      data: {
        alertId: alert.id,
        alertType: 'action' as const,
        channel,
        userId: user.id,
        title: `Action Reminder: ${action.idea_title || 'Task'}`,
        body: action.text,
        link: `/ideas/${action.idea_id}`,
        ideaId: action.idea_id,
        actionId: actionId,
      },
      ts: alertTime.getTime(), // Unix timestamp in milliseconds
    });
  }
}
```

**Flow:**
1. Delete old alerts (idempotency)
2. Validate inputs
3. Calculate when to send (due time - reminder offset)
4. Create database records
5. Send events to Inngest with scheduled time

#### getEnabledChannels()
```typescript
export async function getEnabledChannels(): Promise<NotificationChannel[]> {
  const prefs = await getNotificationPreferences();
  const channels: NotificationChannel[] = [];

  if (prefs.in_app_enabled) channels.push('in_app');
  if (prefs.whatsapp_enabled && prefs.phone_number) channels.push('whatsapp');
  if (prefs.sms_enabled && prefs.phone_number) channels.push('sms');
  if (prefs.push_enabled) channels.push('push');

  return channels;
}
```

**Logic:**
- Checks user preferences
- Only includes channels that are:
  - Enabled by user
  - Have required data (e.g., phone for WhatsApp)

### 6. useNotifications Hook (`lib/hooks/useNotifications.ts`)

**Purpose:** React hook for fetching and managing notifications

**Removed:** Realtime subscription (no longer needed)

**Current Implementation:**
```typescript
export function useNotifications({
  limit = 20,
  includeRead = false,
}: {
  limit?: number;
  includeRead?: boolean;
} = {}) {
  const [notifications, setNotifications] = useState<NotificationWithContext[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notifications?limit=${limit}&includeRead=${includeRead}`
      );
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [limit, includeRead]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?countOnly=true');
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchNotifications(), fetchUnreadCount()]).finally(() => {
      setLoading(false);
    });
  }, [fetchNotifications, fetchUnreadCount]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Dismiss notification
  const dismiss = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/dismiss`, { method: 'PUT' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.read ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  }, [notifications]);

  // Manual refresh
  const refresh = useCallback(() => {
    return Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh,
  };
}
```

**Key Changes from Old Implementation:**
- **Removed:** `realtime` parameter
- **Removed:** Supabase realtime subscription useEffect
- **Removed:** WebSocket connection management
- **Kept:** All CRUD operations (mark read, dismiss, refresh)

**Why Remove Realtime?**
- Users don't stay on app continuously
- Maintaining WebSocket for sporadic notifications wastes resources
- Fetching on-demand is simpler and sufficient

### 7. NotificationCenter Component (`components/notifications/NotificationCenter.tsx`)

**Purpose:** Bell icon with dropdown showing notifications

**Features:**
- Unread count badge
- Dropdown with notification list
- Click to navigate
- Mark as read on click
- Refresh on open

**Key Changes:**
```typescript
const handleBellClick = () => {
  const willOpen = !isOpen;
  setIsOpen(willOpen);
  if (willOpen) {
    refresh(); // Fetch latest when opening
  }
};
```

**Render:**
```tsx
<div className="relative">
  {/* Bell Icon */}
  <button onClick={handleBellClick}>
    <Bell />
    {unreadCount > 0 && (
      <span className="badge">{unreadCount}</span>
    )}
  </button>

  {/* Dropdown */}
  {isOpen && (
    <div className="dropdown">
      {notifications.map(notif => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onClick={() => handleNotificationClick(notif)}
        />
      ))}
      <button onClick={markAllAsRead}>
        Mark all read
      </button>
    </div>
  )}
</div>
```

---

## File Reference

### Core Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `lib/inngest/client.ts` | Inngest client config | `inngest` |
| `lib/inngest/functions/send-notification.ts` | Notification function | `sendNotification` |
| `app/api/inngest/route.ts` | Webhook endpoint | `GET`, `POST`, `PUT` |
| `lib/supabase/service.ts` | Service role client | `createServiceClient` |
| `lib/helpers/notifications.ts` | Notification helpers | `syncActionAlerts`, `getEnabledChannels` |
| `lib/helpers/actions.ts` | Action helpers | `syncActionsToIdea` |
| `lib/hooks/useNotifications.ts` | React hook | `useNotifications` |
| `components/notifications/NotificationCenter.tsx` | UI component | `NotificationCenter` |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/inngest` | GET | Function discovery |
| `/api/inngest` | POST | Function execution |
| `/api/inngest` | PUT | Function discovery (alt) |
| `/api/notifications` | GET | Fetch notifications |
| `/api/notifications/preferences` | GET | Get preferences |
| `/api/notifications/preferences` | PUT | Update preferences |
| `/api/notifications/[id]/read` | PUT | Mark as read |
| `/api/notifications/[id]/dismiss` | PUT | Dismiss notification |
| `/api/notifications/read-all` | PUT | Mark all as read |

### Database Tables

| Table | Purpose |
|-------|---------|
| `notification_preferences` | User notification settings |
| `in_app_notifications` | In-app notification records |
| `action_alerts` | Scheduled alerts for actions |
| `idea_alerts` | Scheduled alerts for ideas |
| `push_subscriptions` | Web push subscriptions (future) |

---

## Database Schema

### notification_preferences

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contact
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,

  -- Channels
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone TEXT DEFAULT 'UTC',

  -- Defaults
  default_reminder_minutes INTEGER DEFAULT 15,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);
```

### in_app_notifications

```sql
CREATE TABLE in_app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Type
  type TEXT NOT NULL CHECK (type IN ('idea_reminder', 'action_reminder', 'system')),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  action_id UUID REFERENCES actions(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_read ON in_app_notifications(user_id, read);
```

### action_alerts

```sql
CREATE TABLE action_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Alert config
  alert_type TEXT NOT NULL CHECK (alert_type IN ('one-time', 'recurrent')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'push', 'in_app')),

  -- Scheduling
  next_run_at TIMESTAMPTZ,
  reminder_minutes INTEGER DEFAULT 15,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_action_alerts_action_id ON action_alerts(action_id);
CREATE INDEX idx_action_alerts_next_run_at ON action_alerts(next_run_at) WHERE status = 'active';
```

### RLS Policies

```sql
-- notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- in_app_notifications
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (for Inngest functions)
-- No policy needed - service role bypasses RLS
```

---

## Configuration & Setup

### Environment Variables

#### Required (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # CRITICAL for Inngest functions

# Inngest
INNGEST_EVENT_KEY=your-event-key      # For sending events
INNGEST_SIGNING_KEY=your-signing-key  # For webhook validation
```

#### How to Get Keys

**Supabase:**
1. Go to Supabase Dashboard → Settings → API
2. Copy `URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**

**Inngest:**
1. Go to [Inngest Cloud](https://app.inngest.com)
2. Create account / sign in
3. Create new app
4. Go to Settings → Keys
5. Copy `Event Key` → `INNGEST_EVENT_KEY`
6. Copy `Signing Key` → `INNGEST_SIGNING_KEY`

### Database Migration

Run the migration SQL in Supabase SQL Editor:

```bash
# File: supabase/migrations/20260427000001_notification_system.sql
```

This creates:
- Tables: `notification_preferences`, `in_app_notifications`, `push_subscriptions`
- Modifies: `action_alerts`, `idea_alerts` (adds columns)
- RLS policies
- Triggers for auto-populating `user_id`

### Package Installation

```bash
bun install inngest
bun install concurrently  # For dev:tunnel script
```

---

## Local Development

### Setup with Ngrok

Ngrok allows Inngest Cloud to call your localhost during development.

#### Step 1: Install Dependencies
```bash
bun install
```

#### Step 2: Start Dev Server with Ngrok
```bash
bun run dev:tunnel
```

This runs:
- `bun run dev` (Next.js on localhost:3000)
- `bunx ngrok http 3000` (Ngrok tunnel)

#### Step 3: Copy Ngrok URL
From ngrok output:
```
Forwarding  https://abc123.ngrok-free.app → http://localhost:3000
```

Copy: `https://abc123.ngrok-free.app`

#### Step 4: Configure Inngest Cloud
1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Navigate to: Apps → alpha-brain → Settings
3. Set App URL: `https://abc123.ngrok-free.app/api/inngest`
4. Click "Check" to verify
5. Should see: Mode = CLOUD, all config populated

#### Step 5: Test
1. Create an action with due time 2 minutes from now
2. Enable notifications (bell icon)
3. Save
4. Go to Inngest Dashboard → Events
5. Should see scheduled event
6. Wait 2 minutes
7. Check Functions → Runs → Should see completed execution
8. Open app → Click bell → See notification

### Common Issues

**Issue: Mode shows DEV instead of CLOUD**
- Solution: Ensure `isDev: false` in `lib/inngest/client.ts`
- Restart Next.js server

**Issue: Signature validation failed**
- Solution: Check `INNGEST_SIGNING_KEY` is correct in `.env.local`
- Restart Next.js server

**Issue: Ngrok URL changes every restart**
- Solution: Update URL in Inngest Dashboard each time
- Or: Get paid ngrok account for static URLs

**Issue: Function not executing**
- Solution: Check Inngest Dashboard → Functions → Your function is registered
- Verify: App URL is correct
- Check: Next.js terminal for errors

---

## Production Deployment

### Vercel Deployment

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add Inngest notification system"
git push origin main
```

#### Step 2: Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com)
2. Import project from GitHub
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
4. Deploy

#### Step 3: Configure Inngest Cloud
1. Go to Inngest Dashboard → Apps → alpha-brain → Settings
2. Set App URL: `https://your-app.vercel.app/api/inngest`
3. Click "Check" to verify
4. Save

#### Step 4: Test in Production
1. Create action with notification
2. Verify in Inngest Dashboard
3. Wait for execution
4. Check notification appears

### Monitoring

**Inngest Dashboard:**
- Events: See all scheduled events
- Functions: View function runs with execution trace
- Errors: Get alerted for failures

**Logs:**
- Vercel Logs: Check Next.js function logs
- Inngest Logs: View step-by-step execution

---

## Troubleshooting

### Notifications Not Created

**Symptoms:**
- No notification in bell dropdown
- Database: `in_app_notifications` table empty

**Debug Steps:**
1. Check Inngest Dashboard → Functions → Recent Runs
   - Is function executing?
   - Are steps completing successfully?
2. Check step logs for errors
3. Verify database permissions (RLS policies)
4. Check service role key is correct

**Common Causes:**
- RLS policy blocking insert (use service role client)
- Alert status not 'active'
- Quiet hours blocking notification

### Events Not Scheduling

**Symptoms:**
- Inngest Dashboard shows no events
- Action saved but no alert created

**Debug Steps:**
1. Check browser network tab
   - Is `syncActionsToIdea()` called?
   - Any errors in response?
2. Check Next.js terminal for errors
3. Verify `INNGEST_EVENT_KEY` is set
4. Check `action_alerts` table for records

**Common Causes:**
- Missing event key
- `dueTime` in past (alerts not created for past times)
- No enabled channels
- `notify` toggle not enabled

### Function Fails with Timeout

**Symptoms:**
- Inngest shows function failed
- Error: "Execution timed out"

**Debug Steps:**
1. Check step that failed (Inngest shows which step)
2. Optimize slow database queries
3. Increase Inngest timeout (config in function definition)

**Common Causes:**
- Slow database query
- External API timeout (Twilio, etc.)
- Missing indexes on database

### Quiet Hours Not Working

**Symptoms:**
- Notifications sent during quiet hours

**Debug Steps:**
1. Check user preferences
   - `quiet_hours_enabled = true`?
   - Times correct?
2. Check timezone (currently hardcoded to UTC)
3. Verify `isQuietHours()` logic

**Fix:**
Implement timezone-aware quiet hours:
```typescript
function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  // Convert to user's timezone
  const now = new Date().toLocaleString('en-US', { timeZone: prefs.timezone });
  const currentDate = new Date(now);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

  // ... rest of logic
}
```

---

## Future Enhancements

### Planned Features

1. **WhatsApp Integration**
   - Twilio API integration
   - Phone verification flow
   - Template messages

2. **SMS Support**
   - Twilio SMS API
   - Short links for mobile

3. **Push Notifications**
   - Web Push API
   - Service worker
   - Push subscription management

4. **Email Notifications**
   - Resend API integration
   - HTML templates
   - Unsubscribe link

5. **Recurring Alerts**
   - Cron expressions
   - Daily/weekly reminders
   - Custom recurrence rules

6. **Batch Notifications**
   - Digest mode
   - Daily summary
   - Grouped alerts

7. **Advanced Features**
   - Snooze functionality
   - Custom reminder offsets per action
   - Notification templates
   - A/B testing for messages

---

## Appendix

### Inngest Pricing

| Tier | Events/Month | Price |
|------|--------------|-------|
| Free | 50,000 | $0 |
| Team | 500,000 | $20 |
| Pro | 5,000,000 | $200 |

**Calculation for Our App:**
- Assume 1,000 active users
- Each user creates 5 actions/month with notifications
- 2 channels per action (in_app + whatsapp)
- Total events: 1,000 × 5 × 2 = 10,000 events/month
- **Cost: Free tier is sufficient**

### Performance Metrics

Based on Inngest dashboard screenshot:

| Metric | Value |
|--------|-------|
| Total execution time | 1.817s |
| Step: check-alert-status | 1.06s |
| Step: get-preferences | 129ms |
| Step: create-in-app-notification | 154ms |
| Step: mark-alert-completed | 123ms |

**Optimization Opportunities:**
- Add database index on `action_alerts.id` (reduce check-alert-status time)
- Cache user preferences (reduce get-preferences time)

### Security Checklist

- [x] Service role key in environment variables (not committed)
- [x] RLS policies on all tables
- [x] Webhook signature validation
- [x] HTTPS in production
- [x] User authentication required for API routes
- [ ] Rate limiting on notification APIs
- [ ] Phone number verification
- [ ] Audit logging for notification sends

---

*Documentation last updated: 2026-05-09*
*Author: Claude Sonnet 4.5*
*Version: 2.0 (Inngest-based architecture)*
