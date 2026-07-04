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
    away: "Australia",
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

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  console.log(
    dryRun
      ? "🧪 Dry run: Round of 16 fixture import (no writes)"
      : "🛠️ Importing Round of 16 fixtures...",
  );

  const [teams, stadiums, existingMatches] = await Promise.all([
    prisma.team.findMany(),
    prisma.stadium.findMany(),
    prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    }),
  ]);

  const teamIdsByName = new Map(teams.map((team) => [team.name, team.id]));
  const stadiumIdsByName = new Map(stadiums.map((stadium) => [stadium.name, stadium.id]));
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
