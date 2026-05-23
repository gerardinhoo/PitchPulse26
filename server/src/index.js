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
import { requestLogger } from "../middleware/requestLogger.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
 
// ── Security middleware ──
app.use(helmet());
app.use(requestLogger);
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
  res.json({
    status: "ok",
    service: "pitchpulse26-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ready", async (req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");

    return res.json({
      status: "ready",
      service: "pitchpulse26-api",
      dependencies: {
        database: "ok",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn("readiness.failed", {
      requestId: req.requestId ?? null,
      correlationId: req.correlationId ?? null,
      errorName: err?.name ?? "Error",
      errorMessage: err?.message ?? "Unknown error",
    });

    return res.status(503).json({
      status: "not_ready",
      service: "pitchpulse26-api",
      dependencies: {
        database: "unavailable",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Global error handler ──
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  logger.error("http.request.failed", {
    requestId: req.requestId ?? null,
    correlationId: req.correlationId ?? null,
    method: req.method,
    path: req.originalUrl,
    route: req.route?.path ?? null,
    statusCode: status,
    userId: req.user?.userId ?? null,
    errorName: err?.name ?? "Error",
    errorMessage: err?.message ?? "Unknown error",
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });

  res.status(status).json({
    error: message,
    requestId: req.requestId,
    correlationId: req.correlationId,
  });
});

// Export app for Lambda handler
export { app };

// Only start the server when running locally outside the test environment.
if (
  process.env.AWS_LAMBDA_FUNCTION_NAME === undefined &&
  process.env.NODE_ENV !== "test"
) {
  const server = app.listen(PORT, () => {
    logger.info("server.started", { port: PORT });
  });

  process.on("SIGTERM", () => {
    logger.info("server.shutdown", { signal: "SIGTERM" });
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    logger.info("server.shutdown", { signal: "SIGINT" });
    server.close(() => process.exit(0));
  });
}
