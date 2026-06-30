import { useEffect, useState } from "react";
import api from "../api/axios";
import MatchCard from "../components/MatchCard";
import ScoreInput from "../components/ScoreInput";
import Spinner from "../components/Spinner";

type Match = {
  id: number;
  date: string;
  tournamentStage:
    | "GROUP_STAGE"
    | "ROUND_OF_32"
    | "ROUND_OF_16"
    | "QUARTER_FINAL"
    | "SEMI_FINAL"
    | "THIRD_PLACE"
    | "FINAL";
  homeTeam: { id: number; name: string; code?: string };
  awayTeam: { id: number; name: string; code?: string };
  stadium: { id: number; name: string; city: string; country: string };
  homeScore: number | null;
  awayScore: number | null;
};

type ScoreEntry = { homeScore: string; awayScore: string };
type Team = { id: number; name: string; group: string; code?: string | null };
type Stadium = { id: number; name: string; city: string; country: string };
type FixtureForm = {
  homeTeamId: string;
  awayTeamId: string;
  stadiumId: string;
  date: string;
  tournamentStage: Exclude<StageFilter, "all">;
};
type StageFilter =
  | "all"
  | "GROUP_STAGE"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

const STAGE_FILTERS: Array<{ value: StageFilter; label: string }> = [
  { value: "all", label: "All stages" },
  { value: "GROUP_STAGE", label: "Group Stage" },
  { value: "ROUND_OF_32", label: "Round of 32" },
  { value: "ROUND_OF_16", label: "Round of 16" },
  { value: "QUARTER_FINAL", label: "Quarterfinals" },
  { value: "SEMI_FINAL", label: "Semifinals" },
  { value: "THIRD_PLACE", label: "Third Place" },
  { value: "FINAL", label: "Final" },
];

const STAGE_LABELS: Record<Exclude<StageFilter, "all">, string> = {
  GROUP_STAGE: "Group Stage",
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarterfinal",
  SEMI_FINAL: "Semifinal",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

const FIXTURE_STAGE_OPTIONS = STAGE_FILTERS.filter(
  (stage): stage is { value: Exclude<StageFilter, "all">; label: string } => stage.value !== "all",
);

const EMPTY_FIXTURE_FORM: FixtureForm = {
  homeTeamId: "",
  awayTeamId: "",
  stadiumId: "",
  date: "",
  tournamentStage: "ROUND_OF_16",
};

function toDateTimeLocalValue(isoDate: string) {
  const date = new Date(isoDate);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminResults() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<number, ScoreEntry>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState<StageFilter>("all");
  const [fixtureForm, setFixtureForm] = useState<FixtureForm>(EMPTY_FIXTURE_FORM);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [fixtureSubmitting, setFixtureSubmitting] = useState(false);
  const [fixtureFeedback, setFixtureFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // Admins need the full list to split into Pending/Completed;
        // request the server max so no matches get hidden by pagination.
        const [matchesRes, optionsRes] = await Promise.all([
          api.get("/matches", { params: { limit: 100 } }),
          api.get("/admin/fixtures/options"),
        ]);
        setMatches(matchesRes.data.data);
        setTeams(optionsRes.data.teams);
        setStadiums(optionsRes.data.stadiums);

        const existing: Record<number, ScoreEntry> = {};
        for (const m of matchesRes.data.data) {
          if (m.homeScore !== null && m.awayScore !== null) {
            existing[m.id] = {
              homeScore: String(m.homeScore),
              awayScore: String(m.awayScore),
            };
          }
        }
        setScores(existing);
      } catch {
        console.error("Failed to fetch matches");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const setSortedMatches = (nextMatches: Match[]) => {
    setMatches(
      [...nextMatches].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
    );
  };

  const handleChange = (matchId: number, field: "homeScore" | "awayScore", value: string) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleSubmit = async (matchId: number) => {
    const s = scores[matchId];
    if (s?.homeScore === undefined || s?.homeScore === "" ||
        s?.awayScore === undefined || s?.awayScore === "") {
      return;
    }

    setSubmitting(matchId);
    try {
      await api.patch(`/admin/matches/${matchId}/result`, {
        homeScore: Number(s.homeScore),
        awayScore: Number(s.awayScore),
      });

      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, homeScore: Number(s.homeScore), awayScore: Number(s.awayScore) }
            : m
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update result";
      const axiosErr = err as { response?: { data?: { error?: string } } };
      alert(axiosErr.response?.data?.error || message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleFixtureFieldChange = (field: keyof FixtureForm, value: string) => {
    setFixtureFeedback(null);
    setFixtureForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFixtureForm = () => {
    setEditingMatchId(null);
    setFixtureForm(EMPTY_FIXTURE_FORM);
  };

  const startEditingFixture = (match: Match) => {
    setEditingMatchId(match.id);
    setFixtureFeedback(null);
    setFixtureForm({
      homeTeamId: String(match.homeTeam.id),
      awayTeamId: String(match.awayTeam.id),
      stadiumId: String(match.stadium.id),
      date: toDateTimeLocalValue(match.date),
      tournamentStage: match.tournamentStage,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFixtureSubmit = async () => {
    if (
      !fixtureForm.homeTeamId ||
      !fixtureForm.awayTeamId ||
      !fixtureForm.stadiumId ||
      !fixtureForm.date
    ) {
      alert("Please complete every fixture field before saving.");
      return;
    }

    setFixtureSubmitting(true);
    setFixtureFeedback(null);

    try {
      const payload = {
        homeTeamId: Number(fixtureForm.homeTeamId),
        awayTeamId: Number(fixtureForm.awayTeamId),
        stadiumId: Number(fixtureForm.stadiumId),
        date: new Date(fixtureForm.date).toISOString(),
        tournamentStage: fixtureForm.tournamentStage,
      };

      const res = editingMatchId
        ? await api.patch(`/admin/matches/${editingMatchId}`, payload)
        : await api.post("/admin/matches", payload);

      const savedMatch = res.data as Match;
      setSortedMatches(
        editingMatchId
          ? matches.map((match) => (match.id === editingMatchId ? savedMatch : match))
          : [...matches, savedMatch],
      );

      resetFixtureForm();
      setFixtureFeedback(
        editingMatchId
          ? "Fixture updated. The admin list now reflects the latest kickoff details."
          : "Fixture created. It is now available for staging validation.",
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      alert(axiosErr.response?.data?.error || "Failed to save fixture");
    } finally {
      setFixtureSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  const filteredMatches =
    activeStage === "all"
      ? matches
      : matches.filter((match) => match.tournamentStage === activeStage);
  const unplayed = filteredMatches.filter((m) => m.homeScore === null);
  const played = filteredMatches.filter((m) => m.homeScore !== null);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Admin — Set Match Results</h1>

      <section className="card mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
          Fixture Builder
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold">
              {editingMatchId ? `Editing fixture #${editingMatchId}` : "Create a confirmed fixture"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Use this for confirmed knockout fixtures or safe pre-kickoff corrections. Completed matches stay protected so group-stage history and scored rounds remain intact.
            </p>
          </div>
          {editingMatchId && (
            <button
              type="button"
              onClick={resetFixtureForm}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-emerald-500/40 hover:text-white"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Home team</span>
            <select
              value={fixtureForm.homeTeamId}
              onChange={(event) => handleFixtureFieldChange("homeTeamId", event.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-white"
            >
              <option value="">Select home team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.group})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Away team</span>
            <select
              value={fixtureForm.awayTeamId}
              onChange={(event) => handleFixtureFieldChange("awayTeamId", event.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-white"
            >
              <option value="">Select away team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.group})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Stage</span>
            <select
              value={fixtureForm.tournamentStage}
              onChange={(event) =>
                handleFixtureFieldChange(
                  "tournamentStage",
                  event.target.value as FixtureForm["tournamentStage"],
                )
              }
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-white"
            >
              {FIXTURE_STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Stadium</span>
            <select
              value={fixtureForm.stadiumId}
              onChange={(event) => handleFixtureFieldChange("stadiumId", event.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-white"
            >
              <option value="">Select stadium</option>
              {stadiums.map((stadium) => (
                <option key={stadium.id} value={stadium.id}>
                  {stadium.name} — {stadium.city}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Kickoff</span>
            <input
              type="datetime-local"
              value={fixtureForm.date}
              onChange={(event) => handleFixtureFieldChange("date", event.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-white"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleFixtureSubmit}
            disabled={fixtureSubmitting}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {fixtureSubmitting
              ? "Saving fixture..."
              : editingMatchId
                ? "Save fixture changes"
                : "Create fixture"}
          </button>
          <p className="text-sm text-[var(--color-text-muted)]">
            Times save in UTC from the browser-selected local time.
          </p>
        </div>

        {fixtureFeedback && (
          <p className="mt-3 text-sm text-emerald-300">{fixtureFeedback}</p>
        )}
      </section>

      <section className="card mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
          Stage Filter
        </p>
        <h2 className="text-lg font-semibold">Manage results by tournament stage</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Narrow the list before posting or correcting results so group-stage history and knockout rounds stay easy to manage.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STAGE_FILTERS.map((stage) => {
            const isActive = activeStage === stage.value;
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => setActiveStage(stage.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-emerald-400 bg-emerald-500/15 text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/40 hover:text-white"
                }`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
      </section>

      {unplayed.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[var(--color-text-muted)] mb-3">
            Pending ({unplayed.length})
          </h2>
          <div className="space-y-3 stagger-children">
            {unplayed.map((match) => (
              <MatchCard
                key={match.id}
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                homeCode={match.homeTeam.code}
                awayCode={match.awayTeam.code}
                date={match.date}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
                statusLabel={`${STAGE_LABELS[match.tournamentStage]} • Match ID ${match.id}`}
                statusColor="text-sky-300"
              >
                <div className="space-y-3">
                  <ScoreInput
                    homeScore={scores[match.id]?.homeScore || ""}
                    awayScore={scores[match.id]?.awayScore || ""}
                    onChange={(field, value) => handleChange(match.id, field, value)}
                    onSubmit={() => handleSubmit(match.id)}
                    submitLabel="Set"
                    submitAriaLabel={`Set final score for ${match.homeTeam.name} versus ${match.awayTeam.name}`}
                    submitting={submitting === match.id}
                    variant="admin"
                    homeLabel={`${match.homeTeam.name} final score`}
                    awayLabel={`${match.awayTeam.name} final score`}
                    idPrefix={`admin-result-${match.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => startEditingFixture(match)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-emerald-500/40 hover:text-white"
                  >
                    Edit fixture details
                  </button>
                </div>
              </MatchCard>
            ))}
          </div>
        </section>
      )}

      {played.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-muted)] mb-3">
            Completed ({played.length})
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Need to fix a result? Update the score below and save again.
          </p>
          <div className="space-y-3">
            {played.map((match) => (
              <MatchCard
                key={match.id}
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                homeCode={match.homeTeam.code}
                awayCode={match.awayTeam.code}
                date={match.date}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
                statusLabel={`${STAGE_LABELS[match.tournamentStage]} • Match ID ${match.id}`}
                statusColor="text-[var(--color-text-muted)]"
              >
                <ScoreInput
                  homeScore={scores[match.id]?.homeScore || ""}
                  awayScore={scores[match.id]?.awayScore || ""}
                  onChange={(field, value) => handleChange(match.id, field, value)}
                  onSubmit={() => handleSubmit(match.id)}
                  submitLabel="Update"
                  submitAriaLabel={`Update final score for ${match.homeTeam.name} versus ${match.awayTeam.name}`}
                  submitting={submitting === match.id}
                  variant="admin"
                  homeLabel={`${match.homeTeam.name} corrected final score`}
                  awayLabel={`${match.awayTeam.name} corrected final score`}
                  idPrefix={`admin-corrected-result-${match.id}`}
                />
              </MatchCard>
            ))}
          </div>
        </section>
      )}

      {filteredMatches.length === 0 && (
        <section className="card">
          <p className="font-semibold">No matches in this stage yet</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Once fixtures are added for this round, they’ll show up here for result management.
          </p>
        </section>
      )}
    </div>
  );
}
