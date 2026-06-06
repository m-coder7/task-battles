import { useEffect, useState } from "react";
import { Swords, Trophy, User } from "lucide-react";

export default function RivalryScoreWidget({ theme }: { theme: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const json: any = await invoke("read_shared_data");
      setData(json?.rivalry || null);
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="widget-muted text-sm">Loading...</div>;

  const profile = data?.profile || {};
  const rivalData = data?.rival || {};
  const score = profile?.score ?? 0;
  const rivalScore = rivalData?.score ?? 0;
  const rivalName = profile?.rival_name || "Rival";

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={13} className="widget-accent" />
        <span className="text-[11px] font-bold widget-accent uppercase tracking-wide">Rivalry Score</span>
      </div>

      {!profile || Object.keys(profile).length === 0 ? (
        <p className="text-sm widget-muted text-center py-6">No rivalry data yet</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FF9500]/20 flex items-center justify-center">
                <User size={12} className="widget-accent" />
              </div>
              <div>
                <span className="text-sm font-medium widget-text">You</span>
              </div>
            </div>
            <span className="text-2xl font-bold widget-text">{score}</span>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Swords size={12} className="widget-muted" />
              </div>
              <div>
                <span className="text-sm font-medium widget-text">{rivalName}</span>
              </div>
            </div>
            <span className="text-2xl font-bold widget-muted">{rivalScore}</span>
          </div>

          <div className="pt-1">
            <div className="flex justify-between text-[10px] widget-muted">
              <span>You're {score > rivalScore ? "winning!" : score < rivalScore ? "behind" : "tied"}</span>
              <span>{score - rivalScore > 0 ? "+" : ""}{score - rivalScore}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
