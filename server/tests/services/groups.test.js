import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    team: {
      findMany: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import { getAllGroups, getGroupStandings } from "../../src/services/groups.js";

describe("groups service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns teams grouped by their group name", async () => {
    prisma.team.findMany.mockResolvedValue([
      { id: 1, name: "Argentina", code: "ARG", group: "A" },
      { id: 2, name: "Brazil", code: "BRA", group: "B" },
      { id: 3, name: "Canada", code: "CAN", group: "A" },
    ]);

    const groups = await getAllGroups();

    expect(prisma.team.findMany).toHaveBeenCalledOnce();
    expect(groups).toEqual([
      {
        name: "A",
        teams: [
          { id: 1, name: "Argentina", code: "ARG", group: "A" },
          { id: 3, name: "Canada", code: "CAN", group: "A" },
        ],
      },
      {
        name: "B",
        teams: [{ id: 2, name: "Brazil", code: "BRA", group: "B" }],
      },
    ]);
  });

  it("builds sorted standings from played matches and skips unplayed ones", async () => {
    prisma.team.findMany.mockResolvedValue([
      { id: 1, name: "Argentina", code: "ARG", group: "A" },
      { id: 2, name: "Brazil", code: "BRA", group: "A" },
      { id: 3, name: "Canada", code: "CAN", group: "A" },
    ]);
    prisma.match.findMany.mockResolvedValue([
      { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 },
      { homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 1 },
      { homeTeamId: 3, awayTeamId: 1, homeScore: 0, awayScore: 2 },
      { homeTeamId: 1, awayTeamId: 3, homeScore: null, awayScore: null },
    ]);

    const standings = await getGroupStandings("A");

    expect(prisma.team.findMany).toHaveBeenCalledWith({
      where: { group: "A" },
    });
    expect(prisma.match.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { homeTeam: { group: "A" } },
          { awayTeam: { group: "A" } },
        ],
      },
    });
    expect(standings[0]).toEqual({
      position: 1,
      name: "Argentina",
      code: "ARG",
      country: "Argentina",
      group: "A",
      MP: 2,
      W: 2,
      D: 0,
      L: 0,
      GF: 4,
      GA: 0,
      GD: 4,
      Pts: 6,
    });
    expect(standings.slice(1)).toEqual([
      {
        position: 2,
        name: "Brazil",
        code: "BRA",
        country: "Brazil",
        group: "A",
        MP: 2,
        W: 0,
        D: 1,
        L: 1,
        GF: 1,
        GA: 3,
        GD: -2,
        Pts: 1,
      },
      {
        position: 3,
        name: "Canada",
        code: "CAN",
        country: "Canada",
        group: "A",
        MP: 2,
        W: 0,
        D: 1,
        L: 1,
        GF: 1,
        GA: 3,
        GD: -2,
        Pts: 1,
      },
    ]);
  });

  it("breaks ties on goal difference and then goals for", async () => {
    prisma.team.findMany.mockResolvedValue([
      { id: 1, name: "Argentina", code: "ARG", group: "A" },
      { id: 2, name: "Brazil", code: "BRA", group: "A" },
      { id: 3, name: "Canada", code: "CAN", group: "A" },
    ]);
    prisma.match.findMany.mockResolvedValue([
      { homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 0 },
      { homeTeamId: 3, awayTeamId: 1, homeScore: 0, awayScore: 1 },
      { homeTeamId: 2, awayTeamId: 3, homeScore: 2, awayScore: 0 },
    ]);

    const standings = await getGroupStandings("A");

    expect(standings.map((team) => team.name)).toEqual([
      "Argentina",
      "Brazil",
      "Canada",
    ]);
    expect(standings.map((team) => team.Pts)).toEqual([6, 3, 0]);
  });
});
