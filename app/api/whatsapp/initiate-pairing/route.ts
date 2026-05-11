import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiatePairing, PairingMethod } from '@/lib/helpers/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const method: PairingMethod = body.method || 'qr_code'
    const phoneNumber: string | undefined = body.phoneNumber

    // Validate link code pairing requires phone number
    if (method === 'link_code' && !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required for link code pairing' },
        { status: 400 }
      )
    }

    // Call gateway to initiate pairing
    const result = await initiatePairing(user.id, method, phoneNumber)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Create or update connection record in database
    const { error: dbError } = await supabase
      .from('whatsapp_connections')
      .upsert({
        user_id: user.id,
        status: 'pending',
        pairing_method: method,
        pairing_session_id: result.sessionId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (dbError) {
      console.error('Failed to save connection record:', dbError)
      // Don't fail the request, gateway pairing is more important
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      method: result.method,
      linkCode: result.linkCode,
      expiresAt: result.expiresAt,
    })
  } catch (error) {
    console.error('Pairing initiation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
