import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const predictionSchema = z.object({
  matchId: z.number().int().positive("matchId must be a positive integer"),
  homeScore: z.number().int().min(0, "homeScore must be >= 0"),
  awayScore: z.number().int().min(0, "awayScore must be >= 0"),
});

export const matchResultSchema = z.object({
  homeScore: z.number().int().min(0, "homeScore must be >= 0"),
  awayScore: z.number().int().min(0, "awayScore must be >= 0"),
});

// Reusable pagination query schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Express middleware factory for validating request body against a Zod schema.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
