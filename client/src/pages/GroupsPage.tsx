import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Spinner from "../components/Spinner";

type TeamStanding = {
  position: number;
  name: string;
  MP: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  GD: number;
  Pts: number;
};

type Group = {
  name: string;
};

const STAT_COLS = ["MP", "W", "D", "L", "GF", "GA", "GD", "Pts"] as const;

export default function GroupsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<string[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedGroup = groupId || "A";

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await api.get<Group[]>("/groups");
        if (!ignore) setGroups(res.data.map((g) => g.name));
      } catch {
        console.error("Failed to fetch groups");
      }
    };
    void load();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    const load = async () => {
      try {
        const res = await api.get<TeamStanding[]>(`/groups/${selectedGroup}`);
        if (!ignore) setStandings(res.data);
      } catch {
        console.error("Failed to fetch standings");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => { ignore = true; };
  }, [selectedGroup]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Group Standings</h1>

      {/* Group selector */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 mb-8">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => navigate(`/groups/${g}`)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedGroup === g
                ? "bg-[var(--color-accent)] text-white shadow-lg shadow-emerald-900/30"
                : "bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)]/50"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Standings table */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="card p-0 overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">
              Group <span className="text-[var(--color-accent)]">{selectedGroup}</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  {STAT_COLS.map((col) => (
                    <th key={col} className="px-2 py-3 text-center w-10">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr
                    key={team.name}
                    className={`border-t border-[var(--color-border)] transition-colors ${
                      team.position <= 2
                        ? "bg-emerald-500/5"
                        : "hover:bg-[var(--color-card-hover)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-[var(--color-text-muted)]">
                      {team.position <= 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-[var(--color-accent)] text-xs font-bold">
                          {team.position}
                        </span>
                      ) : (
                        team.position
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{team.name}</td>
                    <td className="px-2 py-3 text-center text-[var(--color-text-muted)]">{team.MP}</td>
                    <td className="px-2 py-3 text-center">{team.W}</td>
                    <td className="px-2 py-3 text-center text-[var(--color-text-muted)]">{team.D}</td>
                    <td className="px-2 py-3 text-center text-[var(--color-text-muted)]">{team.L}</td>
                    <td className="px-2 py-3 text-center">{team.GF}</td>
                    <td className="px-2 py-3 text-center">{team.GA}</td>
                    <td className={`px-2 py-3 text-center font-medium ${
                      team.GD > 0 ? "text-emerald-400" : team.GD < 0 ? "text-red-400" : "text-[var(--color-text-muted)]"
                    }`}>
                      {team.GD > 0 ? `+${team.GD}` : team.GD}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-[var(--color-accent)]">
                      {team.Pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
            Qualifies for Round of 32
          </div>
        </div>
      )}
    </div>
  );
}
