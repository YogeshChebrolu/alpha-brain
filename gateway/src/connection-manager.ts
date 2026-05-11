/**
 * Connection Manager
 * Manages multiple WhatsApp connections, one per user
 *
 * Key responsibilities:
 * - Track active connections per user
 * - Handle pairing (QR code / link code)
 * - Manage reconnections
 * - Isolate users from each other
 */

import { EventEmitter } from 'events'
import type { WASocket } from '@whiskeysockets/baileys'
import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'
import { createUserSocket, formatPhoneForSending, extractPhoneFromJid } from './socket-factory.js'
import { AuthStorage } from './auth-storage.js'
import type {
  UserConnection,
  ConnectionStatus,
  PairingMethod,
  PairingSession,
  PairingResult,
  InboundMessage,
  SendResult,
  GatewayEvent,
  MessageHandler,
  ReconnectPolicy,
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

const DEFAULT_RECONNECT_POLICY: ReconnectPolicy = {
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  factor: 1.5,
  jitter: 0.25,
}

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5
const QR_CODE_EXPIRY_SECONDS = 60
const LINK_CODE_EXPIRY_SECONDS = 120

export interface ConnectionManagerOptions {
  authStorage?: AuthStorage
  reconnectPolicy?: ReconnectPolicy
  maxReconnectAttempts?: number
  qrCodeExpirySeconds?: number
  linkCodeExpirySeconds?: number
}

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, UserConnection> = new Map()
  private pairingSessions: Map<string, PairingSession> = new Map()
  private socketCleanups: Map<string, () => void> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private messageHandler: MessageHandler | null = null

  private authStorage: AuthStorage
  private reconnectPolicy: ReconnectPolicy
  private maxReconnectAttempts: number
  private qrCodeExpirySeconds: number
  private linkCodeExpirySeconds: number

  constructor(options: ConnectionManagerOptions = {}) {
    super()

    this.authStorage = options.authStorage || new AuthStorage()
    this.reconnectPolicy = options.reconnectPolicy || DEFAULT_RECONNECT_POLICY
    this.maxReconnectAttempts = options.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS
    this.qrCodeExpirySeconds = options.qrCodeExpirySeconds || QR_CODE_EXPIRY_SECONDS
    this.linkCodeExpirySeconds = options.linkCodeExpirySeconds || LINK_CODE_EXPIRY_SECONDS

    logger.info('Connection manager created')
  }

  /**
   * Set the message handler for all incoming messages
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler
  }

  /**
   * Initiate pairing for a user
   */
  async initiatePairing(
    userId: string,
    method: PairingMethod,
    phoneNumber?: string
  ): Promise<PairingResult> {
    logger.info({ userId, method }, 'Initiating pairing')

    // Check if user already has an active connection
    const existing = this.connections.get(userId)
    if (existing?.status === 'connected') {
      return {
        success: false,
        sessionId: '',
        method,
        error: 'User already connected',
        expiresAt: new Date(),
      }
    }

    // Clean up any existing connection attempt
    await this.cleanupUser(userId)

    // Create session
    const sessionId = uuidv4()
    const expiresAt = new Date(
      Date.now() + (method === 'qr_code' ? this.qrCodeExpirySeconds : this.linkCodeExpirySeconds) * 1000
    )

    const session: PairingSession = {
      userId,
      method,
      sessionId,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
    }
    this.pairingSessions.set(sessionId, session)

    // Initialize connection record
    const connection: UserConnection = {
      userId,
      socket: null,
      status: 'pending',
      authDir: this.authStorage.getUserAuthDir(userId),
      reconnectAttempts: 0,
      createdAt: new Date(),
    }
    this.connections.set(userId, connection)

    // Create socket with callbacks
    try {
      const { socket, cleanup } = await createUserSocket({
        userId,
        authStorage: this.authStorage,
        pairingMethod: method,
        phoneNumber,
        callbacks: {
          onQR: (qr, qrImage) => {
            session.qrCode = qrImage
            session.status = 'qr_generated'
            this.updateConnectionStatus(userId, 'qr_generated')
            this.emitEvent({
              type: 'connection:qr',
              userId,
              data: { qrCode: qrImage, expiresIn: this.qrCodeExpirySeconds },
              timestamp: new Date(),
            })
          },
          onLinkCode: (code) => {
            session.linkCode = code
            session.status = 'link_code_generated'
            this.updateConnectionStatus(userId, 'link_code_generated')
            this.emitEvent({
              type: 'connection:link_code',
              userId,
              data: { linkCode: code, expiresIn: this.linkCodeExpirySeconds },
              timestamp: new Date(),
            })
          },
          onCredsUpdate: () => {
            logger.debug({ userId }, 'Credentials saved')
          },
          onConnectionUpdate: (status, phoneNumber, jid) => {
            this.handleConnectionUpdate(userId, status, phoneNumber, jid)
          },
          onMessage: (upsert) => {
            this.handleMessages(userId, upsert)
          },
        },
      })

      // Store socket and cleanup
      connection.socket = socket
      this.socketCleanups.set(userId, cleanup)

      // Return session info
      // For link code, we need to wait for the code to be generated
      if (method === 'link_code') {
        // Wait for link code
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout waiting for link code'))
          }, 10000)

          const checkInterval = setInterval(() => {
            if (session.linkCode) {
              clearTimeout(timeout)
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
        })
      }

      return {
        success: true,
        sessionId,
        method,
        linkCode: session.linkCode,
        expiresAt,
      }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to initiate pairing')
      await this.cleanupUser(userId)
      return {
        success: false,
        sessionId: '',
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        expiresAt: new Date(),
      }
    }
  }

  /**
   * Handle connection status updates
   */
  private handleConnectionUpdate(
    userId: string,
    status: ConnectionStatus,
    phoneNumber?: string,
    jid?: string
  ): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.status = status

    if (phoneNumber) connection.phoneNumber = phoneNumber
    if (jid) connection.jid = jid

    if (status === 'connected') {
      connection.lastConnectedAt = new Date()
      connection.reconnectAttempts = 0

      // Update any active pairing sessions for this user to 'connected'
      for (const [sessionId, session] of this.pairingSessions) {
        if (session.userId === userId && session.status !== 'connected') {
          session.status = 'connected'
          logger.info({ userId, sessionId }, 'Pairing session marked as connected')
        }
      }

      this.emitEvent({
        type: 'connection:connected',
        userId,
        data: { phoneNumber, jid },
        timestamp: new Date(),
      })
    } else if (status === 'disconnected') {
      connection.lastDisconnectedAt = new Date()
      this.scheduleReconnect(userId)
      this.emitEvent({
        type: 'connection:disconnected',
        userId,
        data: { reason: 'disconnected' },
        timestamp: new Date(),
      })
    } else if (status === 'logged_out') {
      connection.lastDisconnectedAt = new Date()
      this.emitEvent({
        type: 'connection:disconnected',
        userId,
        data: { reason: 'logged_out' },
        timestamp: new Date(),
      })
    }

    this.emitEvent({
      type: 'connection:status',
      userId,
      data: { status, phoneNumber, jid },
      timestamp: new Date(),
    })
  }

  /**
   * Handle incoming messages
   */
  private async handleMessages(
    userId: string,
    upsert: { messages: any[]; type: string }
  ): Promise<void> {
    for (const msg of upsert.messages) {
      const inbound = this.normalizeMessage(userId, msg)
      if (!inbound) continue

      logger.info({ userId, from: inbound.from, body: inbound.body?.slice(0, 50) }, 'Message received')

      // Emit event
      this.emitEvent({
        type: 'message:received',
        userId,
        data: inbound,
        timestamp: new Date(),
      })

      // Call message handler if set
      if (this.messageHandler) {
        try {
          await this.messageHandler(inbound)
        } catch (error) {
          logger.error({ userId, error }, 'Message handler error')
        }
      }
    }
  }

  /**
   * Normalize a Baileys message to our format
   */
  private normalizeMessage(userId: string, msg: any): InboundMessage | null {
    try {
      const remoteJid = msg.key.remoteJid
      const isGroup = remoteJid?.endsWith('@g.us') || false

      // Extract text from message
      let body = ''
      if (msg.message?.conversation) {
        body = msg.message.conversation
      } else if (msg.message?.extendedTextMessage?.text) {
        body = msg.message.extendedTextMessage.text
      } else if (msg.message?.imageMessage?.caption) {
        body = msg.message.imageMessage.caption
      } else if (msg.message?.videoMessage?.caption) {
        body = msg.message.videoMessage.caption
      }

      // Determine media type
      let mediaType: InboundMessage['mediaType']
      if (msg.message?.imageMessage) mediaType = 'image'
      else if (msg.message?.videoMessage) mediaType = 'video'
      else if (msg.message?.audioMessage) mediaType = 'audio'
      else if (msg.message?.documentMessage) mediaType = 'document'
      else if (msg.message?.stickerMessage) mediaType = 'sticker'

      // For groups, use participant JID; for 1-1 chats, use remoteJid
      const senderJid = isGroup ? (msg.key.participant || remoteJid) : remoteJid

      return {
        id: msg.key.id || uuidv4(),
        userId,
        from: extractPhoneFromJid(senderJid),
        fromJid: senderJid, // Preserve original JID for replying
        fromName: msg.pushName,
        body,
        timestamp: new Date((msg.messageTimestamp || Date.now()) * 1000),
        isGroup,
        groupId: isGroup ? remoteJid : undefined,
        mediaType,
        quotedMessageId: msg.message?.extendedTextMessage?.contextInfo?.stanzaId,
        quotedMessage: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation,
      }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to normalize message')
      return null
    }
  }

  /**
   * Send a message
   */
  async sendMessage(userId: string, to: string, text: string): Promise<SendResult> {
    const connection = this.connections.get(userId)
    if (!connection?.socket || connection.status !== 'connected') {
      return {
        success: false,
        error: 'Not connected',
      }
    }

    try {
      const jid = formatPhoneForSending(to)
      const result = await connection.socket.sendMessage(jid, { text })

      logger.info({ userId, to: jid }, 'Message sent')

      return {
        success: true,
        messageId: result?.key?.id ?? undefined,
        timestamp: new Date(),
      }
    } catch (error) {
      logger.error({ userId, to, error }, 'Failed to send message')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get connection status for a user
   */
  getConnectionStatus(userId: string): UserConnection | null {
    return this.connections.get(userId) || null
  }

  /**
   * Get pairing session
   */
  getPairingSession(sessionId: string): PairingSession | null {
    return this.pairingSessions.get(sessionId) || null
  }

  /**
   * Disconnect a user
   */
  async disconnect(userId: string): Promise<void> {
    logger.info({ userId }, 'Disconnecting user')
    await this.cleanupUser(userId)
  }

  /**
   * Logout and clear credentials for a user
   */
  async logout(userId: string): Promise<void> {
    logger.info({ userId }, 'Logging out user')

    const connection = this.connections.get(userId)
    if (connection?.socket) {
      try {
        await connection.socket.logout()
      } catch {
        // Ignore logout errors
      }
    }

    await this.cleanupUser(userId)
    await this.authStorage.clearUserAuth(userId)
  }

  /**
   * Schedule reconnection for a user
   */
  private scheduleReconnect(userId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    // Check if we've exceeded max attempts
    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn({ userId, attempts: connection.reconnectAttempts }, 'Max reconnect attempts reached')
      return
    }

    // Calculate delay with exponential backoff and jitter
    const attempt = connection.reconnectAttempts
    const baseDelay = this.reconnectPolicy.initialDelayMs * Math.pow(this.reconnectPolicy.factor, attempt)
    const delay = Math.min(baseDelay, this.reconnectPolicy.maxDelayMs)
    const jitter = delay * this.reconnectPolicy.jitter * (Math.random() * 2 - 1)
    const finalDelay = Math.max(0, delay + jitter)

    logger.info({ userId, attempt: attempt + 1, delayMs: finalDelay }, 'Scheduling reconnect')

    // Clear any existing timer
    const existingTimer = this.reconnectTimers.get(userId)
    if (existingTimer) clearTimeout(existingTimer)

    // Schedule reconnect
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(userId)
      await this.reconnect(userId)
    }, finalDelay)

    this.reconnectTimers.set(userId, timer)
    connection.reconnectAttempts++
  }

  /**
   * Reconnect a user
   */
  private async reconnect(userId: string): Promise<void> {
    // Check if user has stored credentials
    const hasAuth = await this.authStorage.hasExistingAuth(userId)
    if (!hasAuth) {
      logger.warn({ userId }, 'No stored credentials for reconnect')
      return
    }

    logger.info({ userId }, 'Attempting reconnect')

    // Get or create connection record
    let connection = this.connections.get(userId)
    if (!connection) {
      // Create a new connection record for restoring from stored credentials
      connection = {
        userId,
        socket: null,
        status: 'connecting',
        authDir: this.authStorage.getUserAuthDir(userId),
        reconnectAttempts: 0,
        createdAt: new Date(),
      }
      this.connections.set(userId, connection)
    }

    try {
      // Clean up existing socket
      const cleanup = this.socketCleanups.get(userId)
      if (cleanup) cleanup()

      // Create new socket
      const { socket, cleanup: newCleanup } = await createUserSocket({
        userId,
        authStorage: this.authStorage,
        callbacks: {
          onCredsUpdate: () => {
            logger.debug({ userId }, 'Credentials saved')
          },
          onConnectionUpdate: (status, phoneNumber, jid) => {
            this.handleConnectionUpdate(userId, status, phoneNumber, jid)
          },
          onMessage: (upsert) => {
            this.handleMessages(userId, upsert)
          },
        },
      })

      connection.socket = socket
      this.socketCleanups.set(userId, newCleanup)
    } catch (error) {
      logger.error({ userId, error }, 'Reconnect failed')
      this.scheduleReconnect(userId)
    }
  }

  /**
   * Restore connections for users with stored credentials
   */
  async restoreConnections(): Promise<void> {
    logger.info('Restoring connections from stored credentials')

    const userIds = await this.authStorage.listStoredUsers()
    logger.info({ count: userIds.length }, 'Found stored users')

    for (const userId of userIds) {
      try {
        await this.reconnect(userId)
      } catch (error) {
        logger.error({ userId, error }, 'Failed to restore connection')
      }
    }
  }

  /**
   * Clean up resources for a user
   */
  private async cleanupUser(userId: string): Promise<void> {
    // Cancel reconnect timer
    const timer = this.reconnectTimers.get(userId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(userId)
    }

    // Run socket cleanup
    const cleanup = this.socketCleanups.get(userId)
    if (cleanup) {
      cleanup()
      this.socketCleanups.delete(userId)
    }

    // Remove connection
    this.connections.delete(userId)

    // Clean up pairing sessions for this user
    for (const [sessionId, session] of this.pairingSessions) {
      if (session.userId === userId) {
        this.pairingSessions.delete(sessionId)
      }
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(userId: string, status: ConnectionStatus): void {
    const connection = this.connections.get(userId)
    if (connection) {
      connection.status = status
    }
  }

  /**
   * Emit a gateway event
   */
  private emitEvent(event: GatewayEvent): void {
    this.emit('event', event)
    this.emit(event.type, event)
  }

  /**
   * Shutdown the connection manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down connection manager')

    // Cancel all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer)
    }
    this.reconnectTimers.clear()

    // Clean up all connections
    for (const userId of this.connections.keys()) {
      await this.cleanupUser(userId)
    }

    this.removeAllListeners()
  }
}

// Singleton instance
let connectionManagerInstance: ConnectionManager | null = null

export function getConnectionManager(options?: ConnectionManagerOptions): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager(options)
  }
  return connectionManagerInstance
}
