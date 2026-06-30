import express from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { paginationSchema } from "../src/validators.js";
import {
  parseScope,
  parseTournamentStage,
  STAGE_SCOPES,
} from "../src/services/tournamentStage.js";

const router = express.Router();

function sanitizeMatch(match) {
  if (!match?.homeTeam || !match?.awayTeam || !match?.stadium) {
    return null;
  }

  return match;
}

router.get("/", async (req, res, next) => {
  try {
    const { group } = req.query;
    const { page, limit } = paginationSchema.parse(req.query);
    const scope = parseScope(req.query.scope);
    const tournamentStage = parseTournamentStage(req.query.stage);
    const skip = (page - 1) * limit;

    const where = {
      ...(tournamentStage ? { tournamentStage } : STAGE_SCOPES[scope]),
      ...(group
        ? {
            OR: [{ homeTeam: { group } }, { awayTeam: { group } }],
          }
        : {}),
    };

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          homeTeam: true,
          awayTeam: true,
          stadium: true,
        },
        orderBy: { date: "asc" },
        skip,
        take: limit,
      }),
      prisma.match.count({ where }),
    ]);

    const data = matches.map(sanitizeMatch).filter(Boolean);

    if (data.length !== matches.length) {
      logger.warn("matches.load.incomplete_relations", {
        droppedCount: matches.length - data.length,
        path: req.originalUrl,
      });
    }

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      scope,
      tournamentStage,
    });
  } catch (error) {
    logger.error("matches.load.failed", {
      path: req.originalUrl,
      query: req.query,
      errorName: error?.name ?? "Error",
      errorMessage: error?.message ?? "Unknown error",
    });
    next(error);
  }
});

export default router;
