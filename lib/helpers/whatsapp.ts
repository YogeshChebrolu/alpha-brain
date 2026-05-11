/**
 * WhatsApp Gateway Client
 * Communicates with the WhatsApp gateway service
 */

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:3001'
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'development-key'

export type ConnectionStatus =
  | 'pending'
  | 'qr_generated'
  | 'link_code_generated'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'logged_out'
  | 'error'

export type PairingMethod = 'qr_code' | 'link_code'

export interface PairingResult {
  success: boolean
  sessionId: string
  method: PairingMethod
  linkCode?: string
  expiresAt: string
  error?: string
}

export interface PairingSessionStatus {
  sessionId: string
  userId: string
  method: PairingMethod
  status: ConnectionStatus
  qrCode?: string
  linkCode?: string
  expiresAt: string
  createdAt: string
}

export interface ConnectionStatusResult {
  connected: boolean
  status: ConnectionStatus
  phoneNumber?: string
  jid?: string
  lastConnectedAt?: string
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Make a request to the gateway
 */
async function gatewayRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GATEWAY_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': GATEWAY_API_KEY,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `Gateway request failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Initiate WhatsApp pairing for a user
 */
export async function initiatePairing(
  userId: string,
  method: PairingMethod = 'qr_code',
  phoneNumber?: string
): Promise<PairingResult> {
  return gatewayRequest<PairingResult>('/api/pairing/initiate', {
    method: 'POST',
    body: JSON.stringify({ userId, method, phoneNumber }),
  })
}

/**
 * Get the status of a pairing session
 */
export async function getPairingSessionStatus(
  sessionId: string
): Promise<PairingSessionStatus> {
  return gatewayRequest<PairingSessionStatus>(`/api/pairing/${sessionId}/status`)
}

/**
 * Get WhatsApp connection status for a user
 */
export async function getConnectionStatus(
  userId: string
): Promise<ConnectionStatusResult> {
  return gatewayRequest<ConnectionStatusResult>(`/api/connection/${userId}/status`)
}

/**
 * Disconnect WhatsApp for a user (keeps credentials)
 */
export async function disconnectWhatsApp(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return gatewayRequest(`/api/connection/${userId}/disconnect`, {
    method: 'POST',
  })
}

/**
 * Logout and clear WhatsApp credentials for a user
 */
export async function logoutWhatsApp(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return gatewayRequest(`/api/connection/${userId}/logout`, {
    method: 'POST',
  })
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsAppMessage(
  userId: string,
  to: string,
  text: string
): Promise<SendMessageResult> {
  return gatewayRequest<SendMessageResult>('/api/send', {
    method: 'POST',
    body: JSON.stringify({ userId, to, text }),
  })
}

/**
 * Check if the gateway is healthy
 */
export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GATEWAY_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the WebSocket URL for real-time events
 */
export function getWebSocketUrl(userId: string): string {
  const wsUrl = GATEWAY_URL.replace('http://', 'ws://').replace('https://', 'wss://')
  return `${wsUrl}/ws?userId=${userId}`
}
