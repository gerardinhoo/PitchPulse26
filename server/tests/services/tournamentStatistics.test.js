import { describe, expect, it } from "vitest";
import { computeTournamentStatistics } from "../../src/services/tournamentStatistics.js";

function buildFixture() {
  const users = [
    { id: 1, displayName: "Alpha", role: "user" },
    { id: 2, displayName: "Bravo", role: "user" },
    { id: 3, displayName: "Admin", role: "admin" },
    { id: 4, displayName: "Spectator", role: "user" },
  ];

  const matches = [
    {
      id: 10,
      tournamentStage: "GROUP_STAGE",
      homeScore: 2,
      awayScore: 1,
      homeTeam: { name: "Spain" },
      awayTeam: { name: "Italy" },
    },
    {
      id: 11,
      tournamentStage: "GROUP_STAGE",
      homeScore: null,
      awayScore: null,
      homeTeam: { name: "France" },
      awayTeam: { name: "Germany" },
    },
    {
      id: 20,
      tournamentStage: "FINAL",
      homeScore: 1,
      awayScore: 0,
      homeTeam: { name: "Spain" },
      awayTeam: { name: "Argentina" },
    },
  ];

  const predictions = [
    // Alpha: exact on group, exact on final
    { userId: 1, matchId: 10, homeScore: 2, awayScore: 1 },
    { userId: 1, matchId: 20, homeScore: 1, awayScore: 0 },
    // Bravo: correct result on group, miss on final
    { userId: 2, matchId: 10, homeScore: 3, awayScore: 0 },
    { userId: 2, matchId: 20, homeScore: 0, awayScore: 1 },
    // Prediction on unfinished match — excluded from scored metrics
    { userId: 1, matchId: 11, homeScore: 1, awayScore: 1 },
    // Admin prediction should not inflate active predictors
    { userId: 3, matchId: 10, homeScore: 2, awayScore: 1 },
  ];

  return { users, matches, predictions };
}

describe("computeTournamentStatistics", () => {
  it("counts registered players excluding admins", () => {
    const stats = computeTournamentStatistics(buildFixture());
    expect(stats.participation.registeredPlayers).toBe(3);
  });

  it("counts distinct active predictors excluding admins", () => {
    const stats = computeTournamentStatistics(buildFixture());
    expect(stats.participation.activePredictors).toBe(2);
  });

  it("counts all prediction records", () => {
    const stats = computeTournamentStatistics(buildFixture());
    expect(stats.predictions.total).toBe(6);
  });

  it("only uses completed matches for scored prediction metrics", () => {
    const stats = computeTournamentStatistics(buildFixture());
    // 2 Alpha + 2 Bravo + 1 Admin on completed matches = 5 (unfinished excluded)
    expect(stats.predictions.scored).toBe(5);
    expect(stats.matches.total).toBe(3);
    expect(stats.matches.completed).toBe(2);
  });

  it("classifies exact, correct-result, and incorrect using calculatePoints", () => {
    const stats = computeTournamentStatistics(buildFixture());
    // Exact: Alpha group, Alpha final, Admin group = 3
    expect(stats.predictions.exactScore).toBe(3);
    // Correct result: Bravo group = 1
    expect(stats.predictions.correctResult).toBe(1);
    // Incorrect: Bravo final = 1
    expect(stats.predictions.incorrect).toBe(1);
  });

  it("returns 0 accuracy when there are no scored predictions", () => {
    const stats = computeTournamentStatistics({
      users: [{ id: 1, displayName: "Solo", role: "user" }],
      matches: [
        {
          id: 1,
          tournamentStage: "GROUP_STAGE",
          homeScore: null,
          awayScore: null,
          homeTeam: { name: "A" },
          awayTeam: { name: "B" },
        },
      ],
      predictions: [{ userId: 1, matchId: 1, homeScore: 1, awayScore: 0 }],
    });

    expect(stats.predictions.scored).toBe(0);
    expect(stats.predictions.accuracyPercentage).toBe(0);
  });

  it("computes accuracy from exact + correct over scored predictions", () => {
    const stats = computeTournamentStatistics(buildFixture());
    // (3 exact + 1 correct) / 5 scored = 80%
    expect(stats.predictions.accuracyPercentage).toBe(80);
  });

  it("derives champion standings from leaderboard points without hardcoding", () => {
    const stats = computeTournamentStatistics(buildFixture());
    // Alpha: 3 + 3 = 6; Bravo: 1 + 0 = 1; Admin excluded from public standings
    expect(stats.standings.champion).toEqual({
      displayName: "Alpha",
      points: 6,
      rank: 1,
    });
    expect(stats.standings.runnerUp).toEqual({
      displayName: "Bravo",
      points: 1,
      rank: 2,
    });
    expect(stats.standings.firstSecondPointGap).toBe(5);
  });

  it("does not return emails or private user fields", () => {
    const stats = computeTournamentStatistics({
      users: [
        {
          id: 9,
          displayName: "Public Name",
          role: "user",
          email: "secret@example.com",
          password: "hash",
        },
      ],
      matches: [
        {
          id: 1,
          tournamentStage: "FINAL",
          homeScore: 1,
          awayScore: 0,
          homeTeam: { name: "Spain" },
          awayTeam: { name: "Argentina" },
        },
      ],
      predictions: [{ userId: 9, matchId: 1, homeScore: 1, awayScore: 0 }],
    });

    const serialized = JSON.stringify(stats);
    expect(serialized).not.toContain("secret@example.com");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toMatch(/"email"/);
    expect(stats.highlights.mostActivePredictor).toEqual({
      displayName: "Public Name",
      predictionCount: 1,
    });
  });

  it("derives World Cup Final champion from the Final match record", () => {
    const stats = computeTournamentStatistics(buildFixture());
    expect(stats.worldCupFinal).toEqual({
      homeTeam: "Spain",
      awayTeam: "Argentina",
      homeScore: 1,
      awayScore: 0,
      champion: "Spain",
    });
  });

  it("builds stage journey entries from match data", () => {
    const stats = computeTournamentStatistics(buildFixture());
    const group = stats.matches.byStage.find((entry) => entry.stage === "GROUP_STAGE");
    const final = stats.matches.byStage.find((entry) => entry.stage === "FINAL");

    expect(group).toMatchObject({
      fixtureCount: 2,
      completedCount: 1,
      completed: false,
      archivePath: "/matches?stage=GROUP_STAGE&view=completed",
    });
    expect(final).toMatchObject({
      fixtureCount: 1,
      completed: true,
      label: "Final",
    });
    expect(stats.matches.stagesCovered).toBe(2);
  });

  it("returns stable empty defaults when no data exists", () => {
    const stats = computeTournamentStatistics();
    expect(stats.participation).toEqual({
      registeredPlayers: 0,
      activePredictors: 0,
      leaderboardParticipants: 0,
    });
    expect(stats.predictions.accuracyPercentage).toBe(0);
    expect(stats.standings.champion).toBeNull();
    expect(stats.worldCupFinal).toBeNull();
    expect(stats.highlights.mostPredictedMatch).toBeNull();
  });
});
