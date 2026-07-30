import { buildLeaderboard, calculatePoints } from "./leaderboard.js";
import { isTournamentCompleteFromMatches } from "./tournamentComplete.js";
import { TOURNAMENT_STAGES, normalizeTournamentStage } from "./tournamentStage.js";

export const STAGE_LABELS = {
  GROUP_STAGE: "Group Stage",
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarterfinals",
  SEMI_FINAL: "Semifinals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

function isMatchCompleted(match) {
  return match?.homeScore !== null && match?.awayScore !== null;
}

function isAdminUser(user) {
  return user?.role === "admin";
}

function displayNameOf(user) {
  return user?.displayName || "Anonymous";
}

function matchLabel(match) {
  const home = match?.homeTeam?.name ?? "TBD";
  const away = match?.awayTeam?.name ?? "TBD";
  return `${home} vs ${away}`;
}

function worldCupChampionFromFinal(finalMatch) {
  if (!finalMatch || !isMatchCompleted(finalMatch)) {
    return null;
  }

  if (finalMatch.homeScore > finalMatch.awayScore) {
    return finalMatch.homeTeam?.name ?? null;
  }
  if (finalMatch.awayScore > finalMatch.homeScore) {
    return finalMatch.awayTeam?.name ?? null;
  }
  return null;
}

function standingEntry(entry) {
  if (!entry) return null;
  return {
    displayName: entry.displayName,
    points: entry.points,
    rank: entry.rank,
  };
}

/**
 * Pure computation over already-loaded tournament data.
 * Scoring classifications reuse calculatePoints (exact=3, correct result=1, miss=0).
 *
 * Predictions on unfinished matches are excluded from scored/accuracy metrics.
 * Dataset is intentionally bounded to one World Cup; classification runs in memory.
 */
export function computeTournamentStatistics({
  matches = [],
  predictions = [],
  users = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const usersById = new Map(users.map((user) => [user.id, user]));

  const registeredPlayers = users.filter((user) => !isAdminUser(user)).length;

  const predictorIds = new Set();
  const predictionsByMatchId = new Map();
  const predictionsByUserId = new Map();
  const predictionsByStage = new Map(TOURNAMENT_STAGES.map((stage) => [stage, 0]));

  let exactScore = 0;
  let correctResult = 0;
  let incorrect = 0;
  let scored = 0;
  const exactByMatchId = new Map();

  for (const prediction of predictions) {
    const match =
      prediction.match ??
      matchesById.get(prediction.matchId) ??
      null;
    const user = prediction.user ?? usersById.get(prediction.userId) ?? null;

    if (!isAdminUser(user)) {
      predictorIds.add(prediction.userId);
    }

    predictionsByMatchId.set(
      prediction.matchId,
      (predictionsByMatchId.get(prediction.matchId) ?? 0) + 1,
    );
    predictionsByUserId.set(
      prediction.userId,
      (predictionsByUserId.get(prediction.userId) ?? 0) + 1,
    );

    const stage = normalizeTournamentStage(match?.tournamentStage);
    predictionsByStage.set(stage, (predictionsByStage.get(stage) ?? 0) + 1);

    if (!isMatchCompleted(match)) {
      continue;
    }

    scored += 1;
    const points = calculatePoints(prediction, match);

    if (points === 3) {
      exactScore += 1;
      exactByMatchId.set(
        prediction.matchId,
        (exactByMatchId.get(prediction.matchId) ?? 0) + 1,
      );
    } else if (points === 1) {
      correctResult += 1;
    } else {
      incorrect += 1;
    }
  }

  const completedMatches = matches.filter(isMatchCompleted);
  const stagesPresent = new Set(
    matches.map((match) => normalizeTournamentStage(match.tournamentStage)),
  );

  const byStage = TOURNAMENT_STAGES.map((stage) => {
    const stageMatches = matches.filter(
      (match) => normalizeTournamentStage(match.tournamentStage) === stage,
    );
    const fixtureCount = stageMatches.length;
    const completedCount = stageMatches.filter(isMatchCompleted).length;

    return {
      stage,
      label: STAGE_LABELS[stage],
      fixtureCount,
      completedCount,
      completed: fixtureCount > 0 && completedCount === fixtureCount,
      predictionCount: predictionsByStage.get(stage) ?? 0,
      archivePath: `/matches?stage=${stage}&view=completed`,
    };
  }).filter((entry) => entry.fixtureCount > 0 || entry.predictionCount > 0);

  const stagesCovered = TOURNAMENT_STAGES.filter((stage) =>
    stagesPresent.has(stage),
  ).length;

  const accuracyPercentage =
    scored === 0 ? 0 : Math.round(((exactScore + correctResult) / scored) * 1000) / 10;

  const scoredPredictionsByUser = new Map();
  for (const prediction of predictions) {
    const match =
      prediction.match ?? matchesById.get(prediction.matchId) ?? null;
    if (!isMatchCompleted(match)) continue;

    if (!scoredPredictionsByUser.has(prediction.userId)) {
      scoredPredictionsByUser.set(prediction.userId, []);
    }

    scoredPredictionsByUser.get(prediction.userId).push({
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      match: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        tournamentStage: normalizeTournamentStage(match.tournamentStage),
      },
    });
  }

  const leaderboardUsers = users
    .filter((user) => !isAdminUser(user))
    .map((user) => ({
      id: user.id,
      displayName: user.displayName,
      prediction: scoredPredictionsByUser.get(user.id) ?? [],
    }));

  const leaderboard = buildLeaderboard(leaderboardUsers, { scope: "overall" });
  const leaderboardParticipants = leaderboard.filter((entry) => entry.totalPoints > 0).length;
  const champion = standingEntry(leaderboard[0] ?? null);
  const runnerUp = standingEntry(leaderboard[1] ?? null);
  const thirdPlace = standingEntry(leaderboard[2] ?? null);
  const firstSecondPointGap =
    champion && runnerUp ? Math.max(0, champion.points - runnerUp.points) : 0;

  let mostPredictedMatch = null;
  let mostPredictedCount = 0;
  for (const [matchId, count] of predictionsByMatchId.entries()) {
    if (count > mostPredictedCount) {
      mostPredictedCount = count;
      const match = matchesById.get(matchId);
      mostPredictedMatch = match
        ? {
            matchId,
            label: matchLabel(match),
            predictionCount: count,
            stage: normalizeTournamentStage(match.tournamentStage),
          }
        : null;
    }
  }

  let mostExactScoreMatch = null;
  let mostExactCount = 0;
  for (const [matchId, count] of exactByMatchId.entries()) {
    if (count > mostExactCount) {
      mostExactCount = count;
      const match = matchesById.get(matchId);
      mostExactScoreMatch = match
        ? {
            matchId,
            label: matchLabel(match),
            exactScoreCount: count,
            stage: normalizeTournamentStage(match.tournamentStage),
          }
        : null;
    }
  }

  let mostActivePredictor = null;
  let mostActiveCount = 0;
  for (const [userId, count] of predictionsByUserId.entries()) {
    const user = usersById.get(userId);
    if (isAdminUser(user)) continue;
    if (count > mostActiveCount) {
      mostActiveCount = count;
      mostActivePredictor = {
        displayName: displayNameOf(user),
        predictionCount: count,
      };
    }
  }

  const finalMatch =
    matches.find(
      (match) => normalizeTournamentStage(match.tournamentStage) === "FINAL",
    ) ?? null;

  return {
    generatedAt,
    tournamentComplete: isTournamentCompleteFromMatches(matches),
    definitions: {
      accuracy:
        "(exact-score predictions + correct-result predictions) / scored predictions × 100",
      scoredPredictions: "Predictions on matches with recorded final scores",
      exactScore: "Both predicted scores match the final score (3 points)",
      correctResult:
        "Correct home win, away win, or draw without an exact score (1 point)",
    },
    participation: {
      registeredPlayers,
      activePredictors: predictorIds.size,
      leaderboardParticipants,
    },
    matches: {
      total: matches.length,
      completed: completedMatches.length,
      stagesCovered,
      byStage,
    },
    predictions: {
      total: predictions.length,
      scored,
      exactScore,
      correctResult,
      incorrect,
      accuracyPercentage,
      byStage: byStage.map((entry) => ({
        stage: entry.stage,
        label: entry.label,
        predictionCount: entry.predictionCount,
      })),
    },
    standings: {
      champion,
      runnerUp,
      thirdPlace,
      firstSecondPointGap,
    },
    highlights: {
      mostPredictedMatch,
      mostExactScoreMatch,
      mostActivePredictor,
    },
    worldCupFinal: finalMatch
      ? {
          homeTeam: finalMatch.homeTeam?.name ?? "",
          awayTeam: finalMatch.awayTeam?.name ?? "",
          homeScore: finalMatch.homeScore,
          awayScore: finalMatch.awayScore,
          champion: worldCupChampionFromFinal(finalMatch),
        }
      : null,
  };
}

/**
 * Read-only tournament statistics.
 * Loads matches + predictions once (bounded World Cup dataset) and classifies
 * outcomes with calculatePoints rather than reimplementing scoring in SQL.
 */
export async function getTournamentStatistics(prisma) {
  const [users, matches, predictions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        role: true,
      },
    }),
    prisma.match.findMany({
      select: {
        id: true,
        tournamentStage: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.prediction.findMany({
      select: {
        userId: true,
        matchId: true,
        homeScore: true,
        awayScore: true,
      },
    }),
  ]);

  return computeTournamentStatistics({
    users,
    matches,
    predictions,
    generatedAt: new Date().toISOString(),
  });
}
