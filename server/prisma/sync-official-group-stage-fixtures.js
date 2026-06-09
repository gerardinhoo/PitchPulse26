import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  buildFixtureKey,
  officialGroupStageFixtures,
} from "./officialGroupStageFixtures.js";

if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (officialGroupStageFixtures.length === 0) {
    throw new Error(
      "officialGroupStageFixtures is empty. Add verified official fixtures to server/prisma/officialGroupStageFixtures.js first.",
    );
  }

  const [stadiums, teams, matches] = await Promise.all([
    prisma.stadium.findMany(),
    prisma.team.findMany(),
    prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        stadium: true,
        prediction: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const stadiumIdsByName = new Map(stadiums.map((stadium) => [stadium.name, stadium.id]));
  const teamIdsByName = new Map(teams.map((team) => [team.name, team.id]));
  const matchesByKey = new Map(matches.map((match) => [buildFixtureKey(match.homeTeam.name, match.awayTeam.name), match]));
  const matchesByPairKey = new Map(
    matches.map((match) => [[match.homeTeam.name, match.awayTeam.name].sort().join("__"), match]),
  );

  const plannedUpdates = officialGroupStageFixtures.map((fixture) => {
    const directKey = buildFixtureKey(fixture.home, fixture.away);
    const pairKey = [fixture.home, fixture.away].sort().join("__");
    const match = matchesByKey.get(directKey) ?? matchesByPairKey.get(pairKey);

    if (!match) {
      throw new Error(`Could not find existing match for ${fixture.home} vs ${fixture.away}`);
    }

    const stadiumId = stadiumIdsByName.get(fixture.venue);
    if (!stadiumId) {
      throw new Error(`Unknown stadium in fixture corrections: ${fixture.venue}`);
    }
    const homeTeamId = teamIdsByName.get(fixture.home);
    const awayTeamId = teamIdsByName.get(fixture.away);
    if (!homeTeamId || !awayTeamId) {
      throw new Error(`Unknown team in fixture corrections: ${fixture.home} vs ${fixture.away}`);
    }

    const nextDate = new Date(fixture.date).toISOString();
    const currentDate = new Date(match.date).toISOString();
    const nextVenue = fixture.venue;
    const currentVenue = match.stadium.name;
    const currentHome = match.homeTeam.name;
    const currentAway = match.awayTeam.name;
    const orientationChanged = currentHome !== fixture.home || currentAway !== fixture.away;

    if (orientationChanged && match.prediction.length > 0) {
      throw new Error(
        `Refusing to swap home/away for ${fixture.home} vs ${fixture.away} because match ${match.id} already has ${match.prediction.length} predictions.`,
      );
    }

    const needsUpdate =
      currentDate !== nextDate ||
      currentVenue !== nextVenue ||
      orientationChanged;

    return {
      fixture,
      match,
      stadiumId,
      homeTeamId,
      awayTeamId,
      currentDate,
      nextDate,
      currentVenue,
      nextVenue,
      currentHome,
      currentAway,
      orientationChanged,
      needsUpdate,
    };
  });

  const updates = plannedUpdates.filter((item) => item.needsUpdate);
  const orientationChanges = updates.filter((item) => item.orientationChanged).length;
  const scheduleOnlyChanges = updates.length - orientationChanges;

  console.log(
    dryRun ? "🧪 Dry run: checking official fixture corrections..." : "🛠️ Syncing official fixture corrections...",
  );
  console.log(`ℹ️ Loaded ${officialGroupStageFixtures.length} verified fixtures.`);
  console.log(`ℹ️ ${updates.length} matches need updates.`);
  console.log(`ℹ️ ${scheduleOnlyChanges} are date/venue-only changes, ${orientationChanges} also change home/away order.`);

  for (const item of updates) {
    console.log(
      `- ${item.fixture.home} vs ${item.fixture.away}\n  date:  ${item.currentDate} -> ${item.nextDate}\n  venue: ${item.currentVenue} -> ${item.nextVenue}${item.orientationChanged ? `\n  teams:  ${item.currentHome} vs ${item.currentAway} -> ${item.fixture.home} vs ${item.fixture.away}` : ""}`,
    );
  }

  if (dryRun || updates.length === 0) {
    return;
  }

  for (const item of updates) {
    await prisma.match.update({
      where: { id: item.match.id },
      data: {
        homeTeamId: item.homeTeamId,
        awayTeamId: item.awayTeamId,
        date: new Date(item.fixture.date),
        stadiumId: item.stadiumId,
      },
    });
  }

  console.log(`✅ Updated ${updates.length} matches to the verified official schedule.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
