import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";

function buildRequestSummary(req) {
  return {
    requestId: req.requestId,
    correlationId: req.correlationId,
    method: req.method,
    path: req.originalUrl,
    route: req.route?.path ?? null,
    statusCode: req.res?.statusCode,
    origin: req.get("origin") ?? null,
    userAgent: req.get("user-agent") ?? null,
    userId: req.user?.userId ?? null,
  };
}

export function requestLogger(req, res, next) {
  const correlationId =
    req.get("x-correlation-id") ||
    req.get("x-request-id") ||
    randomUUID();

  req.requestId = correlationId;
  req.correlationId = correlationId;
  res.setHeader("x-request-id", req.requestId);
  res.setHeader("x-correlation-id", req.correlationId);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info("http.request.completed", {
      ...buildRequestSummary(req),
      durationMs: Number(durationMs.toFixed(1)),
    });
  });

  next();
}
