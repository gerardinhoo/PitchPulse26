import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

const ROUND_OF_16_FIXTURES = [
  {
    home: "Canada",
    away: "Morocco",
    venue: "NRG Stadium",
    date: "2026-07-04T17:00:00.000Z",
  },
  {
    home: "Paraguay",
    away: "France",
    venue: "Lincoln Financial Field",
    date: "2026-07-04T21:00:00.000Z",
  },
  {
    home: "Brazil",
    away: "Norway",
    venue: "MetLife Stadium",
    date: "2026-07-05T20:00:00.000Z",
  },
  {
    home: "Mexico",
    away: "England",
    venue: "Estadio Azteca",
    date: "2026-07-06T00:00:00.000Z",
  },
  {
    home: "Portugal",
    away: "Spain",
    venue: "AT&T Stadium",
    date: "2026-07-06T19:00:00.000Z",
  },
  {
    home: "USA",
    away: "Belgium",
    venue: "Lumen Field",
    date: "2026-07-07T00:00:00.000Z",
  },
  {
    home: "Argentina",
    away: "Egypt",
    venue: "Mercedes-Benz Stadium",
    date: "2026-07-07T16:00:00.000Z",
  },
  {
    home: "Switzerland",
    away: "Colombia",
    venue: "BC Place",
    date: "2026-07-07T20:00:00.000Z",
  },
];

const STAGE = "ROUND_OF_16";
const ARGENTINA_EGYPT_FIXTURE = ROUND_OF_16_FIXTURES.find(
  (fixture) => fixture.home === "Argentina" && fixture.away === "Egypt",
);
const STALE_ARGENTINA_AUSTRALIA_FIXTURE = {
  home: "Argentina",
  away: "Australia",
  date: "2026-07-07T16:00:00.000Z",
};

function buildFixtureKey(stage, homeTeam, awayTeam, kickoffTime) {
  return `${stage}__${homeTeam}__${awayTeam}__${new Date(kickoffTime).toISOString()}`;
}

function hasProvidedScore(fixture) {
  return fixture.homeScore !== undefined && fixture.awayScore !== undefined;
}

function hasCompletedResult(match) {
  return match?.homeScore !== null && match?.awayScore !== null;
}

function buildNextData({ fixture, kickoffTime, homeTeamId, awayTeamId, stadiumId, existing }) {
  const preserveExistingResult = hasCompletedResult(existing);

  return {
    homeTeamId,
    awayTeamId,
    stadiumId,
    date: kickoffTime,
    tournamentStage: STAGE,
    ...(hasProvidedScore(fixture) && !preserveExistingResult
      ? { homeScore: fixture.homeScore, awayScore: fixture.awayScore }
      : {}),
  };
}

function isExistingMatchUnchanged(existing, fixture, kickoffTime, homeTeamId, awayTeamId, stadiumId) {
  return (
    existing.homeTeamId === homeTeamId &&
    existing.awayTeamId === awayTeamId &&
    existing.stadiumId === stadiumId &&
    existing.tournamentStage === STAGE &&
    existing.date.toISOString() === kickoffTime.toISOString() &&
    (hasCompletedResult(existing) ||
      !hasProvidedScore(fixture) ||
      (existing.homeScore === fixture.homeScore && existing.awayScore === fixture.awayScore))
  );
}

async function reconcileStaleArgentinaRoundOf16({
  teamIdsByName,
  stadiumIdsByName,
}) {
  if (!ARGENTINA_EGYPT_FIXTURE) {
    throw new Error("Argentina vs Egypt fixture is missing from ROUND_OF_16_FIXTURES.");
  }

  const argentinaId = teamIdsByName.get("Argentina");
  const australiaId = teamIdsByName.get("Australia");
  const egyptId = teamIdsByName.get("Egypt");
  const stadiumId = stadiumIdsByName.get(ARGENTINA_EGYPT_FIXTURE.venue);
  const kickoffTime = new Date(ARGENTINA_EGYPT_FIXTURE.date);

  if (!argentinaId || !australiaId || !egyptId || !stadiumId) {
    throw new Error(
      "Missing reference required to reconcile stale Argentina Round of 16 fixture.",
    );
  }

  const [staleMatch, canonicalMatch] = await Promise.all([
    prisma.match.findFirst({
      where: {
        tournamentStage: STAGE,
        date: kickoffTime,
        homeTeamId: argentinaId,
        awayTeamId: australiaId,
      },
      include: {
        prediction: true,
        auditLogs: true,
      },
    }),
    prisma.match.findFirst({
      where: {
        tournamentStage: STAGE,
        date: kickoffTime,
        homeTeamId: argentinaId,
        awayTeamId: egyptId,
      },
      include: {
        prediction: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ]);

  if (!staleMatch) {
    return;
  }

  if (hasCompletedResult(staleMatch)) {
    throw new Error(
      "Refusing to auto-reconcile Argentina vs Australia because the stale match already has a completed result.",
    );
  }

  if (!canonicalMatch) {
    if (dryRun) {
      console.log(
        `repair update Argentina vs Australia -> Argentina vs Egypt @ ${kickoffTime.toISOString()} ` +
          `(predictions=${staleMatch.prediction.length} auditLogs=${staleMatch.auditLogs.length})`,
      );
      return;
    }

    await prisma.match.update({
      where: { id: staleMatch.id },
      data: {
        awayTeamId: egyptId,
        stadiumId,
        date: kickoffTime,
        tournamentStage: STAGE,
      },
    });
    console.log(
      `repair updated stale Argentina fixture in place @ ${kickoffTime.toISOString()}`,
    );
    return;
  }

  const canonicalPredictionUserIds = new Set(
    canonicalMatch.prediction.map((prediction) => prediction.userId),
  );
  const migratedPredictionCount = staleMatch.prediction.filter(
    (prediction) => !canonicalPredictionUserIds.has(prediction.userId),
  ).length;
  const skippedPredictionCount = staleMatch.prediction.length - migratedPredictionCount;

  if (dryRun) {
    console.log(
      `repair merge Argentina vs Australia into Argentina vs Egypt @ ${kickoffTime.toISOString()} ` +
        `(movePredictions=${migratedPredictionCount} keepCanonicalPredictions=${skippedPredictionCount} ` +
        `migrateAuditLogs=${staleMatch.auditLogs.length} deleteStaleMatch=1)`,
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    const [stalePredictions, targetPredictions] = await Promise.all([
      tx.prediction.findMany({
        where: { matchId: staleMatch.id },
      }),
      tx.prediction.findMany({
        where: { matchId: canonicalMatch.id },
        select: { userId: true },
      }),
    ]);

    const targetUserIds = new Set(targetPredictions.map((prediction) => prediction.userId));

    for (const prediction of stalePredictions) {
      if (targetUserIds.has(prediction.userId)) {
        continue;
      }

      await tx.prediction.create({
        data: {
          userId: prediction.userId,
          matchId: canonicalMatch.id,
          homeScore: prediction.homeScore,
          awayScore: prediction.awayScore,
        },
      });
      targetUserIds.add(prediction.userId);
    }

    await tx.adminAuditLog.updateMany({
      where: { matchId: staleMatch.id },
      data: { matchId: canonicalMatch.id },
    });

    await tx.prediction.deleteMany({
      where: { matchId: staleMatch.id },
    });

    await tx.match.delete({
      where: { id: staleMatch.id },
    });
  });

  console.log(
    `repair merged stale Argentina fixture into canonical match @ ${kickoffTime.toISOString()}`,
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  console.log(
    dryRun
      ? "🧪 Dry run: Round of 16 fixture import (no writes)"
      : "🛠️ Importing Round of 16 fixtures...",
  );

  const [teams, stadiums] = await Promise.all([
    prisma.team.findMany(),
    prisma.stadium.findMany(),
  ]);

  const teamIdsByName = new Map(teams.map((team) => [team.name, team.id]));
  const stadiumIdsByName = new Map(stadiums.map((stadium) => [stadium.name, stadium.id]));

  await reconcileStaleArgentinaRoundOf16({
    teamIdsByName,
    stadiumIdsByName,
  });

  const existingMatches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  const existingByKey = new Map(
    existingMatches.map((match) => [
      buildFixtureKey(
        match.tournamentStage ?? "GROUP_STAGE",
        match.homeTeam.name,
        match.awayTeam.name,
        match.date,
      ),
      match,
    ]),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const fixture of ROUND_OF_16_FIXTURES) {
    const kickoffTime = new Date(fixture.date);
    const key = buildFixtureKey(STAGE, fixture.home, fixture.away, kickoffTime);
    const homeTeamId = teamIdsByName.get(fixture.home);
    const awayTeamId = teamIdsByName.get(fixture.away);
    const stadiumId = stadiumIdsByName.get(fixture.venue);

    if (!homeTeamId || !awayTeamId || !stadiumId) {
      throw new Error(
        `Missing reference for ${fixture.home} vs ${fixture.away}: ` +
          `home=${Boolean(homeTeamId)} away=${Boolean(awayTeamId)} venue=${fixture.venue} found=${Boolean(stadiumId)}`,
      );
    }

    const existing = existingByKey.get(key);
    const nextData = buildNextData({
      fixture,
      kickoffTime,
      homeTeamId,
      awayTeamId,
      stadiumId,
      existing,
    });

    if (dryRun) {
      if (existing) {
        const unchanged = isExistingMatchUnchanged(
          existing,
          fixture,
          kickoffTime,
          homeTeamId,
          awayTeamId,
          stadiumId,
        );

        console.log(
          unchanged
            ? `skip  ${fixture.home} vs ${fixture.away} @ ${kickoffTime.toISOString()}`
            : `update ${fixture.home} vs ${fixture.away} @ ${kickoffTime.toISOString()}`,
        );
        if (unchanged) skipped += 1;
        else updated += 1;
      } else {
        console.log(`create ${fixture.home} vs ${fixture.away} @ ${kickoffTime.toISOString()}`);
        created += 1;
      }
      continue;
    }

    if (existing) {
      const unchanged = isExistingMatchUnchanged(
        existing,
        fixture,
        kickoffTime,
        homeTeamId,
        awayTeamId,
        stadiumId,
      );

      if (unchanged) {
        skipped += 1;
        continue;
      }

      await prisma.match.update({
        where: { id: existing.id },
        data: nextData,
      });
      updated += 1;
      continue;
    }

    await prisma.match.create({ data: nextData });
    created += 1;
  }

  console.log(`✅ Done. created=${created} updated=${updated} skipped=${skipped}`);
}

main()
  .catch((error) => {
    if (error?.code === "P2022") {
      console.error(
        "❌ The tournamentStage column is missing. Run the Prisma migration first:\n" +
          "   npx prisma migrate deploy",
      );
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
