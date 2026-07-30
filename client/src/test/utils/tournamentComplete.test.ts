import { describe, expect, it } from "vitest";
import {
  getFinalMatch,
  isTournamentComplete,
  POST_TOURNAMENT_UX_FREEZE,
} from "../../utils/tournamentComplete";

describe("tournamentComplete helpers", () => {
  it("returns false while match data is missing or empty", () => {
    expect(isTournamentComplete(undefined)).toBe(false);
    expect(isTournamentComplete(null)).toBe(false);
    expect(isTournamentComplete([])).toBe(false);
  });

  it("returns false when the Final fixture exists without a result", () => {
    expect(
      isTournamentComplete([
        { tournamentStage: "FINAL", homeScore: null, awayScore: null },
      ]),
    ).toBe(false);
  });

  it("returns true when the Final has a recorded score", () => {
    expect(
      isTournamentComplete([
        { tournamentStage: "SEMI_FINAL", homeScore: 1, awayScore: 0 },
        { tournamentStage: "FINAL", homeScore: 1, awayScore: 0 },
      ]),
    ).toBe(true);
  });

  it("finds the Final match when present", () => {
    const final = getFinalMatch([
      {
        tournamentStage: "THIRD_PLACE",
        homeScore: 2,
        awayScore: 1,
        date: "2026-07-18T21:00:00.000Z",
      },
      {
        tournamentStage: "FINAL",
        homeScore: 1,
        awayScore: 0,
        date: "2026-07-19T19:00:00.000Z",
      },
    ]);
    expect(final?.tournamentStage).toBe("FINAL");
    expect(final?.homeScore).toBe(1);
  });

  it("exposes the portfolio UX freeze flag", () => {
    expect(typeof POST_TOURNAMENT_UX_FREEZE).toBe("boolean");
  });
});
