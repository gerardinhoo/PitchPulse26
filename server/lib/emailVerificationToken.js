import jwt from "jsonwebtoken";
import { JWT_SECRET, APP_URL } from "../src/config.js";

const EMAIL_VERIFY_PURPOSE = "email-verify";
const EMAIL_VERIFY_EXPIRY = "1d";

/**
 * Signs a short-lived JWT that proves the bearer owns an email.
 * We reuse JWT_SECRET but scope with a `purpose` claim so an auth
 * token can never be swapped for a verification token or vice-versa.
 */
export function signEmailVerificationToken(userId) {
  return jwt.sign(
    { userId, purpose: EMAIL_VERIFY_PURPOSE },
    JWT_SECRET,
    { expiresIn: EMAIL_VERIFY_EXPIRY }
  );
}

export function verifyEmailVerificationToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.purpose !== EMAIL_VERIFY_PURPOSE) {
    const err = new Error("Invalid token purpose");
    err.code = "INVALID_PURPOSE";
    throw err;
  }
  return decoded;
}

export function buildVerifyUrl(token) {
  const base = APP_URL.replace(/\/$/, "");
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}
