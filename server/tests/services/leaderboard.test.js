import { describe, expect, it } from "vitest";
import { buildLeaderboard, calculatePoints } from "../../src/services/leaderboard.js";

describe("calculatePoints", () => {
  it("returns 3 for an exact score match", () => {
    const points = calculatePoints(
      { homeScore: 2, awayScore: 1 },
      { homeScore: 2, awayScore: 1 },
    );

    expect(points).toBe(3);
  });

  it("returns 1 for the correct winner with the wrong scoreline", () => {
    const points = calculatePoints(
      { homeScore: 3, awayScore: 1 },
      { homeScore: 2, awayScore: 0 },
    );

    expect(points).toBe(1);
  });

  it("returns 0 for an incorrect result", () => {
    const points = calculatePoints(
      { homeScore: 0, awayScore: 1 },
      { homeScore: 2, awayScore: 1 },
    );

    expect(points).toBe(0);
  });

  it("returns 0 when the match has not been played yet", () => {
    const points = calculatePoints(
      { homeScore: 1, awayScore: 1 },
      { homeScore: null, awayScore: null },
    );

    expect(points).toBe(0);
  });

  it("returns 1 for the correct draw with the wrong exact score", () => {
    const points = calculatePoints(
      { homeScore: 0, awayScore: 0 },
      { homeScore: 2, awayScore: 2 },
    );

    expect(points).toBe(1);
  });
});

describe("buildLeaderboard", () => {
  it("uses dense ranking when players are tied on points", () => {
    const users = [
      {
        id: 1,
        displayName: "Jimbo",
        prediction: [
          { homeScore: 2, awayScore: 1, match: { homeScore: 2, awayScore: 1 } },
          { homeScore: 0, awayScore: 0, match: { homeScore: 1, awayScore: 1 } },
        ],
      },
      {
        id: 2,
        displayName: "Den",
        prediction: [
          { homeScore: 2, awayScore: 1, match: { homeScore: 2, awayScore: 1 } },
          { homeScore: 0, awayScore: 0, match: { homeScore: 1, awayScore: 1 } },
        ],
      },
      {
        id: 3,
        displayName: "Drex1911",
        prediction: [{ homeScore: 2, awayScore: 1, match: { homeScore: 2, awayScore: 1 } }],
      },
      {
        id: 4,
        displayName: "Charles1792",
        prediction: [
          { homeScore: 1, awayScore: 0, match: { homeScore: 2, awayScore: 1 } },
          { homeScore: 3, awayScore: 0, match: { homeScore: 0, awayScore: 1 } },
        ],
      },
      {
        id: 5,
        displayName: "Lawoe",
        prediction: [
          { homeScore: 1, awayScore: 0, match: { homeScore: 2, awayScore: 1 } },
          { homeScore: 3, awayScore: 0, match: { homeScore: 0, awayScore: 1 } },
        ],
      },
      {
        id: 6,
        displayName: "Yao",
        prediction: [
          { homeScore: 1, awayScore: 0, match: { homeScore: 2, awayScore: 1 } },
          { homeScore: 0, awayScore: 1, match: { homeScore: 0, awayScore: 0 } },
        ],
      },
    ];

    expect(buildLeaderboard(users)).toEqual([
      { rank: 1, tiedCount: 2, userId: 1, displayName: "Jimbo", points: 4 },
      { rank: 1, tiedCount: 2, userId: 2, displayName: "Den", points: 4 },
      { rank: 2, tiedCount: 1, userId: 3, displayName: "Drex1911", points: 3 },
      { rank: 3, tiedCount: 3, userId: 4, displayName: "Charles1792", points: 1 },
      { rank: 3, tiedCount: 3, userId: 5, displayName: "Lawoe", points: 1 },
      { rank: 3, tiedCount: 3, userId: 6, displayName: "Yao", points: 1 },
    ]);
  });
});
