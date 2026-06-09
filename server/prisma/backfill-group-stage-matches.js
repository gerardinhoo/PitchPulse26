import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { buildGroupStageFixtures } from "./groupStageFixtures.js";

if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

function buildMatchKey(homeTeamName, awayTeamName) {
  return `${homeTeamName}__${awayTeamName}`;
}

async function main() {
  console.log(dryRun ? "🧪 Dry run: checking for missing group-stage matches..." : "🛠️ Backfilling missing group-stage matches...");

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
  const existingMatchKeys = new Set(
    existingMatches.map((match) => buildMatchKey(match.homeTeam.name, match.awayTeam.name)),
  );

  const fixtures = buildGroupStageFixtures();
  const missingFixtures = fixtures.filter(
    (fixture) => !existingMatchKeys.has(buildMatchKey(fixture.home, fixture.away)),
  );

  if (missingFixtures.length === 0) {
    console.log("✅ No missing group-stage matches found.");
    return;
  }

  console.log(`ℹ️ Found ${missingFixtures.length} missing matches.`);

  if (dryRun) {
    missingFixtures.forEach((fixture) => {
      console.log(
        `- ${fixture.group} MD${fixture.matchday}: ${fixture.home} vs ${fixture.away} @ ${fixture.venue} on ${fixture.date}`,
      );
    });
    return;
  }

  for (const fixture of missingFixtures) {
    const homeTeamId = teamIdsByName.get(fixture.home);
    const awayTeamId = teamIdsByName.get(fixture.away);
    const stadiumId = stadiumIdsByName.get(fixture.venue);

    if (!homeTeamId || !awayTeamId || !stadiumId) {
      throw new Error(`Missing reference for fixture: ${fixture.home} vs ${fixture.away} @ ${fixture.venue}`);
    }

    await prisma.match.create({
      data: {
        homeTeamId,
        awayTeamId,
        stadiumId,
        date: new Date(fixture.date),
      },
    });
  }

  console.log(`✅ Inserted ${missingFixtures.length} missing group-stage matches.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
