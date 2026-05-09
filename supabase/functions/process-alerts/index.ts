import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPreferences {
  user_id: string;
  phone_number: string | null;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

interface PendingAlert {
  id: string;
  user_id: string;
  channel: string;
  next_run_at: string;
  title: string;
  body: string;
  link: string;
  idea_id?: string;
  action_id?: string;
  type: 'idea' | 'action';
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
  const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${fromNumber}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio error:', error);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create an in-app notification
 */
async function createInAppNotification(
  supabase: any,
  alert: PendingAlert
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('in_app_notifications').insert({
      user_id: alert.user_id,
      type: alert.type === 'idea' ? 'idea_reminder' : 'action_reminder',
      idea_id: alert.idea_id || null,
      action_id: alert.action_id || null,
      title: alert.title,
      body: alert.body,
      link: alert.link,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process Alerts Edge Function
 *
 * Runs on a schedule (every minute via pg_cron) to process pending alerts.
 * Sends notifications via configured channels (WhatsApp, Push, In-App).
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing alerts...');
    const now = new Date().toISOString();

    // Fetch pending action alerts
    const { data: actionAlerts, error: actionError } = await supabase
      .from('action_alerts')
      .select(`
        id, user_id, channel, next_run_at,
        actions:action_id(id, text, idea_id, ideas:idea_id(title))
      `)
      .eq('status', 'active')
      .is('sent_at', null)
      .lte('next_run_at', now);

    if (actionError) {
      console.error('Error fetching action alerts:', actionError);
    }

    // Fetch pending idea alerts
    const { data: ideaAlerts, error: ideaError } = await supabase
      .from('idea_alerts')
      .select(`
        id, user_id, channel, next_run_at,
        ideas:idea_id(id, title)
      `)
      .eq('status', 'active')
      .is('sent_at', null)
      .lte('next_run_at', now);

    if (ideaError) {
      console.error('Error fetching idea alerts:', ideaError);
    }

    // Combine and normalize alerts
    const pendingAlerts: PendingAlert[] = [
      ...(actionAlerts || []).map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        channel: a.channel,
        next_run_at: a.next_run_at,
        title: `Action Reminder: ${a.actions?.ideas?.title || 'Unknown'}`,
        body: a.actions?.text || 'Action is due',
        link: `/ideas/${a.actions?.idea_id}`,
        action_id: a.actions?.id,
        idea_id: a.actions?.idea_id,
        type: 'action' as const,
      })),
      ...(ideaAlerts || []).map((i: any) => ({
        id: i.id,
        user_id: i.user_id,
        channel: i.channel,
        next_run_at: i.next_run_at,
        title: `Idea Reminder`,
        body: i.ideas?.title || 'Idea is due',
        link: `/ideas/${i.ideas?.id}`,
        idea_id: i.ideas?.id,
        type: 'idea' as const,
      })),
    ];

    console.log(`Found ${pendingAlerts.length} pending alerts`);

    if (pendingAlerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending alerts', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(pendingAlerts.map((a) => a.user_id).filter(Boolean))];

    // Fetch notification preferences for all users
    const { data: prefsData } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', userIds);

    const prefsMap = new Map<string, NotificationPreferences>(
      (prefsData || []).map((p: NotificationPreferences) => [p.user_id, p])
    );

    const results = [];

    // Process each alert
    for (const alert of pendingAlerts) {
      const prefs = prefsMap.get(alert.user_id);

      // Skip if user has quiet hours enabled
      if (prefs && isQuietHours(prefs)) {
        console.log(`Skipping alert ${alert.id} - quiet hours`);
        results.push({ id: alert.id, status: 'skipped', reason: 'quiet_hours' });
        continue;
      }

      let success = false;
      let errorMessage: string | undefined;

      // Send based on channel
      if (alert.channel === 'whatsapp') {
        if (prefs?.phone_number && prefs.whatsapp_enabled) {
          const message = `${alert.title}\n\n${alert.body}`;
          const result = await sendWhatsApp(prefs.phone_number, message);
          success = result.success;
          errorMessage = result.error;
        } else {
          success = false;
          errorMessage = 'WhatsApp not configured or disabled';
        }
      } else if (alert.channel === 'in_app') {
        if (!prefs || prefs.in_app_enabled) {
          const result = await createInAppNotification(supabase, alert);
          success = result.success;
          errorMessage = result.error;
        } else {
          success = false;
          errorMessage = 'In-app notifications disabled';
        }
      } else if (alert.channel === 'push') {
        // TODO: Implement web push notifications
        success = false;
        errorMessage = 'Push notifications not yet implemented';
      }

      // Update alert status
      const table = alert.type === 'action' ? 'action_alerts' : 'idea_alerts';
      const updateData = success
        ? { sent_at: new Date().toISOString(), status: 'completed' }
        : { error_message: errorMessage, status: 'failed' };

      await supabase.from(table).update(updateData).eq('id', alert.id);

      results.push({
        id: alert.id,
        type: alert.type,
        channel: alert.channel,
        success,
        error: errorMessage,
      });

      console.log(
        `${success ? '✓' : '✗'} Alert ${alert.id} (${alert.channel}): ${
          success ? 'sent' : errorMessage
        }`
      );

      // Small delay between notifications
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Processed ${results.length} alerts, ${successCount} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} alerts`,
        processed: results.length,
        successful: successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Alert processing failed:', error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
