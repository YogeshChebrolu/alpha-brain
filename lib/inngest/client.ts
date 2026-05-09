import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "alpha-brain",
  name: "Alpha Brain Notifications",
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: false, // Force cloud mode
});
