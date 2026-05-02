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
  return users
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
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}
