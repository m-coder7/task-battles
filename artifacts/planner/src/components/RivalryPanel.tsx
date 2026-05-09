import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  Swords, Copy, Check, UserPlus, LogIn, Trophy, Flame, TrendingUp, Unlink, RefreshCw,
} from "lucide-react";
import { useRivalry } from "@/hooks/useRivalry";
import { useGoals } from "@/hooks/useGoals";

function StatRing({ value, size = 80, color }: { value: number; size?: number; color: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/60" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function ProgressBar({ me, rival }: { me: number; rival: number }) {
  const total = me + rival;
  const mePct = total === 0 ? 50 : (me / total) * 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className="text-primary">You</span>
        <span className="text-orange-500">Rival</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
        <div
          className="h-full bg-primary rounded-l-full transition-all duration-700"
          style={{ width: `${mePct}%` }}
        />
        <div
          className="h-full bg-orange-500 rounded-r-full transition-all duration-700"
          style={{ width: `${100 - mePct}%` }}
        />
      </div>
    </div>
  );
}

function SetupProfile({ onCreate, loading, error }: {
  onCreate: (name: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Swords size={28} className="text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">Set up your rival profile</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Choose a display name. Your task details stay private — only your completion stats are shared.
      </p>
      <div className="w-full max-w-xs space-y-3">
        <input
          autoFocus
          type="text"
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreate(name.trim())}
          maxLength={24}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          disabled={!name.trim() || loading}
          onClick={() => onCreate(name.trim())}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? "Creating…" : "Create Profile"}
        </button>
      </div>
    </div>
  );
}

function ConnectRival({ myCode, onConnect, loading, error, onClearError }: {
  myCode: string;
  onConnect: (code: string) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [rivalCode, setRivalCode] = useState("");

  function copy() {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={15} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Your Invite Code</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Share this with your rival so they can challenge you.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xl font-mono font-bold text-primary tracking-widest text-center select-all">
            {myCode}
          </div>
          <button
            onClick={copy}
            className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <LogIn size={15} className="text-orange-500" />
          <span className="text-sm font-semibold text-foreground">Enter Rival's Code</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Ask your rival for their code and enter it here.</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ABC123"
            value={rivalCode}
            onChange={(e) => { setRivalCode(e.target.value.toUpperCase()); onClearError(); }}
            onKeyDown={(e) => e.key === "Enter" && rivalCode.trim().length >= 4 && onConnect(rivalCode.trim())}
            maxLength={8}
            className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition uppercase"
          />
          <button
            disabled={rivalCode.trim().length < 4 || loading}
            onClick={() => onConnect(rivalCode.trim())}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-500/90 disabled:opacity-50 transition"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : "Challenge"}
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default function RivalryPanel() {
  const { goals } = useGoals();

  const today = format(new Date(), "yyyy-MM-dd");

  const myStats = useMemo(() => {
    const todayGoals = goals.filter((g) => g.date === today);
    const completed = todayGoals.filter((g) => g.completed).length;
    const total = todayGoals.length;
    return { completed, total };
  }, [goals, today]);

  const {
    profile, rivalInfo, myDailyStats, rivalDailyStats,
    loading, error, rivalCode,
    createProfile, connectRival, disconnectRival, setError,
  } = useRivalry(myStats);

  if (!profile) {
    return <SetupProfile onCreate={createProfile} loading={loading} error={error} />;
  }

  const meRate = myDailyStats?.rate ?? (myStats.total > 0 ? Math.round((myStats.completed / myStats.total) * 100) : 0);
  const meCompleted = myDailyStats?.completed ?? myStats.completed;
  const meTotal = myDailyStats?.total ?? myStats.total;

  const rivalRate = rivalDailyStats?.rate ?? 0;
  const rivalCompleted = rivalDailyStats?.completed ?? 0;
  const rivalTotal = rivalDailyStats?.total ?? 0;

  const meWinning = rivalInfo ? meRate > rivalRate : null;
  const tied = rivalInfo ? meRate === rivalRate : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Swords size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Rivalry</h2>
          {rivalInfo && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              meWinning ? "bg-green-500/15 text-green-700" :
              tied ? "bg-yellow-500/15 text-yellow-700" :
              "bg-red-500/15 text-red-700"
            }`}>
              {meWinning ? "Winning" : tied ? "Tied" : "Behind"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{profile.inviteCode}</span>
          <span className="text-muted-foreground">you</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!rivalCode || !rivalInfo ? (
          <ConnectRival
            myCode={profile.inviteCode}
            onConnect={connectRival}
            loading={loading}
            error={error}
            onClearError={() => setError(null)}
          />
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <div className="relative">
                  <StatRing value={meRate} color="hsl(214, 85%, 44%)" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{meRate}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground truncate max-w-[90px]">{profile.displayName}</div>
                  <div className="text-xs text-muted-foreground">{meCompleted}/{meTotal} goals</div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <div className="relative">
                  <StatRing value={rivalRate} color="rgb(249,115,22)" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{rivalRate}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground truncate max-w-[90px]">{rivalInfo.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {rivalDailyStats ? `${rivalCompleted}/${rivalTotal} goals` : "No data yet"}
                  </div>
                </div>
              </div>
            </div>

            <ProgressBar me={meRate} rival={rivalRate} />

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Breakdown</div>
              {[
                { label: "Goals Completed", me: meCompleted, rival: rivalCompleted, unit: "" },
                { label: "Completion Rate", me: meRate, rival: rivalRate, unit: "%" },
              ].map(({ label, me, rival, unit }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{label}</span>
                    <span className="font-medium text-foreground">{me}{unit} vs {rival}{unit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${(me + rival) === 0 ? 50 : (me / (me + rival)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verdict</span>
              </div>
              {rivalDailyStats ? (
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-black ${meWinning ? "text-green-600" : tied ? "text-yellow-600" : "text-red-600"}`}>
                    {meWinning ? "🏆" : tied ? "🤝" : "💀"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {meWinning
                        ? `You're ahead by ${meRate - rivalRate}%`
                        : tied
                        ? "It's a tie right now"
                        : `${rivalInfo.displayName} leads by ${rivalRate - meRate}%`
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {meWinning
                        ? "Keep the pressure on — don't slow down."
                        : tied
                        ? "One more goal could break the tie."
                        : "Time to catch up. You've got this."}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Waiting for {rivalInfo.displayName} to log their first goal today…
                </p>
              )}
            </div>

            <button
              onClick={disconnectRival}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
            >
              <Unlink size={13} />
              Remove {rivalInfo.displayName} as rival
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
