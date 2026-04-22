import { describe, expect, it } from "vitest";
import { calculatePoints } from "../../src/services/leaderboard.js";

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
