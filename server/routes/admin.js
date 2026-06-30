import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate, matchResultSchema, adminFixtureSchema } from "../src/validators.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// Admin check middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }
  next();
};

async function ensureFixtureReferences({ homeTeamId, awayTeamId, stadiumId }) {
  if (homeTeamId === awayTeamId) {
    const error = new Error("Home and away teams must be different");
    error.status = 400;
    throw error;
  }

  const [homeTeam, awayTeam, stadium] = await Promise.all([
    prisma.team.findUnique({ where: { id: homeTeamId } }),
    prisma.team.findUnique({ where: { id: awayTeamId } }),
    prisma.stadium.findUnique({ where: { id: stadiumId } }),
  ]);

  if (!homeTeam || !awayTeam || !stadium) {
    const error = new Error("Fixture references are invalid");
    error.status = 400;
    throw error;
  }
}

router.get("/fixtures/options", authMiddleware, isAdmin, async (_req, res, next) => {
  try {
    const [teams, stadiums] = await Promise.all([
      prisma.team.findMany({
        orderBy: [{ group: "asc" }, { name: "asc" }],
      }),
      prisma.stadium.findMany({
        orderBy: [{ country: "asc" }, { city: "asc" }, { name: "asc" }],
      }),
    ]);

    res.json({ teams, stadiums });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/matches",
  authMiddleware,
  isAdmin,
  validate(adminFixtureSchema),
  async (req, res, next) => {
    try {
      const { homeTeamId, awayTeamId, stadiumId, date, tournamentStage } = req.body;

      await ensureFixtureReferences({ homeTeamId, awayTeamId, stadiumId });

      const createdMatch = await prisma.match.create({
        data: {
          homeTeamId,
          awayTeamId,
          stadiumId,
          date: new Date(date),
          tournamentStage,
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          stadium: true,
        },
      });

      const auditLog = await prisma.adminAuditLog.create({
        data: {
          adminUserId: req.user.userId,
          matchId: createdMatch.id,
          action: "match.fixture.created",
          requestId: req.requestId ?? null,
          correlationId: req.correlationId ?? null,
        },
      });

      logger.info("admin.match_fixture.created", {
        auditLogId: auditLog.id,
        adminUserId: req.user.userId,
        matchId: createdMatch.id,
        tournamentStage,
        date,
        requestId: req.requestId ?? null,
        correlationId: req.correlationId ?? null,
      });

      res.status(201).json(createdMatch);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/matches/:id",
  authMiddleware,
  isAdmin,
  validate(adminFixtureSchema),
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const { homeTeamId, awayTeamId, stadiumId, date, tournamentStage } = req.body;

      const existingMatch = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true,
          stadium: true,
        },
      });

      if (!existingMatch) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (existingMatch.homeScore !== null || existingMatch.awayScore !== null) {
        return res.status(400).json({
          error: "Completed matches can only be corrected via the result editor",
        });
      }

      await ensureFixtureReferences({ homeTeamId, awayTeamId, stadiumId });

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          homeTeamId,
          awayTeamId,
          stadiumId,
          date: new Date(date),
          tournamentStage,
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          stadium: true,
        },
      });

      const auditLog = await prisma.adminAuditLog.create({
        data: {
          adminUserId: req.user.userId,
          matchId,
          action: "match.fixture.updated",
          requestId: req.requestId ?? null,
          correlationId: req.correlationId ?? null,
        },
      });

      logger.info("admin.match_fixture.updated", {
        auditLogId: auditLog.id,
        adminUserId: req.user.userId,
        matchId,
        oldHomeTeamId: existingMatch.homeTeamId,
        oldAwayTeamId: existingMatch.awayTeamId,
        oldStadiumId: existingMatch.stadiumId,
        oldDate: existingMatch.date,
        oldTournamentStage: existingMatch.tournamentStage,
        newHomeTeamId: homeTeamId,
        newAwayTeamId: awayTeamId,
        newStadiumId: stadiumId,
        newDate: date,
        newTournamentStage: tournamentStage,
        requestId: req.requestId ?? null,
        correlationId: req.correlationId ?? null,
      });

      res.json(updatedMatch);
    } catch (error) {
      next(error);
    }
  }
);

// Update Match Result
router.patch(
  "/matches/:id/result",
  authMiddleware,
  isAdmin,
  validate(matchResultSchema),
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const { homeScore, awayScore } = req.body;
      const existingMatch = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          homeScore: true,
          awayScore: true,
        },
      });

      if (!existingMatch) {
        return res.status(404).json({ error: "Match not found" });
      }

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { homeScore, awayScore },
      });

      const auditLog = await prisma.adminAuditLog.create({
        data: {
          adminUserId: req.user.userId,
          matchId,
          action: "match.result.updated",
          oldHomeScore: existingMatch.homeScore,
          oldAwayScore: existingMatch.awayScore,
          newHomeScore: homeScore,
          newAwayScore: awayScore,
          requestId: req.requestId ?? null,
          correlationId: req.correlationId ?? null,
        },
      });

      logger.info("admin.match_result.updated", {
        auditLogId: auditLog.id,
        adminUserId: req.user.userId,
        matchId,
        oldHomeScore: existingMatch.homeScore,
        oldAwayScore: existingMatch.awayScore,
        newHomeScore: homeScore,
        newAwayScore: awayScore,
        requestId: req.requestId ?? null,
        correlationId: req.correlationId ?? null,
      });

      res.json(updatedMatch);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
