import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * Get user's in-app notifications
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const includeRead = searchParams.get('includeRead') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';

    // Count only mode for unread badge
    // Note: in_app_notifications table is created by migration 20260427000001
    if (countOnly) {
      const { count, error } = await (supabase as any)
        .from('in_app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('dismissed', false);

      if (error) {
        console.error('Error fetching notification count:', error);
        return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
      }

      return NextResponse.json({ count: count || 0 });
    }

    // Fetch notifications with related data
    let query = (supabase as any)
      .from('in_app_notifications')
      .select(`
        *,
        ideas:idea_id(title),
        actions:action_id(text)
      `)
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeRead) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Transform to include context
    const notifications = data.map((n: any) => ({
      ...n,
      idea_title: n.ideas?.title,
      action_text: n.actions?.text,
      ideas: undefined,
      actions: undefined,
    }));

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error('Notifications API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
