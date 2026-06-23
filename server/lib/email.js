import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AWS_REGION, EMAIL_FROM, RESEND_API_KEY } from "../src/config.js";

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

function buildVerificationEmailContent({ displayName, verifyUrl }) {
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
  <body style="margin:0; font-family:-apple-system, Segoe UI, sans-serif; background:#0f1b0e; color:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#111827; border:1px solid #374151; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 12px; font-size:20px; color:#f9fafb;">
        <span style="color:#10b981;">Pitch</span>Pulse 26
      </h1>
      <p style="margin:0 0 12px; color:#f9fafb;">Hi ${safeName},</p>
      <p style="margin:0 0 12px; color:#e5e7eb;">Welcome to PitchPulse 26. Click the button below to verify your email and start submitting predictions:</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${safeUrl}" style="background:#10b981; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Verify email</a>
      </p>
      <p style="font-size:12px; color:#9ca3af; margin:0 0 8px;">Or paste this link into your browser:</p>
      <p style="font-size:12px; color:#9ca3af; word-break:break-all;">${safeUrl}</p>
      <p style="font-size:12px; color:#9ca3af; margin:16px 0 0;">This link expires in 24 hours. If you didn't create this account, you can ignore this message.</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

function buildPasswordResetEmailContent({ displayName, resetUrl }) {
  const name = displayName?.trim() || "there";
  const subject = "Reset your PitchPulse 26 password";

  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset your PitchPulse 26 password.",
    "Use the link below to choose a new password:",
    resetUrl,
    "",
    "This link expires in 1 hour. If you didn't request a password reset, you can ignore this message.",
    "",
    "— PitchPulse 26",
  ].join("\n");

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);
  const html = `<!doctype html>
<html>
  <body style="margin:0; font-family:-apple-system, Segoe UI, sans-serif; background:#0f1b0e; color:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#111827; border:1px solid #374151; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 12px; font-size:20px; color:#f9fafb;">
        <span style="color:#10b981;">Pitch</span>Pulse 26
      </h1>
      <p style="margin:0 0 12px; color:#f9fafb;">Hi ${safeName},</p>
      <p style="margin:0 0 12px; color:#e5e7eb;">We received a request to reset your password. Click the button below to choose a new one:</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${safeUrl}" style="background:#10b981; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Reset password</a>
      </p>
      <p style="font-size:12px; color:#9ca3af; margin:0 0 8px;">Or paste this link into your browser:</p>
      <p style="font-size:12px; color:#9ca3af; word-break:break-all;">${safeUrl}</p>
      <p style="font-size:12px; color:#9ca3af; margin:16px 0 0;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this message.</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

function buildSesEmail({ to, subject, text, html }) {
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

async function sendResendEmail({ to, subject, text, html }) {
  if (!RESEND_API_KEY) {
    const err = new Error("RESEND_API_KEY environment variable is required");
    err.code = "RESEND_API_KEY_MISSING";
    throw err;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(payload?.message || payload?.error || "Resend email request failed");
    err.code = payload?.name || payload?.error || `RESEND_${response.status}`;
    err.status = response.status;
    err.details = payload;
    throw err;
  }

  return payload;
}

/**
 * Sends a verification email through Resend. Throws on provider errors so
 * callers can decide whether to surface the failure or swallow it.
 */
export async function sendVerificationEmail({ to, displayName, verifyUrl }) {
  return sendResendEmail({
    to,
    ...buildVerificationEmailContent({ displayName, verifyUrl }),
  });
}

export async function sendPasswordResetEmail({ to, displayName, resetUrl }) {
  return sendResendEmail({
    to,
    ...buildPasswordResetEmailContent({ displayName, resetUrl }),
  });
}

function formatReminderKickoff(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(date));
}

function buildMatchReminderEmailContent({ displayName, matches, matchesUrl, unsubscribeUrl }) {
  const name = displayName?.trim() || "there";
  const subject = "Your PitchPulse 26 match reminder";

  const lines = matches.map(
    (match) =>
      `- ${match.homeTeam.name} vs ${match.awayTeam.name} — ${formatReminderKickoff(match.date)}`,
  );

  const text = [
    `Hi ${name},`,
    "",
    "These matches are coming up tomorrow. Make your predictions before kickoff:",
    ...lines,
    "",
    "All kickoff times below are shown in UTC.",
    "",
    `Open matches: ${matchesUrl}`,
    "",
    `Unsubscribe from reminder emails: ${unsubscribeUrl}`,
    "",
    "— PitchPulse 26",
  ].join("\n");

  const safeName = escapeHtml(name);
  const safeMatchesUrl = escapeHtml(matchesUrl);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const matchItems = matches
    .map((match) => {
      const home = escapeHtml(match.homeTeam.name);
      const away = escapeHtml(match.awayTeam.name);
      const kickoff = escapeHtml(formatReminderKickoff(match.date));
      return `<li style="margin-bottom:12px; color:#f9fafb;"><strong style="color:#f9fafb;">${home}</strong> vs <strong style="color:#f9fafb;">${away}</strong><br /><span style="color:#cbd5e1;">${kickoff}</span></li>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0; font-family:-apple-system, Segoe UI, sans-serif; background:#0f1b0e; color:#f9fafb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#111827; border:1px solid #374151; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 12px; font-size:20px; color:#f9fafb;">
        <span style="color:#10b981;">Pitch</span>Pulse 26
      </h1>
      <p style="margin:0 0 12px; color:#f9fafb;">Hi ${safeName},</p>
      <p style="margin:0 0 12px; color:#e5e7eb;">These matches are coming up tomorrow. Make your predictions before kickoff:</p>
      <ul style="padding-left:20px; margin:0 0 16px;">${matchItems}</ul>
      <p style="margin:0 0 12px; font-size:12px; color:#9ca3af;">All kickoff times shown below are in UTC.</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${safeMatchesUrl}" style="background:#10b981; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Open matches</a>
      </p>
      <p style="font-size:12px; color:#9ca3af; margin:0;">
        Don&apos;t want these reminders?
        <a href="${safeUnsubscribeUrl}" style="color:#9ca3af;">Unsubscribe here</a>.
      </p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

export async function sendMatchReminderEmail({
  to,
  displayName,
  matches,
  matchesUrl,
  unsubscribeUrl,
}) {
  return sendResendEmail({
    to,
    ...buildMatchReminderEmailContent({
      displayName,
      matches,
      matchesUrl,
      unsubscribeUrl,
    }),
  });
}
