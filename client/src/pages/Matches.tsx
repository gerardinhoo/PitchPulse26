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

type PredictionInput = { homeScore: string; awayScore: string; saved?: boolean };

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Record<number, PredictionInput>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchesRes, predictionsRes] = await Promise.all([
          api.get("/matches"),
          api.get("/predictions/my").catch(() => null),
        ]);

        setMatches(matchesRes.data.data);

        if (predictionsRes?.data?.data) {
          const saved: Record<number, PredictionInput> = {};
          for (const p of predictionsRes.data.data) {
            saved[p.matchId] = {
              homeScore: String(p.homeScore),
              awayScore: String(p.awayScore),
              saved: true,
            };
          }
          setPredictions(saved);
        }
      } catch {
        console.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (matchId: number, field: "homeScore" | "awayScore", value: string) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value, saved: false },
    }));
  };

  const handleSubmit = async (matchId: number) => {
    const pred = predictions[matchId];
    if (pred?.homeScore === undefined || pred?.homeScore === "" ||
        pred?.awayScore === undefined || pred?.awayScore === "") {
      return;
    }

    setSubmitting(matchId);
    try {
      await api.post("/predictions", {
        matchId,
        homeScore: Number(pred.homeScore),
        awayScore: Number(pred.awayScore),
      });
      setPredictions((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], saved: true },
      }));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      alert(axiosErr.response?.data?.error || "Failed to submit");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Matches</h1>

      {matches.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🏟️</p>
          <p className="text-[var(--color-text-muted)]">
            No matches scheduled yet. Check back soon!
          </p>
        </div>
      ) : (
      <div className="space-y-3 stagger-children">
        {matches.map((match) => {
          const pred = predictions[match.id];
          const hasResult = match.homeScore !== null && match.awayScore !== null;

          const statusLabel = pred?.saved && !hasResult
            ? `Your prediction: ${pred.homeScore} – ${pred.awayScore}`
            : undefined;

          return (
            <MatchCard
              key={match.id}
              homeTeam={match.homeTeam.name}
              awayTeam={match.awayTeam.name}
              date={match.date}
              homeScore={match.homeScore}
              awayScore={match.awayScore}
              statusLabel={statusLabel}
              statusColor="text-emerald-400"
            >
              <ScoreInput
                homeScore={pred?.homeScore || ""}
                awayScore={pred?.awayScore || ""}
                onChange={(field, value) => handleChange(match.id, field, value)}
                onSubmit={() => handleSubmit(match.id)}
                submitLabel={pred?.saved ? "Update" : "Submit"}
                submitting={submitting === match.id}
                variant={pred?.saved ? "saved" : "default"}
              />
            </MatchCard>
          );
        })}
      </div>
      )}
    </div>
  );
}
