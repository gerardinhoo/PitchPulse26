export const TOURNAMENT_STAGES = [
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

export const STAGE_SCOPES = {
  group: { tournamentStage: "GROUP_STAGE" },
  knockout: { tournamentStage: { not: "GROUP_STAGE" } },
  overall: {},
};

export function normalizeTournamentStage(stage) {
  return stage ?? "GROUP_STAGE";
}

export function isKnockoutStage(stage) {
  return normalizeTournamentStage(stage) !== "GROUP_STAGE";
}

export function parseScope(rawScope) {
  return typeof rawScope === "string" && rawScope in STAGE_SCOPES ? rawScope : "overall";
}

export function parseTournamentStage(rawStage) {
  return typeof rawStage === "string" && TOURNAMENT_STAGES.includes(rawStage) ? rawStage : null;
}
