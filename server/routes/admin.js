import express from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Admin check logic
const isAdmin = ((req, res, next) => {
  // Use of role in db
  const ADMIN_EMAIL = "admin@test.com";

  if(req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({error: "Not authorized"});
  }

  next();
});

// Update Match Result
router.patch("/matches/:id/result", authMiddleware, isAdmin, async(req, res) => {
    try {
        const matchId = parseInt(req.params.id);
        const { homeScore, awayScore, } = req.body;

        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
                homeScore,
                awayScore
            }
        });

        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update match result" });
    }
})

export default router;