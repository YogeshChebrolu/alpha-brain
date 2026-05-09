import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/service";

interface NotificationPayload {
  alertId: string;
  alertType: "action" | "idea";
  channel: "in_app" | "whatsapp" | "sms" | "push";
  userId: string;
  title: string;
  body: string;
  link: string;
  ideaId?: string;
  actionId?: string;
}

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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

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
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

export const sendNotification = inngest.createFunction(
  {
    id: "send-notification",
    name: "Send Notification Alert",
    triggers: { event: "notification/send" },
  },
  async ({ event, step }) => {
    const payload = event.data as NotificationPayload;

    // Step 1: Check alert status (in case it was cancelled)
    const alertStatus = await step.run("check-alert-status", async () => {
      const supabase = createServiceClient();
      const table = payload.alertType === "action" ? "action_alerts" : "idea_alerts";
      const { data } = await supabase
        .from(table)
        .select("status")
        .eq("id", payload.alertId)
        .single();

      return data?.status;
    });

    // Skip if alert was cancelled
    if (alertStatus === "cancelled" || alertStatus === "completed") {
      return {
        skipped: true,
        reason: `Alert status is ${alertStatus}`,
      };
    }

    // Step 2: Get user preferences
    const preferences = await step.run("get-preferences", async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", payload.userId)
        .single();
      return data as NotificationPreferences | null;
    });

    // Step 3: Check quiet hours
    if (preferences && isQuietHours(preferences)) {
      return { skipped: true, reason: "quiet_hours" };
    }

    let success = false;
    let errorMessage: string | undefined;

    // Step 4: Send notification based on channel
    if (payload.channel === "in_app") {
      const result = await step.run("create-in-app-notification", async () => {
        try {
          const supabase = createServiceClient();
          const { error } = await supabase.from("in_app_notifications").insert({
            user_id: payload.userId,
            type: payload.alertType === "action" ? "action_reminder" : "idea_reminder",
            idea_id: payload.ideaId || null,
            action_id: payload.actionId || null,
            title: payload.title,
            body: payload.body,
            link: payload.link,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      success = result.success;
      errorMessage = 'error' in result ? result.error : undefined;
    } else if (payload.channel === "whatsapp") {
      const result = await step.run("send-whatsapp", async () => {
        if (!preferences?.phone_number || !preferences.whatsapp_enabled) {
          return {
            success: false,
            error: "WhatsApp not configured or disabled",
          };
        }

        const message = `${payload.title}\n\n${payload.body}`;
        return await sendWhatsApp(preferences.phone_number, message);
      });

      success = result.success;
      errorMessage = 'error' in result ? result.error : undefined;
    } else if (payload.channel === "push") {
      // TODO: Implement web push notifications
      success = false;
      errorMessage = "Push notifications not yet implemented";
    }

    // Step 5: Mark alert as completed or failed
    await step.run("mark-alert-completed", async () => {
      const supabase = createServiceClient();
      const table = payload.alertType === "action" ? "action_alerts" : "idea_alerts";

      const updateData = success
        ? { sent_at: new Date().toISOString(), status: "completed" }
        : { error_message: errorMessage, status: "failed" };

      await supabase.from(table).update(updateData).eq("id", payload.alertId);
    });

    return {
      success,
      channel: payload.channel,
      error: errorMessage,
    };
  }
);
