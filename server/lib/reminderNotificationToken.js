import jwt from "jsonwebtoken";
import { APP_URL, JWT_SECRET } from "../src/config.js";

const REMINDER_UNSUBSCRIBE_PURPOSE = "reminder-unsubscribe";

export function signReminderUnsubscribeToken(userId) {
  return jwt.sign(
    { userId, purpose: REMINDER_UNSUBSCRIBE_PURPOSE },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export function verifyReminderUnsubscribeToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (decoded.purpose !== REMINDER_UNSUBSCRIBE_PURPOSE) {
    const err = new Error("Invalid token purpose");
    err.code = "INVALID_PURPOSE";
    throw err;
  }

  return decoded;
}

export function buildReminderUnsubscribeUrl(token, appUrl = APP_URL) {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/unsubscribe-reminders?token=${encodeURIComponent(token)}`;
}
