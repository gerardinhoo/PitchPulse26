import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { JWT_SECRET } from "../src/config.js";
import {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
} from "../src/validators.js";
import { sendVerificationEmail } from "../lib/email.js";
import {
  signEmailVerificationToken,
  verifyEmailVerificationToken,
  buildVerifyUrl,
} from "../lib/emailVerificationToken.js";

const router = express.Router();

/**
 * Fire-and-forget verification email. We log failures but never reject the
 * calling HTTP response because SES can be temporarily unavailable and the
 * user can always click "Resend" later.
 */
async function sendVerificationEmailSafe(user) {
  try {
    const token = signEmailVerificationToken(user.id);
    await sendVerificationEmail({
      to: user.email,
      displayName: user.displayName,
      verifyUrl: buildVerifyUrl(token),
    });
  } catch (err) {
    console.error("Failed to send verification email:", err?.message || err);
  }
}

// REGISTER
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

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
    sendVerificationEmailSafe(user);

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
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, displayName: true, emailVerified: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.emailVerified) {
    return res.status(400).json({ error: "Email already verified" });
  }

  await sendVerificationEmailSafe(user);
  return res.json({ message: "Verification email sent" });
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
