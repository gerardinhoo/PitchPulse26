import express from "express";
import { prisma } from "../lib/prisma.js";
import { buildLeaderboard } from "../src/services/leaderboard.js";
import { parseScope } from "../src/services/tournamentStage.js";
import { paginationSchema } from "../src/validators.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const scope = parseScope(req.query.scope);
    const currentUserIdRaw = req.query.currentUserId;
    const currentUserId =
      typeof currentUserIdRaw === "string" && /^\d+$/.test(currentUserIdRaw)
        ? Number(currentUserIdRaw)
        : null;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        prediction: {
          where: {
            match: { homeScore: { not: null }, awayScore: { not: null } },
          },
          include: {
            match: {
              select: {
                homeScore: true,
                awayScore: true,
                tournamentStage: true,
              },
            },
          },
        },
      },
    });

    const leaderboard = buildLeaderboard(users, { scope });

    const total = leaderboard.length;
    const paginated = leaderboard.slice((page - 1) * limit, page * limit);
    const currentUser =
      currentUserId === null
        ? null
        : leaderboard.find((entry) => entry.userId === currentUserId) ?? null;

    res.json({
      data: paginated,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      currentUser,
      scope,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
