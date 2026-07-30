# Tournament lifecycle

PitchPulse 26 was not finished on day one. It grew with the World Cup.

## Timeline of product evolution

1. **Initial concept** — Auth, group-stage fixtures, predictions, basic leaderboard on Neon + Express + React.
2. **Group-stage launch** — Live users register, verify email, predict opening matches; admin posts results; group standings compute dynamically.
3. **Live usage** — Matches page dashboard, pagination, prediction lock after kickoff, leaderboard polish, PWA install path.
4. **Group standings maturity** — Twelve groups, computed tables, deeper Matches UX and performance work.
5. **Round of 32 support** — `tournamentStage` schema, knockout UI, safe import scripts — after a production schema incident and recovery (see [incident-history.md](incident-history.md)).
6. **Round of 16** — Incremental fixture import + stage filters; cumulative points continue.
7. **Quarterfinals** — Same import/UI pattern; fewer fixtures, higher stakes on the table.
8. **Semifinals** — Final Four framing on the homepage progress card.
9. **Third-place match** — Dedicated stage + import; archive-ready labels.
10. **Final** — Premium Final UI, countdown, then champion celebration when scores land.
11. **Champion announcement** — Leaderboard + homepage surface PitchPulse champion from live standings; prize copy for Cape Verde jersey.
12. **Post-tournament archive** — Phases 1–2: archive homepage/Rules, Matches history mode, prediction write gate, final standings framing.
13. **Statistics page** — Public `/statistics` + `GET /api/statistics/tournament` summarizing participation and outcomes.
14. **Operational cleanup** — Phase 3: disable reminder cron, document imports, admin maintenance wording, env/docs classification.

## What this demonstrates

- Iterative delivery under a fixed external deadline (the World Cup calendar)
- Willingness to roll back and re-approach when production broke
- Separating **feature code**, **schema**, and **fixture data** as distinct release concerns
- Leaving a coherent archive instead of shutting the product off

## Related docs

- [tournament-operations.md](tournament-operations.md)
- [server/prisma/ARCHIVE.md](../server/prisma/ARCHIVE.md)
- [engineering-decisions.md](engineering-decisions.md)
