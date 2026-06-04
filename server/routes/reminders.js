import express from "express";
import { prisma } from "../lib/prisma.js";
import { sendMatchReminderEmail } from "../lib/email.js";
import {
  buildReminderUnsubscribeUrl,
  signReminderUnsubscribeToken,
  verifyReminderUnsubscribeToken,
} from "../lib/reminderNotificationToken.js";
import { logger } from "../lib/logger.js";
import { APP_URL, REMINDER_JOB_SECRET } from "../src/config.js";
import {
  reminderRunSchema,
  reminderUnsubscribeSchema,
  validate,
} from "../src/validators.js";

const router = express.Router();

function getNextDayWindow(targetDate) {
  const anchor = targetDate ? new Date(targetDate) : new Date();
  const nextDayStart = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() + 1, 0, 0, 0, 0),
  );
  const nextDayEnd = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() + 2, 0, 0, 0, 0),
  );

  return {
    nextDayStart,
    nextDayEnd,
  };
}

function requireReminderSecret(req, res, next) {
  if (!REMINDER_JOB_SECRET) {
    return res.status(503).json({ error: "Reminder job secret is not configured" });
  }

  const provided = req.get("x-reminder-job-secret");
  if (!provided || provided !== REMINDER_JOB_SECRET) {
    return res.status(401).json({ error: "Not authorized" });
  }

  next();
}

router.post("/run-next-day", requireReminderSecret, validate(reminderRunSchema), async (req, res, next) => {
  try {
    const { targetDate, dryRun = false } = req.body;
    const { nextDayStart, nextDayEnd } = getNextDayWindow(targetDate);

    const matches = await prisma.match.findMany({
      where: {
        date: {
          gte: nextDayStart,
          lt: nextDayEnd,
        },
        homeScore: null,
        awayScore: null,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { date: "asc" },
    });

    if (matches.length === 0) {
      return res.json({
        ok: true,
        windowStart: nextDayStart.toISOString(),
        windowEnd: nextDayEnd.toISOString(),
        matchCount: 0,
        recipientCount: 0,
        emailsSent: 0,
      });
    }

    const targetMatchIds = new Set(matches.map((match) => match.id));
    const users = await prisma.user.findMany({
      where: {
        emailVerified: true,
        emailNotifications: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    let recipientCount = 0;
    let emailsSent = 0;

    for (const user of users) {
      const predictions = await prisma.prediction.findMany({
        where: { userId: user.id },
        select: { matchId: true },
      });

      const predictedMatchIds = new Set(predictions.map((prediction) => prediction.matchId));
      const missingMatches = matches.filter((match) => !predictedMatchIds.has(match.id));

      if (missingMatches.length === 0) {
        continue;
      }

      recipientCount += 1;

      if (!dryRun) {
        await sendMatchReminderEmail({
          to: user.email,
          displayName: user.displayName,
          matches: missingMatches,
          matchesUrl: `${APP_URL.replace(/\/$/, "")}/matches`,
          unsubscribeUrl: buildReminderUnsubscribeUrl(
            signReminderUnsubscribeToken(user.id),
          ),
        });
        emailsSent += 1;
      }
    }

    logger.info("reminders.next_day.completed", {
      requestId: req.requestId ?? null,
      correlationId: req.correlationId ?? null,
      windowStart: nextDayStart.toISOString(),
      windowEnd: nextDayEnd.toISOString(),
      matchCount: matches.length,
      recipientCount,
      emailsSent,
      dryRun,
    });

    return res.json({
      ok: true,
      windowStart: nextDayStart.toISOString(),
      windowEnd: nextDayEnd.toISOString(),
      matchCount: matches.length,
      recipientCount,
      emailsSent,
      dryRun,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/unsubscribe", validate(reminderUnsubscribeSchema), async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = verifyReminderUnsubscribeToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, emailNotifications: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.emailNotifications) {
      return res.json({ message: "Reminder emails are already turned off." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailNotifications: false },
    });

    return res.json({ message: "Reminder emails turned off." });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "This unsubscribe link has expired." });
    }
    if (err.name === "JsonWebTokenError" || err.code === "INVALID_PURPOSE") {
      return res.status(400).json({ error: "Invalid unsubscribe link." });
    }

    return res.status(500).json({ error: "Could not update reminder preferences." });
  }
});

export default router;
