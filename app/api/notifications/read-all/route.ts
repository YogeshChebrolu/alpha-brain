import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
export async function PUT() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Note: in_app_notifications table is created by migration 20260427000001
    const { error } = await (supabase as any)
      .from('in_app_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Read all API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
