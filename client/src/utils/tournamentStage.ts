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

/** Static progress card data; can later be driven by API counts/status. */
export const TOURNAMENT_ROUND_PROGRESS: TournamentRoundProgress[] = [
  {
    stage: "ROUND_OF_32",
    label: "Round of 32",
    fixtureCount: 16,
    status: "in_progress",
  },
  {
    stage: "ROUND_OF_16",
    label: "Round of 16",
    fixtureCount: 8,
    status: "coming_soon",
    placeholder: true,
  },
  {
    stage: "QUARTER_FINAL",
    label: "Quarterfinals",
    fixtureCount: 4,
    status: "coming_soon",
    placeholder: true,
  },
  {
    stage: "SEMI_FINAL",
    label: "Semifinals",
    fixtureCount: 2,
    status: "coming_soon",
    placeholder: true,
  },
  {
    stage: "THIRD_PLACE",
    label: "Third Place",
    fixtureCount: 1,
    status: "coming_soon",
    placeholder: true,
  },
  {
    stage: "FINAL",
    label: "Final",
    fixtureCount: 1,
    status: "coming_soon",
    placeholder: true,
  },
];

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
  if (stage === "THIRD_PLACE") return "Final in Third Place";
  return "Final";
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
  return "Coming Soon";
}
