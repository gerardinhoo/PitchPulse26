import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PORT, CORS_ORIGIN } from "./config.js";
import authRoutes from "../routes/auth.js";
import predictionsRoutes from "../routes/predictions.js";
import leaderboardRoutes from "../routes/leaderboard.js";
import adminRoutes from "../routes/admin.js";
import teamsRoutes from "../routes/teams.js";
import matchesRoutes from "../routes/matches.js";
import groupsRoutes from "../routes/groups.js";

const app = express();

// ── Security middleware ──
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "10kb" }));

// Rate limit auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many requests, please try again later" },
});

// ── Routes ──
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/predictions", predictionsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/groups", groupsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack || err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(status).json({ error: message });
});

// Export app for Lambda handler
export { app };

// Only start the server when running locally (not on Lambda)
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received — shutting down");
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received — shutting down");
    server.close(() => process.exit(0));
  });
}
