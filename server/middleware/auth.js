import "dotenv/config";
import jwt from "jsonwebtoken";

function getJwtSecret(secretOverride) {
  const secret = secretOverride ?? process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  return secret;
}

export function createAuthMiddleware(secretOverride) {
  const secret = getJwtSecret(secretOverride);

  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

export const authMiddleware = createAuthMiddleware();
