const GROUP_STAGE_OPENERS = [
  {
    group: "A",
    fixtures: [
      { home: "Mexico", away: "South Africa", venue: "Estadio Azteca", date: "2026-06-11T19:00:00Z" },
      { home: "South Korea", away: "Czech Republic", venue: "Estadio Akron", date: "2026-06-12T02:00:00Z" },
    ],
  },
  {
    group: "B",
    fixtures: [
      { home: "Canada", away: "Bosnia and Herzegovina", venue: "BMO Field", date: "2026-06-12T19:00:00Z" },
      { home: "Qatar", away: "Switzerland", venue: "Levi's Stadium", date: "2026-06-13T19:00:00Z" },
    ],
  },
  {
    group: "C",
    fixtures: [
      { home: "Brazil", away: "Morocco", venue: "MetLife Stadium", date: "2026-06-13T22:00:00Z" },
      { home: "Haiti", away: "Scotland", venue: "Gillette Stadium", date: "2026-06-14T01:00:00Z" },
    ],
  },
  {
    group: "D",
    fixtures: [
      { home: "USA", away: "Paraguay", venue: "SoFi Stadium", date: "2026-06-13T01:00:00Z" },
      { home: "Australia", away: "Türkiye", venue: "BC Place", date: "2026-06-13T22:00:00Z" },
    ],
  },
  {
    group: "E",
    fixtures: [
      { home: "Germany", away: "Curaçao", venue: "NRG Stadium", date: "2026-06-14T17:00:00Z" },
      { home: "Ivory Coast", away: "Ecuador", venue: "Lincoln Financial Field", date: "2026-06-14T23:00:00Z" },
    ],
  },
  {
    group: "F",
    fixtures: [
      { home: "Netherlands", away: "Japan", venue: "AT&T Stadium", date: "2026-06-14T20:00:00Z" },
      { home: "Sweden", away: "Tunisia", venue: "Estadio BBVA", date: "2026-06-15T02:00:00Z" },
    ],
  },
  {
    group: "G",
    fixtures: [
      { home: "Belgium", away: "Egypt", venue: "Lumen Field", date: "2026-06-15T19:00:00Z" },
      { home: "Iran", away: "New Zealand", venue: "SoFi Stadium", date: "2026-06-16T01:00:00Z" },
    ],
  },
  {
    group: "H",
    fixtures: [
      { home: "Spain", away: "Cape Verde", venue: "Mercedes-Benz Stadium", date: "2026-06-15T16:00:00Z" },
      { home: "Saudi Arabia", away: "Uruguay", venue: "Hard Rock Stadium", date: "2026-06-15T22:00:00Z" },
    ],
  },
  {
    group: "I",
    fixtures: [
      { home: "France", away: "Senegal", venue: "MetLife Stadium", date: "2026-06-16T19:00:00Z" },
      { home: "Iraq", away: "Norway", venue: "Gillette Stadium", date: "2026-06-16T22:00:00Z" },
    ],
  },
  {
    group: "J",
    fixtures: [
      { home: "Argentina", away: "Algeria", venue: "Arrowhead Stadium", date: "2026-06-17T01:00:00Z" },
      { home: "Austria", away: "Jordan", venue: "Levi's Stadium", date: "2026-06-17T04:00:00Z" },
    ],
  },
  {
    group: "K",
    fixtures: [
      { home: "Portugal", away: "DR Congo", venue: "NRG Stadium", date: "2026-06-17T17:00:00Z" },
      { home: "Uzbekistan", away: "Colombia", venue: "Estadio Azteca", date: "2026-06-18T02:00:00Z" },
    ],
  },
  {
    group: "L",
    fixtures: [
      { home: "England", away: "Croatia", venue: "AT&T Stadium", date: "2026-06-17T20:00:00Z" },
      { home: "Ghana", away: "Panama", venue: "BMO Field", date: "2026-06-17T23:00:00Z" },
    ],
  },
];

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function buildGroupStageFixtures() {
  return GROUP_STAGE_OPENERS.flatMap(({ group, fixtures }) => {
    const [first, second] = fixtures;
    const teamA = first.home;
    const teamB = first.away;
    const teamC = second.home;
    const teamD = second.away;

    return [
      { group, matchday: 1, ...first },
      { group, matchday: 1, ...second },
      {
        group,
        matchday: 2,
        home: teamA,
        away: teamC,
        venue: second.venue,
        date: addDays(first.date, 5),
      },
      {
        group,
        matchday: 2,
        home: teamD,
        away: teamB,
        venue: first.venue,
        date: addDays(second.date, 5),
      },
      {
        group,
        matchday: 3,
        home: teamA,
        away: teamD,
        venue: first.venue,
        date: addDays(first.date, 9),
      },
      {
        group,
        matchday: 3,
        home: teamB,
        away: teamC,
        venue: second.venue,
        date: addDays(second.date, 9),
      },
    ];
  });
}
