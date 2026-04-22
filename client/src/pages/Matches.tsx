import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import MatchCard from "../components/MatchCard";
import Pagination from "../components/Pagination";
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

type PredictionInput = { homeScore: string; awayScore: string; saved?: boolean };

const PAGE_SIZE = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export default function Matches() {
  const { user } = useAuth();
  const isVerified = user?.emailVerified !== false;
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));

  const [matches, setMatches] = useState<Match[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Record<number, PredictionInput>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [matchesRes, predictionsRes] = await Promise.all([
          api.get("/matches", { params: { page, limit: PAGE_SIZE } }),
          // Fetch up to the server max so predictions cover every page of matches.
          api.get("/predictions/my", { params: { limit: 100 } }).catch(() => null),
        ]);

        setMatches(matchesRes.data.data);
        setTotalPages(matchesRes.data.meta?.totalPages ?? 1);

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
    // Scroll to top when changing pages for a cleaner transition
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // If the server reports fewer pages than requested (e.g. deep-linked ?page=99),
  // clamp the URL to the last valid page.
  useEffect(() => {
    if (!loading && page > totalPages) {
      const next = new URLSearchParams(searchParams);
      if (totalPages > 1) next.set("page", String(totalPages));
      else next.delete("page");
      setSearchParams(next, { replace: true });
    }
  }, [loading, page, totalPages, searchParams, setSearchParams]);

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    setSearchParams(params);
  };

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
        <>
          <div className="space-y-3 stagger-children">
            {matches.map((match) => {
              const pred = predictions[match.id];
              const hasResult = match.homeScore !== null && match.awayScore !== null;
              const isLocked =
                !hasResult && new Date(match.date).getTime() <= Date.now();

              let statusLabel: string | undefined;
              let statusColor = "text-emerald-400";
              if (isLocked) {
                statusLabel = pred?.saved
                  ? `Match locked — your prediction: ${pred.homeScore} – ${pred.awayScore}`
                  : "Match locked";
                statusColor = "text-[var(--color-text-muted)]";
              } else if (!isVerified) {
                statusLabel = "Verify your email to submit predictions";
                statusColor = "text-yellow-300";
              } else if (pred?.saved && !hasResult) {
                statusLabel = `Your prediction: ${pred.homeScore} – ${pred.awayScore}`;
              }

              return (
                <MatchCard
                  key={match.id}
                  homeTeam={match.homeTeam.name}
                  awayTeam={match.awayTeam.name}
                  homeCode={match.homeTeam.code}
                  awayCode={match.awayTeam.code}
                  date={match.date}
                  homeScore={match.homeScore}
                  awayScore={match.awayScore}
                  statusLabel={statusLabel}
                  statusColor={statusColor}
                >
                  {!isLocked && isVerified && (
                    <ScoreInput
                      homeScore={pred?.homeScore || ""}
                      awayScore={pred?.awayScore || ""}
                      onChange={(field, value) => handleChange(match.id, field, value)}
                      onSubmit={() => handleSubmit(match.id)}
                      submitLabel={pred?.saved ? "Update" : "Submit"}
                      submitting={submitting === match.id}
                      variant={pred?.saved ? "saved" : "default"}
                    />
                  )}
                </MatchCard>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
