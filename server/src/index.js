import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma.js";
import authRoutes from "../routes/auth.js";
import predictionsRoutes from "../routes/predictions.js";


dotenv.config()

const app = express();

app.use(cors());
app.use(express.json())
app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionsRoutes);


app.get("/api/health", (req, res) => {
    res.json({ status: "API is running!"});
})

app.get("/api/teams", async (req, res) => {
  try {
    const teams = await prisma.team.findMany();
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const { group } = req.query;

    const matches = await prisma.match.findMany({
      where: group
        ? {
            OR: [
              { homeTeam: { group } },
              { awayTeam: { group } },
            ],
          }
        : {},
      include: {
        homeTeam: true,
        awayTeam: true,
        stadium: true,
      },
    });

    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});




const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})