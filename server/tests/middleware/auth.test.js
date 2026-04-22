import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { createAuthMiddleware } from "../../middleware/auth.js";

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

describe("authMiddleware", () => {
  const secret = "test-secret";

  it("attaches the decoded user and calls next for a valid token", () => {
    const middleware = createAuthMiddleware(secret);
    const token = jwt.sign({ userId: 42, role: "USER" }, secret, {
      expiresIn: "1h",
    });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createResponseDouble();
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.user).toMatchObject({ userId: 42, role: "USER" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is expired", () => {
    const middleware = createAuthMiddleware(secret);
    const token = jwt.sign({ userId: 42 }, secret, {
      expiresIn: -1,
    });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createResponseDouble();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
  });

  it("returns 401 when the authorization header is missing", () => {
    const middleware = createAuthMiddleware(secret);
    const req = { headers: {} };
    const res = createResponseDouble();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token" });
  });

  it("returns 401 for a malformed token", () => {
    const middleware = createAuthMiddleware(secret);
    const req = {
      headers: {
        authorization: "Bearer definitely-not-a-jwt",
      },
    };
    const res = createResponseDouble();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
  });
});
