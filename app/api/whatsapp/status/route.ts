import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConnectionStatus } from '@/lib/helpers/whatsapp'

export async function GET(_request: NextRequest) {
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

    // Get connection status from gateway
    const status = await getConnectionStatus(user.id)

    // Also get from database for additional info
    const { data: dbConnection } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      connected: status.connected,
      status: status.status,
      phoneNumber: status.phoneNumber || dbConnection?.phone_number,
      jid: status.jid || dbConnection?.jid,
      lastConnectedAt: status.lastConnectedAt || dbConnection?.last_connected_at,
    })
  } catch (error) {
    console.error('Status check error:', error)

    // If gateway is down, try to get status from database
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: dbConnection } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (dbConnection) {
          return NextResponse.json({
            success: true,
            connected: false,
            status: 'disconnected',
            phoneNumber: dbConnection.phone_number,
            lastConnectedAt: dbConnection.last_connected_at,
            gatewayOffline: true,
          })
        }
      }
    } catch {
      // Ignore database errors
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get connection status' },
      { status: 500 }
    )
  }
}
