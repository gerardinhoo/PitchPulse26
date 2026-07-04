import { describe, expect, it } from "vitest";
import {
  getFinalResultLabel,
  getKickoffDetailLabel,
  getMatchStage,
  getTournamentRoundProgress,
} from "../../utils/tournamentStage";

describe("tournamentStage helpers", () => {
  const baseMatch = {
    date: "2026-06-30T17:00:00.000Z",
    homeTeam: { group: "I" },
  };

  it("labels group-stage finals with the group letter", () => {
    expect(getFinalResultLabel({ ...baseMatch, tournamentStage: "GROUP_STAGE" })).toBe(
      "Final in Group I",
    );
  });

  it("labels knockout finals by round", () => {
    expect(getFinalResultLabel({ ...baseMatch, tournamentStage: "ROUND_OF_32" })).toBe(
      "Final in Round of 32",
    );
    expect(getFinalResultLabel({ ...baseMatch, tournamentStage: "ROUND_OF_16" })).toBe(
      "Final in Round of 16",
    );
    expect(getFinalResultLabel({ ...baseMatch, tournamentStage: "FINAL" })).toBe("Final");
  });

  it("shows stage on kickoff lines for knockout matches", () => {
    const label = getKickoffDetailLabel({
      ...baseMatch,
      tournamentStage: "ROUND_OF_32",
    });
    expect(label).toContain("Round of 32 •");
    expect(getMatchStage({ tournamentStage: "ROUND_OF_32" })).toBe("ROUND_OF_32");
  });

  it("builds round progress from live knockout fixtures", () => {
    const progress = getTournamentRoundProgress([
      {
        tournamentStage: "ROUND_OF_32",
        homeScore: 1,
        awayScore: 0,
      },
      {
        tournamentStage: "ROUND_OF_16",
        homeScore: null,
        awayScore: null,
      },
    ]);

    expect(progress[0]).toMatchObject({
      stage: "ROUND_OF_32",
      fixtureCount: 1,
      status: "completed",
      placeholder: false,
    });
    expect(progress[1]).toMatchObject({
      stage: "ROUND_OF_16",
      fixtureCount: 1,
      status: "in_progress",
      placeholder: false,
    });
    expect(progress[2]).toMatchObject({
      stage: "QUARTER_FINAL",
      fixtureCount: 4,
      status: "coming_soon",
      placeholder: true,
    });
  });
});
