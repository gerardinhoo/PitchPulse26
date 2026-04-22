import { describe, expect, it, vi } from "vitest";
import {
  loginSchema,
  matchResultSchema,
  paginationSchema,
  predictionSchema,
  registerSchema,
  validate,
  verifyEmailSchema,
} from "../src/validators.js";

function createResponseDouble() {
  return {
    status: vi.fn(function status() {
      return this;
    }),
    json: vi.fn(function json() {
      return this;
    }),
  };
}

describe("validation schemas", () => {
  it("accepts valid register input", () => {
    const result = registerSchema.safeParse({
      email: "player@example.com",
      password: "password123",
      displayName: "Pitch Picker",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid register input", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: "player@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid login input", () => {
    const result = loginSchema.safeParse({
      email: "player@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid email verification input", () => {
    const result = verifyEmailSchema.safeParse({
      token: "1234567890-valid-token",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email verification input", () => {
    const result = verifyEmailSchema.safeParse({
      token: "short",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid prediction input", () => {
    const result = predictionSchema.safeParse({
      matchId: 12,
      homeScore: 2,
      awayScore: 1,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid prediction input", () => {
    const result = predictionSchema.safeParse({
      matchId: -5,
      homeScore: 1.2,
      awayScore: -1,
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid match result input", () => {
    const result = matchResultSchema.safeParse({
      homeScore: 4,
      awayScore: 3,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid match result input", () => {
    const result = matchResultSchema.safeParse({
      homeScore: -1,
      awayScore: 2,
    });

    expect(result.success).toBe(false);
  });

  it("coerces and defaults pagination query input", () => {
    const result = paginationSchema.parse({
      page: "2",
    });

    expect(result).toEqual({ page: 2, limit: 20 });
  });

  it("rejects invalid pagination query input", () => {
    const result = paginationSchema.safeParse({
      page: "0",
      limit: "101",
    });

    expect(result.success).toBe(false);
  });
});

describe("validate middleware", () => {
  it("passes parsed data to the request body and calls next", () => {
    const middleware = validate(predictionSchema);
    const req = {
      body: {
        matchId: 7,
        homeScore: 3,
        awayScore: 2,
      },
    };
    const res = createResponseDouble();
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.body).toEqual({ matchId: 7, homeScore: 3, awayScore: 2 });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns a 400 response with field errors when validation fails", () => {
    const middleware = validate(predictionSchema);
    const req = {
      body: {
        matchId: 0,
        homeScore: -1,
        awayScore: 2,
      },
    };
    const res = createResponseDouble();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Validation failed",
      details: {
        awayScore: undefined,
        homeScore: ["homeScore must be >= 0"],
        matchId: ["matchId must be a positive integer"],
      },
    });
  });
});
