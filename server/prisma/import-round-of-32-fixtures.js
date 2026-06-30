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

const ROUND_OF_32_FIXTURES = [
  {
    home: "South Africa",
    away: "Canada",
    venue: "SoFi Stadium",
    date: "2026-06-28T19:00:00.000Z",
    homeScore: 0,
    awayScore: 1,
  },
  {
    home: "Brazil",
    away: "Japan",
    venue: "NRG Stadium",
    date: "2026-06-29T17:00:00.000Z",
    homeScore: 2,
    awayScore: 1,
  },
  {
    home: "Germany",
    away: "Paraguay",
    venue: "Gillette Stadium",
    date: "2026-06-29T20:30:00.000Z",
  },
  {
    home: "Netherlands",
    away: "Morocco",
    venue: "Estadio BBVA",
    date: "2026-06-30T01:00:00.000Z",
  },
  {
    home: "Ivory Coast",
    away: "Norway",
    venue: "AT&T Stadium",
    date: "2026-06-30T17:00:00.000Z",
  },
  {
    home: "France",
    away: "Sweden",
    venue: "MetLife Stadium",
    date: "2026-06-30T21:00:00.000Z",
  },
  {
    home: "Mexico",
    away: "Ecuador",
    venue: "Estadio Azteca",
    date: "2026-07-01T01:00:00.000Z",
  },
  {
    home: "England",
    away: "DR Congo",
    venue: "Mercedes-Benz Stadium",
    date: "2026-07-01T16:00:00.000Z",
  },
  {
    home: "Belgium",
    away: "Senegal",
    venue: "Lumen Field",
    date: "2026-07-01T20:00:00.000Z",
  },
  {
    home: "USA",
    away: "Bosnia and Herzegovina",
    venue: "Levi's Stadium",
    date: "2026-07-02T00:00:00.000Z",
  },
  {
    home: "Spain",
    away: "Austria",
    venue: "SoFi Stadium",
    date: "2026-07-02T19:00:00.000Z",
  },
  {
    home: "Portugal",
    away: "Croatia",
    venue: "BMO Field",
    date: "2026-07-02T23:00:00.000Z",
  },
  {
    home: "Switzerland",
    away: "Algeria",
    venue: "BC Place",
    date: "2026-07-03T03:00:00.000Z",
  },
  {
    home: "Australia",
    away: "Egypt",
    venue: "AT&T Stadium",
    date: "2026-07-03T18:00:00.000Z",
  },
  {
    home: "Argentina",
    away: "Cape Verde",
    venue: "Hard Rock Stadium",
    date: "2026-07-03T22:00:00.000Z",
  },
  {
    home: "Colombia",
    away: "Ghana",
    venue: "Arrowhead Stadium",
    date: "2026-07-04T01:30:00.000Z",
  },
];

const STAGE = "ROUND_OF_32";

function buildFixtureKey(stage, homeTeam, awayTeam, kickoffTime) {
  return `${stage}__${homeTeam}__${awayTeam}__${new Date(kickoffTime).toISOString()}`;
}

function hasProvidedScore(fixture) {
  return fixture.homeScore !== undefined && fixture.awayScore !== undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  console.log(
    dryRun
      ? "🧪 Dry run: Round of 32 fixture import (no writes)"
      : "🛠️ Importing Round of 32 fixtures...",
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

  for (const fixture of ROUND_OF_32_FIXTURES) {
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
    const nextData = {
      homeTeamId,
      awayTeamId,
      stadiumId,
      date: kickoffTime,
      tournamentStage: STAGE,
      ...(hasProvidedScore(fixture)
        ? { homeScore: fixture.homeScore, awayScore: fixture.awayScore }
        : {}),
    };

    if (dryRun) {
      if (existing) {
        const unchanged =
          existing.homeTeamId === homeTeamId &&
          existing.awayTeamId === awayTeamId &&
          existing.stadiumId === stadiumId &&
          existing.tournamentStage === STAGE &&
          (!hasProvidedScore(fixture) ||
            (existing.homeScore === fixture.homeScore &&
              existing.awayScore === fixture.awayScore));

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
      const unchanged =
        existing.homeTeamId === homeTeamId &&
        existing.awayTeamId === awayTeamId &&
        existing.stadiumId === stadiumId &&
        existing.tournamentStage === STAGE &&
        existing.date.toISOString() === kickoffTime.toISOString() &&
        (!hasProvidedScore(fixture) ||
          (existing.homeScore === fixture.homeScore &&
            existing.awayScore === fixture.awayScore));

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
