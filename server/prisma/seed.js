import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
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
      { name: "UEFA Playoff D Winner", country: "TBD", group: "A" },
      // Group B
      { name: "Canada", country: "Canada", group: "B" },
      { name: "UEFA Playoff A Winner", country: "TBD", group: "B" },
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
      { name: "UEFA Playoff C Winner", country: "TBD", group: "D" },
      // Group E
      { name: "Germany", country: "Germany", group: "E" },
      { name: "Curaçao", country: "Curaçao", group: "E" },
      { name: "Ivory Coast", country: "Ivory Coast", group: "E" },
      { name: "Ecuador", country: "Ecuador", group: "E" },
      // Group F
      { name: "Netherlands", country: "Netherlands", group: "F" },
      { name: "Japan", country: "Japan", group: "F" },
      { name: "UEFA Playoff B Winner", country: "TBD", group: "F" },
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
      { name: "FIFA Playoff 2 Winner", country: "TBD", group: "I" },
      { name: "Norway", country: "Norway", group: "I" },
      // Group J
      { name: "Argentina", country: "Argentina", group: "J" },
      { name: "Algeria", country: "Algeria", group: "J" },
      { name: "Austria", country: "Austria", group: "J" },
      { name: "Jordan", country: "Jordan", group: "J" },
      // Group K
      { name: "Portugal", country: "Portugal", group: "K" },
      { name: "FIFA Playoff 1 Winner", country: "TBD", group: "K" },
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
  await prisma.match.createMany({
    data: [
      // June 11
      {
        homeTeamId: team(teams, "Mexico"),
        awayTeamId: team(teams, "South Africa"),
        stadiumId: stadium(stadiums, "Estadio Azteca"),
        date: new Date("2026-06-11T19:00:00Z"),
      },
      {
        homeTeamId: team(teams, "South Korea"),
        awayTeamId: team(teams, "UEFA Playoff D Winner"),
        stadiumId: stadium(stadiums, "Estadio Akron"),
        date: new Date("2026-06-12T02:00:00Z"),
      },
      // June 12
      {
        homeTeamId: team(teams, "Canada"),
        awayTeamId: team(teams, "UEFA Playoff A Winner"),
        stadiumId: stadium(stadiums, "BMO Field"),
        date: new Date("2026-06-12T19:00:00Z"),
      },
      {
        homeTeamId: team(teams, "USA"),
        awayTeamId: team(teams, "Paraguay"),
        stadiumId: stadium(stadiums, "SoFi Stadium"),
        date: new Date("2026-06-13T01:00:00Z"),
      },
      // June 13
      {
        homeTeamId: team(teams, "Qatar"),
        awayTeamId: team(teams, "Switzerland"),
        stadiumId: stadium(stadiums, "Levi's Stadium"),
        date: new Date("2026-06-13T19:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Brazil"),
        awayTeamId: team(teams, "Morocco"),
        stadiumId: stadium(stadiums, "MetLife Stadium"),
        date: new Date("2026-06-13T22:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Haiti"),
        awayTeamId: team(teams, "Scotland"),
        stadiumId: stadium(stadiums, "Gillette Stadium"),
        date: new Date("2026-06-14T01:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Australia"),
        awayTeamId: team(teams, "UEFA Playoff C Winner"),
        stadiumId: stadium(stadiums, "BC Place"),
        date: new Date("2026-06-13T22:00:00Z"),
      },
      // June 14
      {
        homeTeamId: team(teams, "Germany"),
        awayTeamId: team(teams, "Curaçao"),
        stadiumId: stadium(stadiums, "NRG Stadium"),
        date: new Date("2026-06-14T17:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Netherlands"),
        awayTeamId: team(teams, "Japan"),
        stadiumId: stadium(stadiums, "AT&T Stadium"),
        date: new Date("2026-06-14T20:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Ivory Coast"),
        awayTeamId: team(teams, "Ecuador"),
        stadiumId: stadium(stadiums, "Lincoln Financial Field"),
        date: new Date("2026-06-14T23:00:00Z"),
      },
      {
        homeTeamId: team(teams, "UEFA Playoff B Winner"),
        awayTeamId: team(teams, "Tunisia"),
        stadiumId: stadium(stadiums, "Estadio BBVA"),
        date: new Date("2026-06-15T02:00:00Z"),
      },
      // June 15
      {
        homeTeamId: team(teams, "Spain"),
        awayTeamId: team(teams, "Cape Verde"),
        stadiumId: stadium(stadiums, "Mercedes-Benz Stadium"),
        date: new Date("2026-06-15T16:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Belgium"),
        awayTeamId: team(teams, "Egypt"),
        stadiumId: stadium(stadiums, "Lumen Field"),
        date: new Date("2026-06-15T19:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Saudi Arabia"),
        awayTeamId: team(teams, "Uruguay"),
        stadiumId: stadium(stadiums, "Hard Rock Stadium"),
        date: new Date("2026-06-15T22:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Iran"),
        awayTeamId: team(teams, "New Zealand"),
        stadiumId: stadium(stadiums, "SoFi Stadium"),
        date: new Date("2026-06-16T01:00:00Z"),
      },
      // June 16
      {
        homeTeamId: team(teams, "France"),
        awayTeamId: team(teams, "Senegal"),
        stadiumId: stadium(stadiums, "MetLife Stadium"),
        date: new Date("2026-06-16T19:00:00Z"),
      },
      {
        homeTeamId: team(teams, "FIFA Playoff 2 Winner"),
        awayTeamId: team(teams, "Norway"),
        stadiumId: stadium(stadiums, "Gillette Stadium"),
        date: new Date("2026-06-16T22:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Argentina"),
        awayTeamId: team(teams, "Algeria"),
        stadiumId: stadium(stadiums, "Arrowhead Stadium"),
        date: new Date("2026-06-17T01:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Austria"),
        awayTeamId: team(teams, "Jordan"),
        stadiumId: stadium(stadiums, "Levi's Stadium"),
        date: new Date("2026-06-17T04:00:00Z"),
      },
      // June 17
      {
        homeTeamId: team(teams, "Portugal"),
        awayTeamId: team(teams, "FIFA Playoff 1 Winner"),
        stadiumId: stadium(stadiums, "NRG Stadium"),
        date: new Date("2026-06-17T17:00:00Z"),
      },
      {
        homeTeamId: team(teams, "England"),
        awayTeamId: team(teams, "Croatia"),
        stadiumId: stadium(stadiums, "AT&T Stadium"),
        date: new Date("2026-06-17T20:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Ghana"),
        awayTeamId: team(teams, "Panama"),
        stadiumId: stadium(stadiums, "BMO Field"),
        date: new Date("2026-06-17T23:00:00Z"),
      },
      {
        homeTeamId: team(teams, "Uzbekistan"),
        awayTeamId: team(teams, "Colombia"),
        stadiumId: stadium(stadiums, "Estadio Azteca"),
        date: new Date("2026-06-18T02:00:00Z"),
      },
    ],
  });

  console.log("✅ 24 group stage matches seeded (Matchday 1)");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });