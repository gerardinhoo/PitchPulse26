import { useEffect, useState } from "react";
import api from "../api/axios";
import MatchCard from "../components/MatchCard";
import ScoreInput from "../components/ScoreInput";
import Spinner from "../components/Spinner";

type Match = {
  id: number;
  date: string;
  homeTeam: { name: string; code?: string };
  awayTeam: { name: string; code?: string };
  homeScore: number | null;
  awayScore: number | null;
};

type ScoreEntry = { homeScore: string; awayScore: string };

export default function AdminResults() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<number, ScoreEntry>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // Admins need the full list to split fixtures needing a score vs corrections;
        // request enough to cover the full WC2026 schedule (104 fixtures).
        const res = await api.get("/matches", { params: { limit: 150 } });
        setMatches(res.data.data);

        const existing: Record<number, ScoreEntry> = {};
        for (const m of res.data.data) {
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

  if (loading) return <Spinner />;

  const missingResult = matches.filter((m) => m.homeScore === null);
  const recorded = matches.filter((m) => m.homeScore !== null);

  return (
    <div className="animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/85 mb-2">
        Tournament Maintenance
      </p>
      <h1 className="text-2xl font-bold mb-2">Historical Result Maintenance</h1>
      <p className="mb-6 max-w-3xl text-sm text-[var(--color-text-muted)]">
        Review completed fixtures and correct historical results when necessary. Changes continue
        to use the existing audit and scoring workflows.
      </p>

      {missingResult.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[var(--color-text-muted)] mb-3">
            Fixtures without a recorded score ({missingResult.length})
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            These matches do not yet have a final score in the archive. Enter a result only if a
            correction or backfill is required.
          </p>
          <div className="space-y-3 stagger-children">
            {missingResult.map((match) => (
              <MatchCard
                key={match.id}
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                homeCode={match.homeTeam.code}
                awayCode={match.awayTeam.code}
                date={match.date}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
              >
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
              </MatchCard>
            ))}
          </div>
        </section>
      )}

      {recorded.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-muted)] mb-3">
            Recorded results ({recorded.length})
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Need to fix a historical score? Update the values below and save again. The existing
            audit trail and scoring workflows still apply.
          </p>
          <div className="space-y-3">
            {recorded.map((match) => (
              <MatchCard
                key={match.id}
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                homeCode={match.homeTeam.code}
                awayCode={match.awayTeam.code}
                date={match.date}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
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
    </div>
  );
}
