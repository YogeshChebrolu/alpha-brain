import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/notifications/[id]/dismiss
 * Dismiss a notification
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Note: in_app_notifications table is created by migration 20260427000001
    const { data, error } = await (supabase as any)
      .from('in_app_notifications')
      .update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error dismissing notification:', error);
      return NextResponse.json({ error: 'Failed to dismiss notification' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Notification dismiss API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
