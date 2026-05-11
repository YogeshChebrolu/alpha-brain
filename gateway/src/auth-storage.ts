/**
 * Auth Storage
 * Manages WhatsApp credentials using file-based storage
 *
 * Directory structure:
 * /<authBasePath>/
 *   └── user-<userId>/
 *       ├── creds.json
 *       └── keys/
 *           ├── app-state-sync-key-<id>.json
 *           └── pre-key-<id>.json
 */

import { mkdir, rm, access, readdir } from 'fs/promises'
import { join } from 'path'
import { useMultiFileAuthState } from '@whiskeysockets/baileys'
import pino from 'pino'

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

const DEFAULT_AUTH_BASE_PATH = './.whatsapp-auth'

/**
 * File-based auth storage for WhatsApp credentials
 */
export class AuthStorage {
  private basePath: string

  constructor(basePath: string = DEFAULT_AUTH_BASE_PATH) {
    this.basePath = basePath
    logger.info({ basePath }, 'Auth storage initialized')
  }

  /**
   * Get the auth directory path for a specific user
   */
  getUserAuthDir(userId: string): string {
    // Sanitize userId to prevent path traversal
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_')
    return join(this.basePath, `user-${sanitizedUserId}`)
  }

  /**
   * Ensure the auth directory exists for a user
   */
  async ensureUserAuthDir(userId: string): Promise<string> {
    const authDir = this.getUserAuthDir(userId)
    await mkdir(authDir, { recursive: true })
    return authDir
  }

  /**
   * Check if a user has existing auth credentials
   */
  async hasExistingAuth(userId: string): Promise<boolean> {
    const authDir = this.getUserAuthDir(userId)
    const credsPath = join(authDir, 'creds.json')

    try {
      await access(credsPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Clear all auth credentials for a user
   */
  async clearUserAuth(userId: string): Promise<void> {
    const authDir = this.getUserAuthDir(userId)
    try {
      await rm(authDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore if directory doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  /**
   * Get Baileys auth state for a user
   * This uses Baileys' built-in multi-file auth state management
   */
  async getAuthState(userId: string) {
    const authDir = await this.ensureUserAuthDir(userId)
    return useMultiFileAuthState(authDir)
  }

  /**
   * List all users with stored auth credentials
   */
  async listStoredUsers(): Promise<string[]> {
    try {
      const entries = await readdir(this.basePath, { withFileTypes: true })
      return entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('user-'))
        .map(entry => entry.name.replace('user-', ''))
    } catch {
      return []
    }
  }

  /**
   * Get the base path for auth storage
   */
  getBasePath(): string {
    return this.basePath
  }
}
