import express from "express";
import { prisma } from "../lib/prisma.js";
import { buildLeaderboard } from "../src/services/leaderboard.js";
import { paginationSchema } from "../src/validators.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);

    // Only load predictions for matches that have results (avoids useless data)
    const users = await prisma.user.findMany({
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
    });

    const leaderboard = buildLeaderboard(users);

    // Paginate the sorted results
    const total = leaderboard.length;
    const paginated = leaderboard.slice((page - 1) * limit, page * limit);

    res.json({
      data: paginated,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
