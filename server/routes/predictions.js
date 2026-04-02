import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";


const router = express();

// CREATE AND UPDATE PREDICTION
router.post("/",authMiddleware, async (req, res) => {
  try {
    const {matchId, homeScore, awayScore } = req.body;
    const userId = req.user.userId;

    const prediction = await prisma.prediction.upsert({
        where: {
            userId_matchId: {
                userId,
                matchId
            }
        },
        update: {
            homeScore,
            awayScore
        },
        create: {
            userId,
            matchId,
            homeScore,
            awayScore
        }
    });

    res.json(prediction);
  } catch (error) {
    console.error(error)
    res.status(500).json({error: "Failed to save prediction"})
  }
})

// GET MY PREDICTIONS
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const predictions = await prisma.prediction.findMany({
            where: { userId },
            include: {
                match: {
                include: {
                    homeTeam: true,
                    awayTeam: true
                }
                }
            }
});

      res.json(predictions)
    } catch (error) {
      console.error(error);
      res.status(500).json({error: "Failed to fetch predictions"})
    }
})

export default router;