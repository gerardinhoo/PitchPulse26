export const calculatePoints = (prediction, match) => {
  if(match.homeScore === null || match.awayScore === null) {
    return 0; // match not played yet
  }

  const predictedDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = match.homeScore - match.awayScore;

  // Exact score
  if (prediction.homeScore === match.homeScore &&
       prediction.awayScore === match.awayScore ) {
    return 3;
   }

   // Correct Winner
   if (
    (predictedDiff > 0 && actualDiff > 0) || 
    (predictedDiff < 0 && actualDiff < 0) ||
    (predictedDiff === 0 && actualDiff === 0)
   ) {
    return 1;
   }

   return 0;
};

export function buildLeaderboard(users) {
  const entries = users
    .map((user) => {
      let totalPoints = 0;
      for (const pred of user.prediction) {
        totalPoints += calculatePoints(pred, pred.match);
      }

      return {
        userId: user.id,
        displayName: user.displayName || "Anonymous",
        points: totalPoints,
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
