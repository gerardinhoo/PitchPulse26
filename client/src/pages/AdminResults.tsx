import { useEffect, useState } from "react";
import api from "../api/axios";
import MatchCard from "../components/MatchCard";
import ScoreInput from "../components/ScoreInput";
import Spinner from "../components/Spinner";

type Match = {
  id: number;
  date: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
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
        const res = await api.get("/matches");
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

  const unplayed = matches.filter((m) => m.homeScore === null);
  const played = matches.filter((m) => m.homeScore !== null);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Admin — Set Match Results</h1>

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
                  submitting={submitting === match.id}
                  variant="admin"
                />
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
          <div className="space-y-3">
            {played.map((match) => (
              <MatchCard
                key={match.id}
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                date={match.date}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
