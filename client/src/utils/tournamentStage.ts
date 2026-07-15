import { formatMatchDateTime } from "./dateTime";

export type TournamentStage =
  | "GROUP_STAGE"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

export const STAGE_LABELS: Record<TournamentStage, string> = {
  GROUP_STAGE: "Group Stage",
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarterfinals",
  SEMI_FINAL: "Semifinals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

export type RoundProgressStatus = "in_progress" | "coming_soon" | "completed";

export type TournamentRoundProgress = {
  stage: TournamentStage;
  label: string;
  fixtureCount: number;
  status: RoundProgressStatus;
  /** UI-only rounds waiting on winners — not backed by fixtures yet */
  placeholder?: boolean;
};

type TournamentProgressSourceMatch = {
  tournamentStage?: TournamentStage;
  homeScore: number | null;
  awayScore: number | null;
};

const TOURNAMENT_ROUND_BLUEPRINT: Array<
  Pick<TournamentRoundProgress, "stage" | "label" | "fixtureCount">
> = [
  {
    stage: "ROUND_OF_32",
    label: "Round of 32",
    fixtureCount: 16,
  },
  {
    stage: "ROUND_OF_16",
    label: "Round of 16",
    fixtureCount: 8,
  },
  {
    stage: "QUARTER_FINAL",
    label: "Quarterfinals",
    fixtureCount: 4,
  },
  {
    stage: "SEMI_FINAL",
    label: "Semifinals",
    fixtureCount: 2,
  },
  {
    stage: "THIRD_PLACE",
    label: "Third Place",
    fixtureCount: 1,
  },
  {
    stage: "FINAL",
    label: "Final",
    fixtureCount: 1,
  },
];

function isMatchCompleted(match: TournamentProgressSourceMatch): boolean {
  return match.homeScore !== null && match.awayScore !== null;
}

export function getTournamentRoundProgress(
  matches: TournamentProgressSourceMatch[],
): TournamentRoundProgress[] {
  return TOURNAMENT_ROUND_BLUEPRINT.map((round) => {
    const stageMatches = matches.filter((match) => getMatchStage(match) === round.stage);

    if (stageMatches.length === 0) {
      return {
        ...round,
        status: "coming_soon",
        placeholder: true,
      };
    }

    return {
      ...round,
      fixtureCount: stageMatches.length,
      status: stageMatches.every(isMatchCompleted) ? "completed" : "in_progress",
      placeholder: false,
    };
  });
}

export function getMatchStage(match: { tournamentStage?: TournamentStage }): TournamentStage {
  return match.tournamentStage ?? "GROUP_STAGE";
}

export function getFinalResultLabel(match: {
  tournamentStage?: TournamentStage;
  homeTeam: { group: string };
}): string {
  const stage = getMatchStage(match);

  if (stage === "GROUP_STAGE") {
    return `Final in Group ${match.homeTeam.group}`;
  }
  if (stage === "ROUND_OF_32") return "Final in Round of 32";
  if (stage === "ROUND_OF_16") return "Final in Round of 16";
  if (stage === "QUARTER_FINAL") return "Final in Quarterfinals";
  if (stage === "SEMI_FINAL") return "Final in Semifinals";
  if (stage === "THIRD_PLACE") return "Third Place result";
  if (stage === "FINAL") return "Final result";
  return "Final";
}

/** Compact kickoff countdown from a match date (e.g. "2d 5h" or "Kickoff"). */
export function getCountdownToKickoff(
  kickoffIso: string,
  nowMs: number = Date.now(),
): string {
  const remainingMs = new Date(kickoffIso).getTime() - nowMs;
  if (remainingMs <= 0) return "Kickoff";

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** True when every match in a stage has a recorded score. */
export function isStageCompleted(
  matches: TournamentProgressSourceMatch[],
  stage: TournamentStage,
): boolean {
  const stageMatches = matches.filter((match) => getMatchStage(match) === stage);
  return stageMatches.length > 0 && stageMatches.every(isMatchCompleted);
}

export function hasStageFixtures(
  matches: TournamentProgressSourceMatch[],
  stage: TournamentStage,
): boolean {
  return matches.some((match) => getMatchStage(match) === stage);
}

export function getKickoffDetailLabel(match: {
  date: string;
  tournamentStage?: TournamentStage;
  homeTeam: { group: string };
}): string {
  const stage = getMatchStage(match);
  const kickoff = formatMatchDateTime(match.date);

  if (stage === "GROUP_STAGE") {
    return `Group ${match.homeTeam.group} • ${kickoff}`;
  }

  return `${STAGE_LABELS[stage]} • ${kickoff}`;
}

export function getRoundStatusLabel(status: RoundProgressStatus): string {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Upcoming";
}
