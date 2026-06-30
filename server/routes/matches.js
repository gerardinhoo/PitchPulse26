import express from "express";
import { prisma } from "../lib/prisma.js";
import { paginationSchema } from "../src/validators.js";

const router = express.Router();

const STAGE_SCOPES = {
  group: { tournamentStage: "GROUP_STAGE" },
  knockout: { tournamentStage: { not: "GROUP_STAGE" } },
  overall: {},
};

const TOURNAMENT_STAGES = new Set([
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

function parseScope(rawScope) {
  return typeof rawScope === "string" && rawScope in STAGE_SCOPES ? rawScope : "overall";
}

function parseTournamentStage(rawStage) {
  return typeof rawStage === "string" && TOURNAMENT_STAGES.has(rawStage) ? rawStage : null;
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
            OR: [
              { homeTeam: { group } },
              { awayTeam: { group } },
            ],
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

    res.json({
      data: matches,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      scope,
      tournamentStage,
    });

  } catch (error) {
    next(error);
  }
});

export default router;
