import express from "express";
import { prisma } from "../lib/prisma.js";
import { getTournamentStatistics } from "../src/services/tournamentStatistics.js";

const router = express.Router();

/** Read-only tournament archive statistics. No mutations. */
router.get("/tournament", async (_req, res, next) => {
  try {
    const statistics = await getTournamentStatistics(prisma);
    res.json(statistics);
  } catch (error) {
    next(error);
  }
});

export default router;
