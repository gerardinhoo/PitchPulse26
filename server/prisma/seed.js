import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";

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

  // 🧹 Clear existing data
  await prisma.match.deleteMany();
  await prisma.stadium.deleteMany();
  await prisma.team.deleteMany();

  // ⚽ Seed Teams (48 teams, 12 groups — based on Dec 2025 draw)
  await prisma.team.createMany({
    data: [
      // Group A
      { name: "Mexico", country: "Mexico", group: "A" },
      { name: "South Africa", country: "South Africa", group: "A" },
      { name: "South Korea", country: "South Korea", group: "A" },
      { name: "Czech Republic", country: "Czech Republic", group: "A" },
      // Group B
      { name: "Canada", country: "Canada", group: "B" },
      { name: "Bosnia and Herzegovina", country: "Bosnia and Herzegovina", group: "B" },
      { name: "Qatar", country: "Qatar", group: "B" },
      { name: "Switzerland", country: "Switzerland", group: "B" },
      // Group C
      { name: "Brazil", country: "Brazil", group: "C" },
      { name: "Morocco", country: "Morocco", group: "C" },
      { name: "Haiti", country: "Haiti", group: "C" },
      { name: "Scotland", country: "Scotland", group: "C" },
      // Group D
      { name: "USA", country: "United States", group: "D" },
      { name: "Paraguay", country: "Paraguay", group: "D" },
      { name: "Australia", country: "Australia", group: "D" },
      { name: "Türkiye", country: "Türkiye", group: "D" },
      // Group E
      { name: "Germany", country: "Germany", group: "E" },
      { name: "Curaçao", country: "Curaçao", group: "E" },
      { name: "Ivory Coast", country: "Ivory Coast", group: "E" },
      { name: "Ecuador", country: "Ecuador", group: "E" },
      // Group F
      { name: "Netherlands", country: "Netherlands", group: "F" },
      { name: "Japan", country: "Japan", group: "F" },
      { name: "Sweden", country: "Sweden", group: "F" },
      { name: "Tunisia", country: "Tunisia", group: "F" },
      // Group G
      { name: "Belgium", country: "Belgium", group: "G" },
      { name: "Egypt", country: "Egypt", group: "G" },
      { name: "Iran", country: "Iran", group: "G" },
      { name: "New Zealand", country: "New Zealand", group: "G" },
      // Group H
      { name: "Spain", country: "Spain", group: "H" },
      { name: "Cape Verde", country: "Cape Verde", group: "H" },
      { name: "Saudi Arabia", country: "Saudi Arabia", group: "H" },
      { name: "Uruguay", country: "Uruguay", group: "H" },
      // Group I
      { name: "France", country: "France", group: "I" },
      { name: "Senegal", country: "Senegal", group: "I" },
      { name: "Iraq", country: "Iraq", group: "I" },
      { name: "Norway", country: "Norway", group: "I" },
      // Group J
      { name: "Argentina", country: "Argentina", group: "J" },
      { name: "Algeria", country: "Algeria", group: "J" },
      { name: "Austria", country: "Austria", group: "J" },
      { name: "Jordan", country: "Jordan", group: "J" },
      // Group K
      { name: "Portugal", country: "Portugal", group: "K" },
      { name: "DR Congo", country: "DR Congo", group: "K" },
      { name: "Uzbekistan", country: "Uzbekistan", group: "K" },
      { name: "Colombia", country: "Colombia", group: "K" },
      // Group L
      { name: "England", country: "England", group: "L" },
      { name: "Croatia", country: "Croatia", group: "L" },
      { name: "Ghana", country: "Ghana", group: "L" },
      { name: "Panama", country: "Panama", group: "L" },
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

  // ⚽ Seed Group Stage Matches (Matchday 1 — June 11–17)
  // Using individual create() calls so @updatedAt auto-populates (createMany doesn't trigger it in SQLite)
  const matchData = [
    // June 11
    { home: "Mexico", away: "South Africa", venue: "Estadio Azteca", date: "2026-06-11T19:00:00Z" },
    { home: "South Korea", away: "Czech Republic", venue: "Estadio Akron", date: "2026-06-12T02:00:00Z" },
    // June 12
    { home: "Canada", away: "Bosnia and Herzegovina", venue: "BMO Field", date: "2026-06-12T19:00:00Z" },
    { home: "USA", away: "Paraguay", venue: "SoFi Stadium", date: "2026-06-13T01:00:00Z" },
    // June 13
    { home: "Qatar", away: "Switzerland", venue: "Levi's Stadium", date: "2026-06-13T19:00:00Z" },
    { home: "Brazil", away: "Morocco", venue: "MetLife Stadium", date: "2026-06-13T22:00:00Z" },
    { home: "Haiti", away: "Scotland", venue: "Gillette Stadium", date: "2026-06-14T01:00:00Z" },
    { home: "Australia", away: "Türkiye", venue: "BC Place", date: "2026-06-13T22:00:00Z" },
    // June 14
    { home: "Germany", away: "Curaçao", venue: "NRG Stadium", date: "2026-06-14T17:00:00Z" },
    { home: "Netherlands", away: "Japan", venue: "AT&T Stadium", date: "2026-06-14T20:00:00Z" },
    { home: "Ivory Coast", away: "Ecuador", venue: "Lincoln Financial Field", date: "2026-06-14T23:00:00Z" },
    { home: "Sweden", away: "Tunisia", venue: "Estadio BBVA", date: "2026-06-15T02:00:00Z" },
    // June 15
    { home: "Spain", away: "Cape Verde", venue: "Mercedes-Benz Stadium", date: "2026-06-15T16:00:00Z" },
    { home: "Belgium", away: "Egypt", venue: "Lumen Field", date: "2026-06-15T19:00:00Z" },
    { home: "Saudi Arabia", away: "Uruguay", venue: "Hard Rock Stadium", date: "2026-06-15T22:00:00Z" },
    { home: "Iran", away: "New Zealand", venue: "SoFi Stadium", date: "2026-06-16T01:00:00Z" },
    // June 16
    { home: "France", away: "Senegal", venue: "MetLife Stadium", date: "2026-06-16T19:00:00Z" },
    { home: "Iraq", away: "Norway", venue: "Gillette Stadium", date: "2026-06-16T22:00:00Z" },
    { home: "Argentina", away: "Algeria", venue: "Arrowhead Stadium", date: "2026-06-17T01:00:00Z" },
    { home: "Austria", away: "Jordan", venue: "Levi's Stadium", date: "2026-06-17T04:00:00Z" },
    // June 17
    { home: "Portugal", away: "DR Congo", venue: "NRG Stadium", date: "2026-06-17T17:00:00Z" },
    { home: "England", away: "Croatia", venue: "AT&T Stadium", date: "2026-06-17T20:00:00Z" },
    { home: "Ghana", away: "Panama", venue: "BMO Field", date: "2026-06-17T23:00:00Z" },
    { home: "Uzbekistan", away: "Colombia", venue: "Estadio Azteca", date: "2026-06-18T02:00:00Z" },
  ];

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

  console.log("✅ 24 group stage matches seeded (Matchday 1)");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });