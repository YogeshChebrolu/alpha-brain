import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPairingSessionStatus } from '@/lib/helpers/whatsapp'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get pairing session status from gateway
    const status = await getPairingSessionStatus(sessionId)

    // Verify session belongs to this user
    if (status.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // If connected, update database
    if (status.status === 'connected') {
      await supabase
        .from('whatsapp_connections')
        .update({
          status: 'connected',
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      success: true,
      sessionId: status.sessionId,
      method: status.method,
      status: status.status,
      qrCode: status.qrCode,
      linkCode: status.linkCode,
      expiresAt: status.expiresAt,
    })
  } catch (error) {
    console.error('Pairing status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get pairing status' },
      { status: 500 }
    )
  }
}
