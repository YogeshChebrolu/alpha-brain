import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

// Email provider used by the Password provider's `reset` flow. Emails an 8-digit
// OTP the user enters (with a new password) to reset. Reads AUTH_RESEND_KEY and
// AUTH_EMAIL from the Convex deployment env.
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, "0123456789", 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL ?? "Alpha Brain <onboarding@resend.dev>",
      to: [email],
      subject: "Reset your Alpha Brain password",
      text: `Your password reset code is ${token}\n\nThis code expires in 15 minutes. If you didn't request a reset, you can ignore this email.`,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
