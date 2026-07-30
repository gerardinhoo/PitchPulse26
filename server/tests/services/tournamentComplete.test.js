import { describe, expect, it } from "vitest";
import {
  isTournamentCompleteFromMatches,
  TOURNAMENT_CLOSED_MESSAGE,
} from "../../src/services/tournamentComplete.js";

describe("tournamentComplete helpers", () => {
  it("returns false for missing or empty match lists", () => {
    expect(isTournamentCompleteFromMatches(undefined)).toBe(false);
    expect(isTournamentCompleteFromMatches(null)).toBe(false);
    expect(isTournamentCompleteFromMatches([])).toBe(false);
  });

  it("returns false when the Final has no recorded result", () => {
    expect(
      isTournamentCompleteFromMatches([
        { tournamentStage: "FINAL", homeScore: null, awayScore: null },
      ]),
    ).toBe(false);
  });

  it("returns true when every Final match has a score", () => {
    expect(
      isTournamentCompleteFromMatches([
        { tournamentStage: "SEMI_FINAL", homeScore: 1, awayScore: 0 },
        { tournamentStage: "FINAL", homeScore: 1, awayScore: 0 },
      ]),
    ).toBe(true);
  });

  it("exposes a clear closed-tournament message", () => {
    expect(TOURNAMENT_CLOSED_MESSAGE).toMatch(/tournament is complete/i);
  });
});
