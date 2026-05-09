import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendNotification } from "@/lib/inngest/functions/send-notification";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendNotification],
  servePath: "/api/inngest",
});
