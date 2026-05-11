/**
 * WhatsApp Gateway Types
 * Core interfaces and types for the WhatsApp gateway service
 */

import type { WASocket, ConnectionState } from '@whiskeysockets/baileys'

// ============================================================================
// Connection Types
// ============================================================================

export type ConnectionStatus =
  | 'pending'        // Initial state, waiting for pairing
  | 'qr_generated'   // QR code generated, waiting for scan
  | 'link_code_generated' // Link code generated, waiting for entry
  | 'connecting'     // Pairing in progress
  | 'connected'      // Successfully connected
  | 'disconnected'   // Disconnected, may reconnect
  | 'logged_out'     // User logged out (needs re-pairing)
  | 'error'          // Connection error

export type PairingMethod = 'qr_code' | 'link_code'

export interface UserConnection {
  userId: string
  socket: WASocket | null
  status: ConnectionStatus
  phoneNumber?: string
  jid?: string
  authDir: string
  lastConnectedAt?: Date
  lastDisconnectedAt?: Date
  reconnectAttempts: number
  createdAt: Date
}

export interface ConnectionResult {
  success: boolean
  status: ConnectionStatus
  phoneNumber?: string
  jid?: string
  error?: string
}

// ============================================================================
// Pairing Types
// ============================================================================

export interface PairingSession {
  userId: string
  method: PairingMethod
  sessionId: string
  status: ConnectionStatus
  qrCode?: string       // Base64 QR code image
  linkCode?: string     // 8-character pairing code
  expiresAt: Date
  createdAt: Date
}

export interface PairingResult {
  success: boolean
  sessionId: string
  method: PairingMethod
  qrCode?: string
  linkCode?: string
  expiresAt: Date
  error?: string
}

// ============================================================================
// Message Types
// ============================================================================

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

export interface OutboundMessage {
  to: string            // Phone number or JID
  text: string
  quotedMessageId?: string
}

export interface SendResult {
  success: boolean
  messageId?: string
  timestamp?: Date
  error?: string
}

// ============================================================================
// Event Types
// ============================================================================

export type GatewayEventType =
  | 'connection:status'
  | 'connection:qr'
  | 'connection:link_code'
  | 'connection:connected'
  | 'connection:disconnected'
  | 'connection:error'
  | 'message:received'
  | 'message:sent'

export interface GatewayEvent {
  type: GatewayEventType
  userId: string
  data: unknown
  timestamp: Date
}

export interface ConnectionStatusEvent {
  type: 'connection:status'
  userId: string
  data: {
    status: ConnectionStatus
    phoneNumber?: string
    jid?: string
  }
  timestamp: Date
}

export interface QRCodeEvent {
  type: 'connection:qr'
  userId: string
  data: {
    qrCode: string      // Base64 encoded QR image
    expiresIn: number   // Seconds until expiry
  }
  timestamp: Date
}

export interface LinkCodeEvent {
  type: 'connection:link_code'
  userId: string
  data: {
    linkCode: string    // 8-character code
    expiresIn: number   // Seconds until expiry
  }
  timestamp: Date
}

export interface MessageReceivedEvent {
  type: 'message:received'
  userId: string
  data: InboundMessage
  timestamp: Date
}

// ============================================================================
// Handler Types
// ============================================================================

export type MessageHandler = (message: InboundMessage) => Promise<void> | void

export type EventHandler = (event: GatewayEvent) => void

// ============================================================================
// Config Types
// ============================================================================

export interface GatewayConfig {
  port: number
  host: string
  authBasePath: string          // Base path for auth credentials
  reconnectPolicy: ReconnectPolicy
  maxReconnectAttempts: number
  qrCodeExpirySeconds: number
  linkCodeExpirySeconds: number
}

export interface ReconnectPolicy {
  initialDelayMs: number
  maxDelayMs: number
  factor: number
  jitter: number
}

// ============================================================================
// API Types
// ============================================================================

export interface InitiatePairingRequest {
  userId: string
  method: PairingMethod
}

export interface InitiatePairingResponse {
  success: boolean
  sessionId: string
  method: PairingMethod
  linkCode?: string
  expiresAt: string
  error?: string
}

export interface SendMessageRequest {
  userId: string
  to: string
  text: string
  quotedMessageId?: string
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface ConnectionStatusRequest {
  userId: string
}

export interface ConnectionStatusResponse {
  connected: boolean
  status: ConnectionStatus
  phoneNumber?: string
  jid?: string
  lastConnectedAt?: string
}

export interface DisconnectRequest {
  userId: string
}

export interface DisconnectResponse {
  success: boolean
  error?: string
}
