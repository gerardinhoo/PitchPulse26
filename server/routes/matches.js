import express from "express";
import { prisma } from "../lib/prisma.js";
import { paginationSchema } from "../src/validators.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { group } = req.query;
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = group
      ? {
          OR: [
            { homeTeam: { group } },
            { awayTeam: { group } },
          ],
        }
      : {};

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
    });

  } catch (error) {
    next(error);
  }
});

export default router;
