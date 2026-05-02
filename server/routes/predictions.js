import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate, predictionSchema, paginationSchema } from "../src/validators.js";
import { buildLeaderboard } from "../src/services/leaderboard.js";

const router = express.Router();

// CREATE OR UPDATE PREDICTION
router.post("/", authMiddleware, validate(predictionSchema), async (req, res, next) => {
  try {
    const { matchId, homeScore, awayScore } = req.body;
    const userId = req.user.userId;

    // PP-005: only verified users can submit predictions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ error: "Please verify your email before submitting predictions" });
    }

    // Prevent predictions on matches that already have results
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }
    if (match.homeScore !== null && match.awayScore !== null) {
      return res.status(400).json({ error: "Cannot predict on a match that already has a result" });
    }
    // PP-008: predictions are locked once the match has kicked off
    if (new Date(match.date).getTime() <= Date.now()) {
      return res.status(400).json({ error: "Predictions are locked after kickoff" });
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId, matchId },
      },
      update: { homeScore, awayScore },
      create: { userId, matchId, homeScore, awayScore },
    });

    res.json(prediction);
  } catch (error) {
    next(error);
  }
});

router.get("/summary", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = Date.now();

    const [predictionRows, matches, users] = await Promise.all([
      prisma.prediction.findMany({
        where: { userId },
        select: { matchId: true },
      }),
      prisma.match.findMany({
        include: {
          homeTeam: true,
          awayTeam: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          displayName: true,
          prediction: {
            where: {
              match: { homeScore: { not: null }, awayScore: { not: null } },
            },
            include: { match: true },
          },
        },
      }),
    ]);

    const predictedIds = new Set(predictionRows.map((prediction) => prediction.matchId));
    const openMatches = matches.filter(
      (match) => match.homeScore === null && match.awayScore === null,
    );

    const nextMatch =
      openMatches.find(
        (match) => new Date(match.date).getTime() > now && !predictedIds.has(match.id),
      ) ?? null;

    const leaderboard = buildLeaderboard(users);
    const currentUserStanding =
      leaderboard.find((entry) => entry.userId === userId) ?? null;

    return res.json({
      predictedCount: predictedIds.size,
      remainingCount: openMatches.filter(
        (match) => new Date(match.date).getTime() > now && !predictedIds.has(match.id),
      ).length,
      lockedCount: openMatches.filter(
        (match) => new Date(match.date).getTime() <= now,
      ).length,
      nextMatch,
      rank: currentUserStanding?.rank ?? null,
      points: currentUserStanding?.points ?? null,
    });
  } catch (error) {
    next(error);
  }
});

// GET MY PREDICTIONS (paginated)
router.get("/my", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    const includeMatch = req.query.includeMatch !== "false";

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where: { userId },
        ...(includeMatch
          ? {
              include: {
                match: {
                  include: {
                    homeTeam: true,
                    awayTeam: true,
                  },
                },
              },
            }
          : {}),
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.prediction.count({ where: { userId } }),
    ]);

    res.json({
      data: predictions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
