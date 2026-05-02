import crypto from "crypto";
import jwt from "jsonwebtoken";
import { APP_URL, JWT_SECRET } from "../src/config.js";

const PASSWORD_RESET_PURPOSE = "password-reset";
const PASSWORD_RESET_EXPIRY = "1h";

function createPasswordFingerprint(passwordHash) {
  return crypto
    .createHash("sha256")
    .update(passwordHash)
    .digest("hex")
    .slice(0, 16);
}

export function signPasswordResetToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      purpose: PASSWORD_RESET_PURPOSE,
      passwordFingerprint: createPasswordFingerprint(user.password),
    },
    JWT_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRY },
  );
}

export function verifyPasswordResetToken(token, passwordHash) {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (decoded.purpose !== PASSWORD_RESET_PURPOSE) {
    const err = new Error("Invalid token purpose");
    err.code = "INVALID_PURPOSE";
    throw err;
  }

  if (decoded.passwordFingerprint !== createPasswordFingerprint(passwordHash)) {
    const err = new Error("Token is no longer valid");
    err.code = "STALE_TOKEN";
    throw err;
  }

  return decoded;
}

export function buildPasswordResetUrl(token) {
  const base = APP_URL.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
