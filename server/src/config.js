import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5050;
export const JWT_SECRET = process.env.JWT_SECRET;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Email / SES
export const AWS_REGION = process.env.AWS_REGION || "us-east-1";
export const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@pitchpulse26.com";
// Public URL of the frontend, used to build verification links.
// Falls back to CORS_ORIGIN for local dev where the two match.
export const APP_URL = process.env.APP_URL || CORS_ORIGIN;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}



