/**
 * Socket Factory
 * Creates and configures Baileys WhatsApp sockets for each user
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  ConnectionState,
  BaileysEventMap,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import * as QRCode from 'qrcode'
import { AuthStorage } from './auth-storage.js'
import type { ConnectionStatus, PairingMethod } from './types.js'

// Logger configuration
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

export interface SocketCallbacks {
  onQR?: (qr: string, qrImage: string) => void           // qr = raw string, qrImage = base64 data URL
  onLinkCode?: (code: string) => void
  onCredsUpdate?: () => void
  onConnectionUpdate?: (status: ConnectionStatus, phoneNumber?: string, jid?: string) => void
  onMessage?: (message: BaileysEventMap['messages.upsert']) => void
}

export interface CreateSocketOptions {
  userId: string
  authStorage?: AuthStorage
  callbacks?: SocketCallbacks
  pairingMethod?: PairingMethod
  phoneNumber?: string                                    // Required for link code pairing
}

export interface CreateSocketResult {
  socket: WASocket
  cleanup: () => void
}

/**
 * Create a Baileys WhatsApp socket for a user
 */
export async function createUserSocket(options: CreateSocketOptions): Promise<CreateSocketResult> {
  const {
    userId,
    authStorage,
    callbacks = {},
    pairingMethod = 'qr_code',
    phoneNumber
  } = options

  if (!authStorage) {
    throw new Error('authStorage is required')
  }

  // Get auth state for this user
  const { state, saveCreds } = await authStorage.getAuthState(userId)

  // Fetch latest Baileys version
  const { version } = await fetchLatestBaileysVersion()

  logger.info({ userId, version }, 'Creating WhatsApp socket')

  // Create socket
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ module: 'keys' })),
    },
    printQRInTerminal: false,        // We handle QR ourselves
    logger: logger.child({ module: 'baileys', userId }),
    browser: ['Alpha Brain', 'Web', '1.0.0'],
    syncFullHistory: false,          // Don't sync full history (saves resources)
    markOnlineOnConnect: false,      // Don't mark as online automatically
    generateHighQualityLinkPreview: false,
  })

  // Track cleanup functions
  const cleanupFns: (() => void)[] = []

  // Handle credentials update
  sock.ev.on('creds.update', async () => {
    logger.debug({ userId }, 'Credentials updated, saving...')
    await saveCreds()
    callbacks.onCredsUpdate?.()
  })
  cleanupFns.push(() => sock.ev.removeAllListeners('creds.update'))

  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    logger.debug({ userId, connection, hasQR: !!qr }, 'Connection update')

    // Handle QR code
    if (qr && pairingMethod === 'qr_code') {
      logger.info({ userId }, 'QR code received')
      try {
        // Generate QR code as data URL
        const qrImage = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: {
            dark: '#1E293B',
            light: '#FFFFFF'
          }
        })
        callbacks.onQR?.(qr, qrImage)
        callbacks.onConnectionUpdate?.('qr_generated')
      } catch (err) {
        logger.error({ userId, err }, 'Failed to generate QR code image')
      }
    }

    // Handle connection state changes
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const reason = DisconnectReason[statusCode] || 'Unknown'

      logger.info({ userId, statusCode, reason }, 'Connection closed')

      if (statusCode === DisconnectReason.loggedOut) {
        // User logged out - clear credentials
        logger.warn({ userId }, 'User logged out, clearing credentials')
        await authStorage.clearUserAuth(userId)
        callbacks.onConnectionUpdate?.('logged_out')
      } else if (statusCode === DisconnectReason.restartRequired) {
        // Need to restart connection
        callbacks.onConnectionUpdate?.('disconnected')
      } else {
        // Other disconnect reason
        callbacks.onConnectionUpdate?.('disconnected')
      }
    } else if (connection === 'open') {
      // Successfully connected
      const me = sock.user
      const phoneNumber = me?.id?.split(':')[0] || me?.id?.split('@')[0]
      const jid = me?.id

      logger.info({ userId, phoneNumber, jid }, 'Connected to WhatsApp')
      callbacks.onConnectionUpdate?.('connected', phoneNumber, jid)
    } else if (connection === 'connecting') {
      callbacks.onConnectionUpdate?.('connecting')
    }
  })
  cleanupFns.push(() => sock.ev.removeAllListeners('connection.update'))

  // Handle incoming messages
  sock.ev.on('messages.upsert', (upsert) => {
    // Filter out our own messages and status broadcasts
    const messages = upsert.messages.filter(m => {
      // Skip our own messages
      if (m.key.fromMe) return false
      // Skip status broadcasts
      if (m.key.remoteJid === 'status@broadcast') return false
      return true
    })

    if (messages.length > 0) {
      logger.debug({ userId, count: messages.length }, 'Messages received')
      callbacks.onMessage?.({ ...upsert, messages })
    }
  })
  cleanupFns.push(() => sock.ev.removeAllListeners('messages.upsert'))

  // If using link code pairing and we have a phone number, request pairing code
  if (pairingMethod === 'link_code' && phoneNumber && !state.creds.registered) {
    logger.info({ userId, phoneNumber }, 'Requesting pairing code')

    // Wait a bit for socket to initialize
    setTimeout(async () => {
      try {
        // Format phone number (remove + and spaces)
        const formattedPhone = phoneNumber.replace(/[^0-9]/g, '')
        const code = await sock.requestPairingCode(formattedPhone)
        logger.info({ userId, code }, 'Pairing code generated')
        callbacks.onLinkCode?.(code)
        callbacks.onConnectionUpdate?.('link_code_generated')
      } catch (err) {
        logger.error({ userId, err }, 'Failed to request pairing code')
        callbacks.onConnectionUpdate?.('error')
      }
    }, 3000)
  }

  // Cleanup function
  const cleanup = () => {
    logger.info({ userId }, 'Cleaning up socket')
    cleanupFns.forEach(fn => fn())
    try {
      sock.end(undefined)
    } catch {
      // Ignore errors during cleanup
    }
  }

  return { socket: sock, cleanup }
}

/**
 * Extract phone number from JID
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split(':')[0]?.split('@')[0] || jid
}

/**
 * Format phone number or JID for sending
 * Handles both plain phone numbers and full JIDs (@s.whatsapp.net, @lid, etc.)
 */
export function formatPhoneForSending(phoneOrJid: string): string {
  // If already a full JID (contains @), return as-is
  if (phoneOrJid.includes('@')) {
    return phoneOrJid
  }

  // Plain phone number - clean it and add @s.whatsapp.net
  const cleaned = phoneOrJid.replace(/[^0-9]/g, '')
  return `${cleaned}@s.whatsapp.net`
}
