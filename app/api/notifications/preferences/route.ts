import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NotificationPreferencesInput } from '@/types/notification.types';

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get existing preferences
    // Note: notification_preferences table is created by migration 20260427000001
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, create default ones
    if (!data) {
      const { data: newPrefs, error: insertError } = await (supabase as any)
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating preferences:', insertError);
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
      }

      return NextResponse.json(newPrefs);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Preferences API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: NotificationPreferencesInput = await req.json();

    // Validate phone number format if provided
    if (body.phone_number) {
      const phoneRegex = /^\+?[1-9]\d{6,14}$/;
      if (!phoneRegex.test(body.phone_number.replace(/\s/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' },
          { status: 400 }
        );
      }
    }

    // Update preferences
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Preferences API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
