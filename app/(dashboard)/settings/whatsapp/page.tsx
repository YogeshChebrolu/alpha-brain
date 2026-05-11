'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, QrCode, Hash, Phone, CheckCircle, XCircle, Loader2, RefreshCw, LogOut } from 'lucide-react'
import Link from 'next/link'
import { getWebSocketUrl } from '@/lib/helpers/whatsapp'

type ConnectionStatus =
  | 'pending'
  | 'qr_generated'
  | 'link_code_generated'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'logged_out'
  | 'error'

type PairingMethod = 'qr_code' | 'link_code'

interface PairingSession {
  sessionId: string
  method: PairingMethod
  status: ConnectionStatus
  qrCode?: string
  linkCode?: string
  expiresAt: string
}

interface ConnectionState {
  connected: boolean
  status: ConnectionStatus
  phoneNumber?: string
  lastConnectedAt?: string
}

export default function WhatsAppSettingsPage() {
  const [step, setStep] = useState<'initial' | 'method' | 'pairing' | 'connected'>('initial')
  const [pairingMethod, setPairingMethod] = useState<PairingMethod>('qr_code')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [session, setSession] = useState<PairingSession | null>(null)
  const [connection, setConnection] = useState<ConnectionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check initial connection status
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()

      if (data.success && data.connected) {
        setConnection(data)
        setStep('connected')
      } else {
        setStep('initial')
      }
    } catch (err) {
      console.error('Failed to check status:', err)
    } finally {
      setLoading(false)
    }
  }

  // Start pairing
  const startPairing = async () => {
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { method: pairingMethod }
      if (pairingMethod === 'link_code') {
        if (!phoneNumber) {
          setError('Phone number is required for link code pairing')
          setLoading(false)
          return
        }
        body.phoneNumber = phoneNumber.replace(/[^0-9+]/g, '')
      }

      const res = await fetch('/api/whatsapp/initiate-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to start pairing')
        setLoading(false)
        return
      }

      setSession({
        sessionId: data.sessionId,
        method: data.method,
        status: 'pending',
        linkCode: data.linkCode,
        expiresAt: data.expiresAt,
      })
      setStep('pairing')

      // Start polling for status
      pollPairingStatus(data.sessionId)
    } catch (err) {
      setError('Failed to initiate pairing')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Poll pairing status
  const pollPairingStatus = useCallback(async (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/pairing-status/${sessionId}`)
        const data = await res.json()

        if (!data.success) {
          clearInterval(interval)
          return
        }

        setSession(prev => prev ? { ...prev, ...data } : null)

        // Check connection status first - this takes priority over expiry
        if (data.status === 'connected') {
          clearInterval(interval)
          await checkConnectionStatus()
          return // Stop processing - we're connected!
        }

        if (data.status === 'error' || data.status === 'logged_out') {
          clearInterval(interval)
          setError('Pairing failed. Please try again.')
          setStep('method')
          return
        }

        // Only check expiry if not connected
        // Also check the actual connection status in case session wasn't updated
        if (new Date(data.expiresAt) < new Date()) {
          // Before showing expired, do one final connection check
          const statusRes = await fetch('/api/whatsapp/status')
          const statusData = await statusRes.json()

          if (statusData.success && statusData.connected) {
            clearInterval(interval)
            setConnection(statusData)
            setStep('connected')
            return
          }

          clearInterval(interval)
          setError('Pairing session expired. Please try again.')
          setStep('method')
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)

    // Clean up after 5 minutes max
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // Disconnect
  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      setConnection(null)
      setStep('initial')
    } catch (err) {
      console.error('Disconnect error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Logout (clear credentials)
  const handleLogout = async () => {
    if (!confirm('This will unlink your WhatsApp. You will need to scan the QR code again to reconnect.')) {
      return
    }

    setLoading(true)
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' })
      setConnection(null)
      setStep('initial')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Send test message
  const sendTestMessage = async () => {
    if (!connection?.phoneNumber) return

    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: connection.phoneNumber,
          text: 'Test message from Alpha Brain! Reply "Hi" to test the echo feature.',
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert('Test message sent! Check your WhatsApp.')
      } else {
        alert('Failed to send test message: ' + data.error)
      }
    } catch (err) {
      console.error('Send test error:', err)
      alert('Failed to send test message')
    } finally {
      setLoading(false)
    }
  }

  if (loading && step === 'initial') {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#6366F1]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-neutral-900">WhatsApp Integration</h1>
        <p className="text-neutral-500 mt-1">
          Connect your WhatsApp to receive notifications and interact with Alpha Brain
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {/* Initial state - not connected */}
      {step === 'initial' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-[#25D366]" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Connect WhatsApp
            </h2>
            <p className="text-neutral-500 mb-6 max-w-md mx-auto">
              Link your WhatsApp to receive action reminders, portfolio updates, and interact with Alpha Brain on the go.
            </p>
            <button
              onClick={() => setStep('method')}
              className="px-6 py-3 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#128C7E] transition-colors"
            >
              Connect WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Method selection */}
      {step === 'method' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Choose pairing method
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setPairingMethod('qr_code')}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                pairingMethod === 'qr_code'
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <QrCode className={`w-6 h-6 mb-2 ${pairingMethod === 'qr_code' ? 'text-neutral-900' : 'text-neutral-400'}`} />
              <div className="font-medium text-neutral-900">QR Code</div>
              <div className="text-sm text-neutral-500">Scan with your phone camera</div>
            </button>

            <button
              onClick={() => setPairingMethod('link_code')}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                pairingMethod === 'link_code'
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <Hash className={`w-6 h-6 mb-2 ${pairingMethod === 'link_code' ? 'text-neutral-900' : 'text-neutral-400'}`} />
              <div className="font-medium text-neutral-900">Link Code</div>
              <div className="text-sm text-neutral-500">Enter 8-digit code in WhatsApp</div>
            </button>
          </div>

          {/* Phone number input for link code */}
          {pairingMethod === 'link_code' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Your phone number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
              <p className="text-xs text-neutral-500 mt-2">
                Include country code (e.g., +1 for US)
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('initial')}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={startPairing}
              disabled={loading || (pairingMethod === 'link_code' && !phoneNumber)}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Pairing in progress */}
      {step === 'pairing' && session && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          {session.method === 'qr_code' ? (
            <>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 text-center">
                Scan QR Code
              </h2>

              <div className="flex justify-center mb-6">
                {session.qrCode ? (
                  <img
                    src={session.qrCode}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64 border border-neutral-200 rounded-xl"
                  />
                ) : (
                  <div className="w-64 h-64 border border-neutral-200 rounded-xl flex items-center justify-center bg-neutral-50">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                  </div>
                )}
              </div>

              <ol className="text-sm text-neutral-500 space-y-2 mb-6 max-w-sm mx-auto">
                <li>1. Open WhatsApp on your phone</li>
                <li>2. Tap Menu (⋮) or Settings → Linked Devices</li>
                <li>3. Tap &quot;Link a Device&quot;</li>
                <li>4. Point your camera at this QR code</li>
              </ol>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 text-center">
                Enter Link Code
              </h2>

              <div className="text-center mb-6">
                {session.linkCode ? (
                  <div className="inline-block px-8 py-4 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
                    <span className="text-3xl font-mono font-bold tracking-widest text-neutral-900">
                      {session.linkCode.slice(0, 4)}-{session.linkCode.slice(4)}
                    </span>
                  </div>
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto" />
                )}
              </div>

              <ol className="text-sm text-neutral-500 space-y-2 mb-6 max-w-sm mx-auto">
                <li>1. Open WhatsApp on your phone</li>
                <li>2. Tap Menu (⋮) or Settings → Linked Devices</li>
                <li>3. Tap &quot;Link a Device&quot;</li>
                <li>4. Tap &quot;Link with phone number instead&quot;</li>
                <li>5. Enter the code shown above</li>
              </ol>
            </>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setSession(null)
                setStep('method')
              }}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Start Over
            </button>
          </div>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Waiting for you to scan...
          </p>
        </div>
      )}

      {/* Connected */}
      {step === 'connected' && connection && (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  WhatsApp Connected
                </h2>
                <p className="text-neutral-500">
                  {connection.phoneNumber ? `+${connection.phoneNumber}` : 'Connected'}
                </p>
              </div>
            </div>

            {connection.lastConnectedAt && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">
                  Connected since:{' '}
                  {new Date(connection.lastConnectedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Test message */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-2">Test Connection</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Send a test message to verify your connection is working. Try replying &quot;Hi&quot; to test the echo feature!
            </p>
            <button
              onClick={sendTestMessage}
              disabled={loading}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Test Message
            </button>
          </div>

          {/* Disconnect */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-2">Manage Connection</h3>
            <div className="flex gap-3">
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Disconnect
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-4 py-2 border border-red-200 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Unlink WhatsApp
              </button>
            </div>
            <p className="text-sm text-neutral-500 mt-2">
              Disconnect keeps your credentials. Unlink removes them completely.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
