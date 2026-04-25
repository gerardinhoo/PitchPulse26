import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PORT, CORS_ORIGINS } from "./config.js";
import authRoutes from "../routes/auth.js";
import predictionsRoutes from "../routes/predictions.js";
import leaderboardRoutes from "../routes/leaderboard.js";
import adminRoutes from "../routes/admin.js";
import teamsRoutes from "../routes/teams.js";
import matchesRoutes from "../routes/matches.js";
import groupsRoutes from "../routes/groups.js";

const app = express();

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin/server-to-server requests with no Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
 
// ── Security middleware ──
app.use(helmet());
app.use(cors(corsOptions));
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
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err?.stack || err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(status).json({ error: message });
});

// Export app for Lambda handler
export { app };

// Only start the server when running locally outside the test environment.
if (
  process.env.AWS_LAMBDA_FUNCTION_NAME === undefined &&
  process.env.NODE_ENV !== "test"
) {
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
