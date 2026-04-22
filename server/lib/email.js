import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AWS_REGION, EMAIL_FROM } from "../src/config.js";

const sesClient = new SESv2Client({ region: AWS_REGION });

/**
 * Minimal HTML-escape for values interpolated into the email body.
 * We control the inputs but keep this defensive in case display names
 * later carry user-supplied characters like `<` or `&`.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildVerificationEmail({ to, displayName, verifyUrl }) {
  const name = displayName?.trim() || "there";
  const subject = "Verify your PitchPulse 26 email";

  const text = [
    `Hi ${name},`,
    "",
    "Welcome to PitchPulse 26. Please verify your email to start submitting predictions:",
    verifyUrl,
    "",
    "This link expires in 24 hours. If you didn't create this account, you can ignore this message.",
    "",
    "— PitchPulse 26",
  ].join("\n");

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verifyUrl);
  const html = `<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, sans-serif; background:#0f1b0e; color:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#111827; border:1px solid #374151; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 12px; font-size:20px;">
        <span style="color:#10b981;">Pitch</span>Pulse 26
      </h1>
      <p>Hi ${safeName},</p>
      <p>Welcome to PitchPulse 26. Click the button below to verify your email and start submitting predictions:</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${safeUrl}" style="background:#10b981; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Verify email</a>
      </p>
      <p style="font-size:12px; color:#9ca3af;">Or paste this link into your browser:</p>
      <p style="font-size:12px; color:#9ca3af; word-break:break-all;">${safeUrl}</p>
      <p style="font-size:12px; color:#9ca3af;">This link expires in 24 hours. If you didn't create this account, you can ignore this message.</p>
    </div>
  </body>
</html>`;

  return {
    FromEmailAddress: EMAIL_FROM,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: text, Charset: "UTF-8" },
          Html: { Data: html, Charset: "UTF-8" },
        },
      },
    },
  };
}

/**
 * Sends a verification email. Throws on SES errors so callers can decide
 * whether to surface the failure or swallow it (registration should not
 * fail just because SES is down — we fall back to the resend flow).
 */
export async function sendVerificationEmail({ to, displayName, verifyUrl }) {
  const command = new SendEmailCommand(
    buildVerificationEmail({ to, displayName, verifyUrl })
  );
  return sesClient.send(command);
}
