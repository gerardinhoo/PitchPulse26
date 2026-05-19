import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { CORS_ORIGINS, JWT_SECRET } from "../src/config.js";
import {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../src/validators.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import {
  signEmailVerificationToken,
  verifyEmailVerificationToken,
  buildVerifyUrl,
} from "../lib/emailVerificationToken.js";
import {
  buildPasswordResetUrl,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from "../lib/passwordResetToken.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

function getTrustedAppUrl(req) {
  const origin = req.get("origin")?.trim();
  if (origin && CORS_ORIGINS.includes(origin)) {
    return origin;
  }

  const referer = req.get("referer");
  if (!referer) {
    return null;
  }

  try {
    const refererOrigin = new URL(referer).origin;
    return CORS_ORIGINS.includes(refererOrigin) ? refererOrigin : null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget verification email. We log failures but never reject the
 * calling HTTP response because SES can be temporarily unavailable and the
 * user can always click "Resend" later.
 */
async function sendVerificationEmailSafe(user, appUrl = null) {
  try {
    const token = signEmailVerificationToken(user.id);
    await sendVerificationEmail({
      to: user.email,
      displayName: user.displayName,
      verifyUrl: buildVerifyUrl(token, appUrl ?? undefined),
    });
  } catch (err) {
    logger.warn("auth.verification_email.failed", {
      userId: user.id,
      email: user.email,
      errorMessage: err?.message ?? "Unknown error",
    });
  }
}

async function sendPasswordResetEmailSafe(user, appUrl = null) {
  try {
    const token = signPasswordResetToken(user);
    await sendPasswordResetEmail({
      to: user.email,
      displayName: user.displayName,
      resetUrl: buildPasswordResetUrl(token, appUrl ?? undefined),
    });
  } catch (err) {
    logger.warn("auth.password_reset_email.failed", {
      userId: user.id,
      email: user.email,
      errorMessage: err?.message ?? "Unknown error",
    });
  }
}

// REGISTER
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    const appUrl = getTrustedAppUrl(req);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName,
      },
    });

    // Fire the verification email in the background so registration still
    // feels fast even if SES is slow/unavailable.
    sendVerificationEmailSafe(user, appUrl);

    res.status(201).json({ message: "User created", userId: user.id });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "User already exists" });
    }
    next(error);
  }
});

// VERIFY EMAIL (public)
router.post("/verify-email", validate(verifyEmailSchema), async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = verifyEmailVerificationToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, displayName: true, role: true, emailVerified: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
    }

    return res.json({
      message: "Email verified",
      user: { ...user, emailVerified: true },
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Verification link has expired. Please request a new one." });
    }
    if (err.name === "JsonWebTokenError" || err.code === "INVALID_PURPOSE") {
      return res.status(400).json({ error: "Invalid verification link" });
    }
    return res.status(500).json({ error: "Could not verify email" });
  }
});

// RESEND VERIFICATION (requires auth)
router.post("/resend-verification", authMiddleware, async (req, res) => {
  const appUrl = getTrustedAppUrl(req);
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, displayName: true, emailVerified: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.emailVerified) {
    return res.status(400).json({ error: "Email already verified" });
  }

  await sendVerificationEmailSafe(user, appUrl);
  return res.json({ message: "Verification email sent" });
});

router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;
  const appUrl = getTrustedAppUrl(req);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      password: true,
    },
  });

  if (user) {
    await sendPasswordResetEmailSafe(user, appUrl);
  }

  return res.json({
    message: "If an account exists for that email, a password reset link has been sent.",
  });
});

router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.decode(token);
    const userId = decoded && typeof decoded === "object" ? decoded.userId : null;

    if (typeof userId !== "number") {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    verifyPasswordResetToken(token, user.password);

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Reset link has expired. Request a new one." });
    }
    if (
      err.name === "JsonWebTokenError" ||
      err.code === "INVALID_PURPOSE" ||
      err.code === "STALE_TOKEN"
    ) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }
    return res.status(500).json({ error: "Could not reset password" });
  }
});

// LOGIN
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

// Protected Route
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        emailVerified: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
