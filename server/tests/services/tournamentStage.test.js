import { describe, expect, it } from "vitest";
import {
  isKnockoutStage,
  normalizeTournamentStage,
  parseScope,
  parseTournamentStage,
} from "../../src/services/tournamentStage.js";

describe("tournamentStage helpers", () => {
  it("defaults missing stages to GROUP_STAGE", () => {
    expect(normalizeTournamentStage(null)).toBe("GROUP_STAGE");
    expect(normalizeTournamentStage(undefined)).toBe("GROUP_STAGE");
  });

  it("detects knockout stages", () => {
    expect(isKnockoutStage("ROUND_OF_32")).toBe(true);
    expect(isKnockoutStage("GROUP_STAGE")).toBe(false);
    expect(isKnockoutStage(null)).toBe(false);
  });

  it("falls back to overall scope for unknown values", () => {
    expect(parseScope("overall")).toBe("overall");
    expect(parseScope("knockout")).toBe("knockout");
    expect(parseScope("invalid")).toBe("overall");
  });

  it("rejects unknown tournament stages", () => {
    expect(parseTournamentStage("ROUND_OF_32")).toBe("ROUND_OF_32");
    expect(parseTournamentStage("bogus")).toBeNull();
  });
});
