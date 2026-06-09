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

// Helper to find a team by name
function team(teams, name) {
  const t = teams.find((t) => t.name === name);
  if (!t) throw new Error(`Team not found: ${name}`);
  return t.id;
}

// Helper to find a stadium by name
function stadium(stadiums, name) {
  const s = stadiums.find((s) => s.name === name);
  if (!s) throw new Error(`Stadium not found: ${name}`);
  return s.id;
}

async function main() {
  console.log("🌱 Seeding database...");

  // 🧹 Clear existing data in FK-safe order:
  // Predictions reference Matches; Matches reference Teams + Stadiums.
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.stadium.deleteMany();
  await prisma.team.deleteMany();

  // ⚽ Seed Teams (48 teams, 12 groups — based on Dec 2025 draw)
  await prisma.team.createMany({
    data: [
      // Group A
      { name: "Mexico", country: "Mexico", code: "mx", group: "A" },
      { name: "South Africa", country: "South Africa", code: "za", group: "A" },
      { name: "South Korea", country: "South Korea", code: "kr", group: "A" },
      { name: "Czech Republic", country: "Czech Republic", code: "cz", group: "A" },
      // Group B
      { name: "Canada", country: "Canada", code: "ca", group: "B" },
      { name: "Bosnia and Herzegovina", country: "Bosnia and Herzegovina", code: "ba", group: "B" },
      { name: "Qatar", country: "Qatar", code: "qa", group: "B" },
      { name: "Switzerland", country: "Switzerland", code: "ch", group: "B" },
      // Group C
      { name: "Brazil", country: "Brazil", code: "br", group: "C" },
      { name: "Morocco", country: "Morocco", code: "ma", group: "C" },
      { name: "Haiti", country: "Haiti", code: "ht", group: "C" },
      { name: "Scotland", country: "Scotland", code: "gb-sct", group: "C" },
      // Group D
      { name: "USA", country: "United States", code: "us", group: "D" },
      { name: "Paraguay", country: "Paraguay", code: "py", group: "D" },
      { name: "Australia", country: "Australia", code: "au", group: "D" },
      { name: "Türkiye", country: "Türkiye", code: "tr", group: "D" },
      // Group E
      { name: "Germany", country: "Germany", code: "de", group: "E" },
      { name: "Curaçao", country: "Curaçao", code: "cw", group: "E" },
      { name: "Ivory Coast", country: "Ivory Coast", code: "ci", group: "E" },
      { name: "Ecuador", country: "Ecuador", code: "ec", group: "E" },
      // Group F
      { name: "Netherlands", country: "Netherlands", code: "nl", group: "F" },
      { name: "Japan", country: "Japan", code: "jp", group: "F" },
      { name: "Sweden", country: "Sweden", code: "se", group: "F" },
      { name: "Tunisia", country: "Tunisia", code: "tn", group: "F" },
      // Group G
      { name: "Belgium", country: "Belgium", code: "be", group: "G" },
      { name: "Egypt", country: "Egypt", code: "eg", group: "G" },
      { name: "Iran", country: "Iran", code: "ir", group: "G" },
      { name: "New Zealand", country: "New Zealand", code: "nz", group: "G" },
      // Group H
      { name: "Spain", country: "Spain", code: "es", group: "H" },
      { name: "Cape Verde", country: "Cape Verde", code: "cv", group: "H" },
      { name: "Saudi Arabia", country: "Saudi Arabia", code: "sa", group: "H" },
      { name: "Uruguay", country: "Uruguay", code: "uy", group: "H" },
      // Group I
      { name: "France", country: "France", code: "fr", group: "I" },
      { name: "Senegal", country: "Senegal", code: "sn", group: "I" },
      { name: "Iraq", country: "Iraq", code: "iq", group: "I" },
      { name: "Norway", country: "Norway", code: "no", group: "I" },
      // Group J
      { name: "Argentina", country: "Argentina", code: "ar", group: "J" },
      { name: "Algeria", country: "Algeria", code: "dz", group: "J" },
      { name: "Austria", country: "Austria", code: "at", group: "J" },
      { name: "Jordan", country: "Jordan", code: "jo", group: "J" },
      // Group K
      { name: "Portugal", country: "Portugal", code: "pt", group: "K" },
      { name: "DR Congo", country: "DR Congo", code: "cd", group: "K" },
      { name: "Uzbekistan", country: "Uzbekistan", code: "uz", group: "K" },
      { name: "Colombia", country: "Colombia", code: "co", group: "K" },
      // Group L
      { name: "England", country: "England", code: "gb-eng", group: "L" },
      { name: "Croatia", country: "Croatia", code: "hr", group: "L" },
      { name: "Ghana", country: "Ghana", code: "gh", group: "L" },
      { name: "Panama", country: "Panama", code: "pa", group: "L" },
    ],
  });

  console.log("✅ 48 teams seeded (12 groups)");

  // 🏟️ Seed Stadiums (all 16 venues)
  await prisma.stadium.createMany({
    data: [
      // USA (11)
      { name: "MetLife Stadium", city: "East Rutherford", country: "USA" },
      { name: "SoFi Stadium", city: "Inglewood", country: "USA" },
      { name: "AT&T Stadium", city: "Arlington", country: "USA" },
      { name: "Hard Rock Stadium", city: "Miami Gardens", country: "USA" },
      { name: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA" },
      { name: "NRG Stadium", city: "Houston", country: "USA" },
      { name: "Lincoln Financial Field", city: "Philadelphia", country: "USA" },
      { name: "Lumen Field", city: "Seattle", country: "USA" },
      { name: "Gillette Stadium", city: "Foxborough", country: "USA" },
      { name: "Levi's Stadium", city: "Santa Clara", country: "USA" },
      { name: "Arrowhead Stadium", city: "Kansas City", country: "USA" },
      // Mexico (3)
      { name: "Estadio Azteca", city: "Mexico City", country: "Mexico" },
      { name: "Estadio Akron", city: "Guadalajara", country: "Mexico" },
      { name: "Estadio BBVA", city: "Monterrey", country: "Mexico" },
      // Canada (2)
      { name: "BC Place", city: "Vancouver", country: "Canada" },
      { name: "BMO Field", city: "Toronto", country: "Canada" },
    ],
  });

  console.log("✅ 16 stadiums seeded");

  // Fetch created records for match references
  const teams = await prisma.team.findMany();
  const stadiums = await prisma.stadium.findMany();

  // ⚽ Seed full group stage schedule (72 matches across 3 matchdays)
  // Using individual create() calls so @updatedAt auto-populates.
  const matchData = buildGroupStageFixtures();

  for (const m of matchData) {
    await prisma.match.create({
      data: {
        homeTeamId: team(teams, m.home),
        awayTeamId: team(teams, m.away),
        stadiumId: stadium(stadiums, m.venue),
        date: new Date(m.date),
      },
    });
  }

  console.log(`✅ ${matchData.length} group stage matches seeded (Matchdays 1–3)`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
