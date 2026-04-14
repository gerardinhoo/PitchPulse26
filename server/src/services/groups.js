// const prisma = require("../generated/prisma")
import { prisma } from "../../lib/prisma.js";

function initStandings(teams) {
  const table = {}

  teams.forEach(team => {
    table[team.id] = {
      name: team.name,
      country: team.name,
      group: team.group,
      MP: 0,
      W: 0,
      D: 0,
      L: 0,
      GF: 0,
      GA: 0,
      GD: 0,
      Pts: 0,
    }
  })

  return table
}

function applyMatch(table, match) {
  const { homeTeamId, awayTeamId, homeScore, awayScore } = match

  // skip unplayed matches
  if (homeScore === null || awayScore === null) return

  const home = table[homeTeamId]
  const away = table[awayTeamId]

  home.MP++
  away.MP++

  home.GF += homeScore
  home.GA += awayScore

  away.GF += awayScore
  away.GA += homeScore

  if (homeScore > awayScore) {
    home.W++
    away.L++
    home.Pts += 3
  } else if (homeScore < awayScore) {
    away.W++
    home.L++
    away.Pts += 3
  } else {
    home.D++
    away.D++
    home.Pts += 1
    away.Pts += 1
  }
}

function finalize(table) {
  return Object.values(table)
    .map(team => ({
      ...team,
      GD: team.GF - team.GA
    }))
    .sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts
      if (b.GD !== a.GD) return b.GD - a.GD
      return b.GF - a.GF
    })
    .map((team, index) => ({
      position: index + 1,
      ...team
    }))
}

export const getAllGroups = async () => {
  const teams = await prisma.team.findMany()

  const groups = {}

  teams.forEach(team => {
    if (!groups[team.group]) {
      groups[team.group] = []
    }
    groups[team.group].push(team)
  })

  return Object.entries(groups).map(([name, teams]) => ({
    name,
    teams
  }))
}

export const getGroupStandings = async (groupName) => {
  const teams = await prisma.team.findMany({
    where: { group: groupName }
  })

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeam: { group: groupName } },
        { awayTeam: { group: groupName } }
      ]
    }
  })

  const table = initStandings(teams)

  matches.forEach(match => applyMatch(table, match))

  return finalize(table)
}
