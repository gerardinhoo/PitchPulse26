import {
  getMatchStage,
  isStageCompleted,
  type TournamentStage,
} from "./tournamentStage";

type TournamentCompleteSourceMatch = {
  tournamentStage?: TournamentStage;
  homeScore: number | null;
  awayScore: number | null;
};

/**
 * Portfolio UX freeze for prompts that do not have match data (e.g. install banner).
 * Flip to false only for local live-tournament demos.
 */
export const POST_TOURNAMENT_UX_FREEZE = true;

/**
 * True when the World Cup Final has a recorded result.
 * Safe while loading or when match data is missing/empty (returns false).
 */
export function isTournamentComplete(
  matches: TournamentCompleteSourceMatch[] | null | undefined,
): boolean {
  if (!matches || matches.length === 0) {
    return false;
  }

  return isStageCompleted(matches, "FINAL");
}

/** Final fixture row when present (first FINAL match by insertion order in the list). */
export function getFinalMatch<T extends TournamentCompleteSourceMatch & { date?: string }>(
  matches: T[] | null | undefined,
): T | null {
  if (!matches?.length) return null;
  const finals = matches.filter((match) => getMatchStage(match) === "FINAL");
  if (finals.length === 0) return null;
  return [...finals].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return aTime - bTime;
  })[0];
}
