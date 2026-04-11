import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  points: number;
};

const RANK_LABELS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const RANK_BG: Record<number, string> = {
  1: "border-yellow-500/30 bg-yellow-500/5",
  2: "border-gray-400/30 bg-gray-400/5",
  3: "border-amber-600/30 bg-amber-600/5",
};

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get("/leaderboard");
        setLeaders(res.data.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      <div className="max-w-xl mx-auto">
        {leaders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">⚽</p>
            <p className="text-[var(--color-text-muted)]">
              No predictions scored yet. Check back once match results are in!
            </p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {leaders.map((player) => {
              const isCurrentUser = user?.id === player.userId;
              const isTop3 = player.rank <= 3;

              return (
                <div
                  key={player.userId}
                  className={`card flex justify-between items-center ${
                    isCurrentUser
                      ? "ring-1 ring-[var(--color-accent)] border-[var(--color-accent)]/40"
                      : isTop3
                        ? RANK_BG[player.rank]
                        : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-8 text-center">
                      {RANK_LABELS[player.rank] || `#${player.rank}`}
                    </span>
                    <span className="font-medium">
                      {player.displayName}
                      {isCurrentUser && (
                        <span className="text-xs text-[var(--color-accent)] ml-2">(you)</span>
                      )}
                    </span>
                  </div>

                  <span className="font-bold text-[var(--color-accent)] tabular-nums">
                    {player.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
