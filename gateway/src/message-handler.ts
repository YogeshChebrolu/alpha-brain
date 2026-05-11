/**
 * Message Handler
 * Processes incoming WhatsApp messages and generates responses
 *
 * MVP: Simple echo handler ("Hi" → "Hi how are you doing")
 * Future: Full AI agent integration
 */

import pino from 'pino'
import type { InboundMessage, MessageHandler } from './types.js'
import { getConnectionManager } from './connection-manager.js'

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

/**
 * Create a simple echo message handler
 * MVP: Responds to "Hi" with "Hi how are you doing"
 */
export function createEchoHandler(): MessageHandler {
  const connectionManager = getConnectionManager()

  return async (message: InboundMessage) => {
    const { userId, from, fromJid, body, isGroup } = message

    // Skip group messages for now
    if (isGroup) {
      logger.debug({ userId, from }, 'Skipping group message')
      return
    }

    // Normalize message body
    const normalizedBody = body.toLowerCase().trim()

    logger.info({ userId, from, fromJid, body: normalizedBody }, 'Processing message')

    // MVP: Echo handler
    if (normalizedBody === 'hi' || normalizedBody === 'hello' || normalizedBody === 'hey') {
      logger.info({ userId, from, fromJid }, 'Matched greeting, sending response')

      const response = 'Hi how are you doing'

      // Use fromJid (original JID) for replying to handle both @s.whatsapp.net and @lid formats
      const result = await connectionManager.sendMessage(userId, fromJid, response)

      if (result.success) {
        logger.info({ userId, from, fromJid, messageId: result.messageId }, 'Response sent successfully')
      } else {
        logger.error({ userId, from, fromJid, error: result.error }, 'Failed to send response')
      }

      return
    }

    // Future: Handle other commands
    // For now, just log unhandled messages
    logger.debug({ userId, from, body: normalizedBody }, 'Unhandled message')
  }
}

/**
 * Command-based message handler
 * Supports explicit commands like /help, /status, etc.
 */
export function createCommandHandler(): MessageHandler {
  const connectionManager = getConnectionManager()

  const commands: Record<string, (message: InboundMessage) => Promise<string>> = {
    '/help': async () => {
      return `*Alpha Brain WhatsApp Commands*

/help - Show this help message
/status - Check connection status
/ping - Test if bot is responsive

More features coming soon!`
    },

    '/status': async (message) => {
      const status = connectionManager.getConnectionStatus(message.userId)
      if (!status) {
        return 'No connection information available'
      }
      return `*Connection Status*

Status: ${status.status}
Phone: ${status.phoneNumber || 'Unknown'}
Connected since: ${status.lastConnectedAt?.toISOString() || 'N/A'}`
    },

    '/ping': async () => {
      return 'Pong! Alpha Brain is active.'
    },
  }

  return async (message: InboundMessage) => {
    const { userId, from, fromJid, body, isGroup } = message

    // Skip group messages
    if (isGroup) return

    const normalizedBody = body.toLowerCase().trim()

    // Check for commands
    for (const [command, handler] of Object.entries(commands)) {
      if (normalizedBody.startsWith(command)) {
        logger.info({ userId, from, fromJid, command }, 'Processing command')

        try {
          const response = await handler(message)
          // Use fromJid for replying to handle both @s.whatsapp.net and @lid formats
          await connectionManager.sendMessage(userId, fromJid, response)
        } catch (error) {
          logger.error({ userId, from, fromJid, command, error }, 'Command handler error')
          await connectionManager.sendMessage(userId, fromJid, 'An error occurred processing your command')
        }

        return
      }
    }

    // Fall back to echo handler for greetings
    const echoHandler = createEchoHandler()
    await echoHandler(message)
  }
}

/**
 * Create a combined message handler
 * Handles both commands and natural language
 */
export function createMessageHandler(): MessageHandler {
  // For MVP, use the command handler (which includes echo)
  return createCommandHandler()
}
