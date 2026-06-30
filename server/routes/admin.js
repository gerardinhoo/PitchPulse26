import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate, matchResultSchema } from "../src/validators.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// Admin check middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }
  next();
};

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
