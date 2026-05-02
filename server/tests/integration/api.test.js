import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendVerificationEmail = vi.fn().mockResolvedValue(undefined);
const sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined);

const state = {
  users: [],
  matches: [],
  predictions: [],
};

const counters = {
  userId: 1,
  predictionId: 1,
};

function resetState() {
  state.users = [];
  state.matches = [
    {
      id: 100,
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: null,
      awayScore: null,
      date: "2099-06-01T15:00:00.000Z",
      homeTeam: { id: 1, name: "Argentina", code: "ARG" },
      awayTeam: { id: 2, name: "Brazil", code: "BRA" },
    },
    {
      id: 101,
      homeTeamId: 3,
      awayTeamId: 4,
      homeScore: null,
      awayScore: null,
      date: "2099-06-02T15:00:00.000Z",
      homeTeam: { id: 3, name: "Canada", code: "CAN" },
      awayTeam: { id: 4, name: "Chile", code: "CHI" },
    },
  ];
  state.predictions = [];
  counters.userId = 1;
  counters.predictionId = 1;
  sendVerificationEmail.mockClear();
  sendPasswordResetEmail.mockClear();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findUserByUnique(where = {}) {
  if (where.id !== undefined) {
    return state.users.find((user) => user.id === where.id) ?? null;
  }
  if (where.email !== undefined) {
    return state.users.find((user) => user.email === where.email) ?? null;
  }
  return null;
}

function findMatchById(id) {
  return state.matches.find((match) => match.id === id) ?? null;
}

function buildOpenMatchRelations(match) {
  return {
    ...clone(match),
    homeTeam: clone(match.homeTeam),
    awayTeam: clone(match.awayTeam),
  };
}

function buildPredictionWithRelations(prediction) {
  const match = findMatchById(prediction.matchId);

  return {
    ...clone(prediction),
    match: match
      ? {
          ...clone(match),
          homeTeam: clone(match.homeTeam),
          awayTeam: clone(match.awayTeam),
        }
      : null,
  };
}

function selectUser(user, select) {
  if (!select) {
    return clone(user);
  }

  const result = {};

  for (const [key, value] of Object.entries(select)) {
    if (!value) {
      continue;
    }

    if (key === "prediction") {
      let predictions = state.predictions.filter(
        (prediction) => prediction.userId === user.id,
      );

      if (value.where?.match?.homeScore?.not === null) {
        predictions = predictions.filter((prediction) => {
          const match = findMatchById(prediction.matchId);
          return match && match.homeScore !== null;
        });
      }

      result.prediction = predictions.map((prediction) => {
        if (value.include?.match) {
          return {
            ...clone(prediction),
            match: clone(findMatchById(prediction.matchId)),
          };
        }

        return clone(prediction);
      });
      continue;
    }

    result[key] = clone(user[key]);
  }

  return result;
}

const prisma = {
  user: {
    async create({ data }) {
      if (state.users.some((user) => user.email === data.email)) {
        const error = new Error("Unique constraint failed");
        error.code = "P2002";
        throw error;
      }

      const user = {
        id: counters.userId++,
        email: data.email,
        password: data.password,
        displayName: data.displayName ?? null,
        role: data.role ?? "user",
        emailVerified: data.emailVerified ?? false,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
      };

      state.users.push(user);
      return clone(user);
    },
    async findUnique({ where, select } = {}) {
      const user = findUserByUnique(where);
      if (!user) {
        return null;
      }
      return selectUser(user, select);
    },
    async update({ where, data }) {
      const user = findUserByUnique(where);
      if (!user) {
        const error = new Error("Record not found");
        error.code = "P2025";
        throw error;
      }

      Object.assign(user, data);
      return clone(user);
    },
    async findMany({ select } = {}) {
      return state.users.map((user) => selectUser(user, select));
    },
  },
  match: {
    async findUnique({ where }) {
      const match = findMatchById(where.id);
      return match ? clone(match) : null;
    },
    async findMany({ include, orderBy } = {}) {
      const matches = [...state.matches];

      if (orderBy?.date === "asc") {
        matches.sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      if (include?.homeTeam || include?.awayTeam) {
        return matches.map(buildOpenMatchRelations);
      }

      return matches.map(clone);
    },
    async update({ where, data }) {
      const match = findMatchById(where.id);
      if (!match) {
        const error = new Error("Record not found");
        error.code = "P2025";
        throw error;
      }

      Object.assign(match, data);
      return clone(match);
    },
  },
  prediction: {
    async upsert({ where, update, create }) {
      const existing = state.predictions.find(
        (prediction) =>
          prediction.userId === where.userId_matchId.userId &&
          prediction.matchId === where.userId_matchId.matchId,
      );

      if (existing) {
        Object.assign(existing, update);
        return clone(existing);
      }

      const prediction = {
        id: counters.predictionId++,
        userId: create.userId,
        matchId: create.matchId,
        homeScore: create.homeScore,
        awayScore: create.awayScore,
        createdAt: new Date().toISOString(),
      };

      state.predictions.push(prediction);
      return clone(prediction);
    },
    async findMany({ where = {}, skip = 0, take, include, select, orderBy } = {}) {
      let filtered = state.predictions;

      if (where.userId !== undefined) {
        filtered = filtered.filter((prediction) => prediction.userId === where.userId);
      }

      filtered = [...filtered];
      if (orderBy?.createdAt === "desc") {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const paginated = filtered.slice(skip, take === undefined ? undefined : skip + take);

      if (select?.matchId) {
        return paginated.map((prediction) => ({ matchId: prediction.matchId }));
      }

      if (include?.match) {
        return paginated.map(buildPredictionWithRelations);
      }

      return paginated.map(clone);
    },
    async count({ where } = {}) {
      return state.predictions.filter((prediction) => prediction.userId === where.userId)
        .length;
    },
  },
};

vi.mock("../../lib/prisma.js", () => ({ prisma }));
vi.mock("../../lib/email.js", () => ({
  sendVerificationEmail,
  sendPasswordResetEmail,
}));

let app;

async function createVerifiedUser(overrides = {}) {
  const password = overrides.password ?? "password123";
  const hashedPassword = await bcrypt.hash(password, 1);
  const user = {
    id: counters.userId++,
    email: overrides.email ?? `user${counters.userId}@example.com`,
    password: hashedPassword,
    displayName: overrides.displayName ?? "Player",
    role: overrides.role ?? "user",
    emailVerified: overrides.emailVerified ?? true,
    emailVerifiedAt: overrides.emailVerifiedAt ?? new Date().toISOString(),
  };

  state.users.push(user);

  return {
    ...clone(user),
    plainPassword: password,
  };
}

function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

describe("backend integration tests", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "integration-test-secret";
    process.env.CORS_ORIGIN = "http://localhost:5173";

    ({ app } = await import("../../src/index.js"));
  });

  beforeEach(() => {
    resetState();
  });

  it("supports the auth flow register -> login -> me", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: "newuser@example.com",
        password: "password123",
        displayName: "New User",
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toEqual({
      message: "User created",
      userId: 1,
    });
    expect(sendVerificationEmail).toHaveBeenCalledOnce();

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "newuser@example.com",
        password: "password123",
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      id: 1,
      email: "newuser@example.com",
      displayName: "New User",
      role: "user",
      emailVerified: false,
    });
  });

  it("requests a password reset without leaking whether the email exists", async () => {
    await createVerifiedUser({
      email: "reset@example.com",
      displayName: "Reset User",
    });

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "If an account exists for that email, a password reset link has been sent.",
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();

    const missingUserResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "unknown@example.com" });

    expect(missingUserResponse.status).toBe(200);
    expect(missingUserResponse.body).toEqual({
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  });

  it("resets a password with a valid reset token", async () => {
    const user = await createVerifiedUser({
      email: "recover@example.com",
      displayName: "Recover User",
    });

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "recover@example.com" });

    const resetUrl = sendPasswordResetEmail.mock.calls[0][0].resetUrl;
    const token = new URL(resetUrl).searchParams.get("token");

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token,
        password: "newpassword123",
      });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body).toEqual({ message: "Password reset successful" });

    const oldLoginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "recover@example.com",
        password: user.plainPassword,
      });
    expect(oldLoginResponse.status).toBe(401);

    const newLoginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "recover@example.com",
        password: "newpassword123",
      });
    expect(newLoginResponse.status).toBe(200);
    expect(newLoginResponse.body.token).toEqual(expect.any(String));
  });

  it("supports authenticated prediction create, update, and read flows", async () => {
    const user = await createVerifiedUser({
      email: "predictor@example.com",
      displayName: "Predictor",
    });
    const token = createToken(user);

    const createResponse = await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        matchId: 100,
        homeScore: 2,
        awayScore: 1,
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toMatchObject({
      id: 1,
      userId: user.id,
      matchId: 100,
      homeScore: 2,
      awayScore: 1,
    });

    const updateResponse = await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        matchId: 100,
        homeScore: 1,
        awayScore: 1,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: 1,
      userId: user.id,
      matchId: 100,
      homeScore: 1,
      awayScore: 1,
    });

    const listResponse = await request(app)
      .get("/api/predictions/my")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(listResponse.body.data).toEqual([
      expect.objectContaining({
        id: 1,
        userId: user.id,
        matchId: 100,
        homeScore: 1,
        awayScore: 1,
        match: expect.objectContaining({
          id: 100,
          homeTeam: expect.objectContaining({ name: "Argentina" }),
          awayTeam: expect.objectContaining({ name: "Brazil" }),
        }),
      }),
    ]);
  });

  it("returns a lightweight prediction summary for the matches dashboard", async () => {
    const user = await createVerifiedUser({
      email: "summary@example.com",
      displayName: "Summary User",
    });

    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: 100 } },
      create: { userId: user.id, matchId: 100, homeScore: 2, awayScore: 1 },
      update: {},
    });

    state.matches[0].homeScore = 2;
    state.matches[0].awayScore = 1;

    const response = await request(app)
      .get("/api/predictions/summary")
      .set("Authorization", `Bearer ${createToken(user)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      predictedCount: 1,
      remainingCount: 1,
      lockedCount: 0,
      rank: 1,
      points: 3,
      nextMatch: expect.objectContaining({
        id: 101,
        homeTeam: expect.objectContaining({ name: "Canada" }),
        awayTeam: expect.objectContaining({ name: "Chile" }),
      }),
    });
  });

  it("rejects admin match updates for regular users and allows admins", async () => {
    const regularUser = await createVerifiedUser({
      email: "user@example.com",
      role: "user",
    });
    const adminUser = await createVerifiedUser({
      email: "admin@example.com",
      role: "admin",
    });

    const forbiddenResponse = await request(app)
      .patch("/api/admin/matches/100/result")
      .set("Authorization", `Bearer ${createToken(regularUser)}`)
      .send({
        homeScore: 2,
        awayScore: 1,
      });

    expect(forbiddenResponse.status).toBe(403);
    expect(forbiddenResponse.body).toEqual({ error: "Not authorized" });

    const allowedResponse = await request(app)
      .patch("/api/admin/matches/100/result")
      .set("Authorization", `Bearer ${createToken(adminUser)}`)
      .send({
        homeScore: 2,
        awayScore: 1,
      });

    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.body).toMatchObject({
      id: 100,
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("computes leaderboard scoring after results are set", async () => {
    const adminUser = await createVerifiedUser({
      email: "admin@example.com",
      role: "admin",
    });
    const winner = await createVerifiedUser({
      email: "winner@example.com",
      displayName: "Winner",
    });
    const challenger = await createVerifiedUser({
      email: "challenger@example.com",
      displayName: "Challenger",
    });

    await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${createToken(winner)}`)
      .send({
        matchId: 100,
        homeScore: 2,
        awayScore: 1,
      });

    await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${createToken(challenger)}`)
      .send({
        matchId: 100,
        homeScore: 1,
        awayScore: 0,
      });

    const resultResponse = await request(app)
      .patch("/api/admin/matches/100/result")
      .set("Authorization", `Bearer ${createToken(adminUser)}`)
      .send({
        homeScore: 2,
        awayScore: 1,
      });

    expect(resultResponse.status).toBe(200);

    const leaderboardResponse = await request(app)
      .get("/api/leaderboard");

    expect(leaderboardResponse.status).toBe(200);
    expect(leaderboardResponse.body.data).toEqual([
      {
        rank: 1,
        userId: winner.id,
        displayName: "Winner",
        points: 3,
      },
      {
        rank: 2,
        userId: challenger.id,
        displayName: "Challenger",
        points: 1,
      },
      {
        rank: 3,
        userId: adminUser.id,
        displayName: "Player",
        points: 0,
      },
    ]);
  });

  it("rejects invalid input, duplicate emails, and short passwords", async () => {
    const shortPasswordResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: "short@example.com",
        password: "short",
        displayName: "Short Password",
      });

    expect(shortPasswordResponse.status).toBe(400);
    expect(shortPasswordResponse.body).toEqual({
      error: "Validation failed",
      details: {
        password: ["Password must be at least 8 characters"],
      },
    });

    const firstRegisterResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: "duplicate@example.com",
        password: "password123",
        displayName: "First User",
      });

    expect(firstRegisterResponse.status).toBe(201);

    const duplicateResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: "duplicate@example.com",
        password: "password123",
        displayName: "Second User",
      });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toEqual({ error: "User already exists" });

    const user = await createVerifiedUser({
      email: "validator@example.com",
    });

    const badPredictionResponse = await request(app)
      .post("/api/predictions")
      .set("Authorization", `Bearer ${createToken(user)}`)
      .send({
        matchId: 0,
        homeScore: -1,
        awayScore: 2,
      });

    expect(badPredictionResponse.status).toBe(400);
    expect(badPredictionResponse.body).toEqual({
      error: "Validation failed",
      details: {
        awayScore: undefined,
        homeScore: ["homeScore must be >= 0"],
        matchId: ["matchId must be a positive integer"],
      },
    });
  });
});
