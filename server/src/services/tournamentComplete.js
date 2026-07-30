/**
 * Tournament completion is derived from the World Cup Final result(s).
 * Safe when no Final fixtures exist yet (returns false).
 */

export function isTournamentCompleteFromMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return false;
  }

  const finals = matches.filter((match) => (match.tournamentStage ?? "GROUP_STAGE") === "FINAL");
  if (finals.length === 0) {
    return false;
  }

  return finals.every(
    (match) => match.homeScore !== null && match.awayScore !== null,
  );
}

export const TOURNAMENT_CLOSED_MESSAGE =
  "The World Cup 2026 tournament is complete and predictions are closed.";

/**
 * @param {import("@prisma/client").PrismaClient | object} prisma
 */
export async function isTournamentComplete(prisma) {
  const finals = await prisma.match.findMany({
    where: { tournamentStage: "FINAL" },
    select: { homeScore: true, awayScore: true },
  });

  return isTournamentCompleteFromMatches(
    finals.map((match) => ({
      ...match,
      tournamentStage: "FINAL",
    })),
  );
}
