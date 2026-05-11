/**
 * WhatsApp Gateway Server
 * HTTP + WebSocket server for WhatsApp integration
 *
 * Endpoints:
 * - POST /api/pairing/initiate - Start pairing process
 * - GET  /api/pairing/:sessionId/status - Get pairing session status
 * - POST /api/send - Send a message
 * - GET  /api/connection/:userId/status - Get connection status
 * - POST /api/connection/:userId/disconnect - Disconnect user
 * - POST /api/connection/:userId/logout - Logout and clear credentials
 *
 * WebSocket:
 * - /ws/:userId - Real-time events for a user
 */

import express, { Request, Response, NextFunction } from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import pino from 'pino'
import { getConnectionManager, ConnectionManager } from './connection-manager.js'
import { createMessageHandler } from './message-handler.js'
import type {
  InitiatePairingRequest,
  InitiatePairingResponse,
  SendMessageRequest,
  SendMessageResponse,
  ConnectionStatusResponse,
  DisconnectResponse,
  GatewayEvent,
  PairingMethod,
} from './types.js'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  }
})

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.GATEWAY_PORT || '3001', 10)
const HOST = process.env.GATEWAY_HOST || '0.0.0.0'
const AUTH_BASE_PATH = process.env.WHATSAPP_AUTH_PATH || './.whatsapp-auth'
const INTERNAL_API_KEY = process.env.GATEWAY_API_KEY || 'development-key'

// ============================================================================
// Initialize services (lazy initialization in start())
// ============================================================================

const connectionManager = getConnectionManager()

// ============================================================================
// Express App
// ============================================================================

const app = express()
app.use(express.json())

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug({ method: req.method, url: req.url }, 'Request')
  next()
})

// API key authentication middleware (for internal communication)
const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey

  // In development, allow requests without API key
  if (process.env.NODE_ENV === 'development') {
    return next()
  }

  if (apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============================================================================
// Pairing Endpoints
// ============================================================================

/**
 * POST /api/pairing/initiate
 * Start the pairing process for a user
 */
app.post('/api/pairing/initiate', authenticateApiKey, async (req: Request, res: Response) => {
  const { userId, method = 'qr_code', phoneNumber } = req.body as InitiatePairingRequest & { phoneNumber?: string }

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' })
  }

  if (method !== 'qr_code' && method !== 'link_code') {
    return res.status(400).json({ success: false, error: 'Invalid pairing method' })
  }

  if (method === 'link_code' && !phoneNumber) {
    return res.status(400).json({ success: false, error: 'phoneNumber is required for link code pairing' })
  }

  logger.info({ userId, method }, 'Pairing request received')

  try {
    const result = await connectionManager.initiatePairing(userId, method as PairingMethod, phoneNumber)

    const response: InitiatePairingResponse = {
      success: result.success,
      sessionId: result.sessionId,
      method: result.method,
      linkCode: result.linkCode,
      expiresAt: result.expiresAt.toISOString(),
      error: result.error,
    }

    res.json(response)
  } catch (error) {
    logger.error({ userId, error }, 'Pairing initiation failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

/**
 * GET /api/pairing/:sessionId/status
 * Get the status of a pairing session
 */
app.get('/api/pairing/:sessionId/status', authenticateApiKey, (req: Request<{ sessionId: string }>, res: Response) => {
  const { sessionId } = req.params

  const session = connectionManager.getPairingSession(sessionId)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  res.json({
    sessionId: session.sessionId,
    userId: session.userId,
    method: session.method,
    status: session.status,
    qrCode: session.qrCode,
    linkCode: session.linkCode,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  })
})

// ============================================================================
// Message Endpoints
// ============================================================================

/**
 * POST /api/send
 * Send a WhatsApp message
 */
app.post('/api/send', authenticateApiKey, async (req: Request, res: Response) => {
  const { userId, to, text } = req.body as SendMessageRequest

  if (!userId || !to || !text) {
    return res.status(400).json({ success: false, error: 'userId, to, and text are required' })
  }

  logger.info({ userId, to }, 'Send message request')

  try {
    const result = await connectionManager.sendMessage(userId, to, text)

    const response: SendMessageResponse = {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    }

    res.json(response)
  } catch (error) {
    logger.error({ userId, to, error }, 'Send message failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

// ============================================================================
// Connection Endpoints
// ============================================================================

/**
 * GET /api/connection/:userId/status
 * Get connection status for a user
 */
app.get('/api/connection/:userId/status', authenticateApiKey, (req: Request<{ userId: string }>, res: Response) => {
  const { userId } = req.params

  const connection = connectionManager.getConnectionStatus(userId)

  if (!connection) {
    const response: ConnectionStatusResponse = {
      connected: false,
      status: 'disconnected',
    }
    return res.json(response)
  }

  const response: ConnectionStatusResponse = {
    connected: connection.status === 'connected',
    status: connection.status,
    phoneNumber: connection.phoneNumber,
    jid: connection.jid,
    lastConnectedAt: connection.lastConnectedAt?.toISOString(),
  }

  res.json(response)
})

/**
 * POST /api/connection/:userId/disconnect
 * Disconnect a user (keeps credentials)
 */
app.post('/api/connection/:userId/disconnect', authenticateApiKey, async (req: Request<{ userId: string }>, res: Response) => {
  const { userId } = req.params

  logger.info({ userId }, 'Disconnect request')

  try {
    await connectionManager.disconnect(userId)

    const response: DisconnectResponse = { success: true }
    res.json(response)
  } catch (error) {
    logger.error({ userId, error }, 'Disconnect failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

/**
 * POST /api/connection/:userId/logout
 * Logout and clear credentials for a user
 */
app.post('/api/connection/:userId/logout', authenticateApiKey, async (req: Request<{ userId: string }>, res: Response) => {
  const { userId } = req.params

  logger.info({ userId }, 'Logout request')

  try {
    await connectionManager.logout(userId)

    const response: DisconnectResponse = { success: true }
    res.json(response)
  } catch (error) {
    logger.error({ userId, error }, 'Logout failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ error: err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

// ============================================================================
// HTTP Server + WebSocket
// ============================================================================

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

// Track WebSocket connections per user
const userSockets: Map<string, Set<WebSocket>> = new Map()

wss.on('connection', (ws: WebSocket, req) => {
  // Extract userId from query string
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    logger.warn('WebSocket connection without userId')
    ws.close(4000, 'userId required')
    return
  }

  logger.info({ userId }, 'WebSocket connected')

  // Add to user sockets
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set())
  }
  userSockets.get(userId)!.add(ws)

  ws.on('close', () => {
    logger.info({ userId }, 'WebSocket disconnected')
    userSockets.get(userId)?.delete(ws)
    if (userSockets.get(userId)?.size === 0) {
      userSockets.delete(userId)
    }
  })

  ws.on('error', (error) => {
    logger.error({ userId, error }, 'WebSocket error')
  })

  // Send initial status
  const connection = connectionManager.getConnectionStatus(userId)
  if (connection) {
    ws.send(JSON.stringify({
      type: 'connection:status',
      userId,
      data: {
        status: connection.status,
        phoneNumber: connection.phoneNumber,
        jid: connection.jid,
      },
      timestamp: new Date().toISOString(),
    }))
  }
})

// Forward gateway events to WebSocket clients
connectionManager.on('event', (event: GatewayEvent) => {
  const sockets = userSockets.get(event.userId)
  if (!sockets || sockets.size === 0) return

  const message = JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  })

  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  }
})

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown() {
  logger.info('Shutting down...')

  // Close WebSocket connections
  for (const sockets of userSockets.values()) {
    for (const ws of sockets) {
      ws.close(1001, 'Server shutting down')
    }
  }
  userSockets.clear()

  // Shutdown connection manager
  await connectionManager.shutdown()

  // Close HTTP server
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.warn('Force exit')
    process.exit(1)
  }, 10000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// ============================================================================
// Start Server
// ============================================================================

async function start() {
  logger.info({ authBasePath: AUTH_BASE_PATH }, 'Starting WhatsApp Gateway')

  // Set up message handler
  const messageHandler = createMessageHandler()
  connectionManager.setMessageHandler(messageHandler)

  // Restore existing connections from stored credentials
  await connectionManager.restoreConnections()

  server.listen(PORT, HOST, () => {
    logger.info({ host: HOST, port: PORT }, 'WhatsApp Gateway started')
    logger.info(`Health check: http://${HOST}:${PORT}/health`)
    logger.info(`WebSocket: ws://${HOST}:${PORT}/ws?userId=<userId>`)
  })
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start server')
  process.exit(1)
})
