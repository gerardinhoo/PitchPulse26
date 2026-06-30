import { isKnockoutStage, normalizeTournamentStage } from "./tournamentStage.js";

export const calculatePoints = (prediction, match) => {
  if (match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  const predictedDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = match.homeScore - match.awayScore;

  if (
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore
  ) {
    return 3;
  }

  if (
    (predictedDiff > 0 && actualDiff > 0) ||
    (predictedDiff < 0 && actualDiff < 0) ||
    (predictedDiff === 0 && actualDiff === 0)
  ) {
    return 1;
  }

  return 0;
};

function getScopePoints(scope, breakdown) {
  if (scope === "group") return breakdown.groupStagePoints;
  if (scope === "knockout") return breakdown.knockoutPoints;
  return breakdown.totalPoints;
}

export function buildLeaderboard(users, options = {}) {
  const scope = options.scope ?? "overall";

  const entries = users
    .map((user) => {
      let groupStagePoints = 0;
      let knockoutPoints = 0;

      for (const pred of user.prediction) {
        const points = calculatePoints(pred, pred.match);
        const stage = normalizeTournamentStage(pred.match?.tournamentStage);

        if (isKnockoutStage(stage)) {
          knockoutPoints += points;
        } else {
          groupStagePoints += points;
        }
      }

      const totalPoints = groupStagePoints + knockoutPoints;

      return {
        userId: user.id,
        displayName: user.displayName || "Anonymous",
        groupStagePoints,
        knockoutPoints,
        totalPoints,
        points: getScopePoints(scope, {
          groupStagePoints,
          knockoutPoints,
          totalPoints,
        }),
      };
    })
    .sort((a, b) => b.points - a.points || a.userId - b.userId);

  const tiesByPoints = new Map();
  for (const entry of entries) {
    tiesByPoints.set(entry.points, (tiesByPoints.get(entry.points) ?? 0) + 1);
  }

  let currentRank = 0;
  let lastPoints = null;

  return entries.map((entry) => {
    if (lastPoints !== entry.points) {
      currentRank += 1;
      lastPoints = entry.points;
    }

    return {
      rank: currentRank,
      tiedCount: tiesByPoints.get(entry.points) ?? 1,
      ...entry,
    };
  });
}
