import { useState, useMemo } from "react";
import { format, getDaysInMonth, getDate } from "date-fns";
import {
  Swords, Copy, Check, UserPlus, LogIn, Trophy, Unlink, RefreshCw,
  WifiOff, Calendar, Crown,
} from "lucide-react";
import { useRivalry } from "@/hooks/useRivalry";
import { useGoals, isCompletedToday, isActiveToday } from "@/hooks/useGoals";

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
        <div className="h-full bg-primary rounded-l-full transition-all duration-700" style={{ width: `${mePct}%` }} />
        <div className="h-full bg-orange-500 rounded-r-full transition-all duration-700" style={{ width: `${100 - mePct}%` }} />
      </div>
    </div>
  );
}

function SetupProfile({ onCreate, loading, error, onRetry }: {
  onCreate: (name: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [name, setName] = useState("");
  const isOffline = error?.includes("internet") || error?.includes("connection") || error?.includes("offline");
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
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-left">
            <div className="flex items-center gap-2 mb-1">
              {isOffline && <WifiOff size={13} className="text-destructive shrink-0" />}
              <p className="text-xs text-destructive font-medium">{error}</p>
            </div>
            {isOffline && (
              <button onClick={onRetry} className="text-xs text-primary underline">
                Retry connection
              </button>
            )}
          </div>
        )}
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

function ConnectRival({ myCode, onConnect, loading, error, onClearError, online }: {
  myCode: string;
  onConnect: (code: string) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  online: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [rivalCode, setRivalCode] = useState("");

  function copy() {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {!online && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 px-3 py-2 flex items-center gap-2">
          <WifiOff size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">You're offline — rivalry features need internet</p>
        </div>
      )}

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
          <button onClick={copy} className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
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
            disabled={rivalCode.trim().length < 4 || loading || !online}
            onClick={() => onConnect(rivalCode.trim())}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-500/90 disabled:opacity-50 transition"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : "Challenge"}
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RivalryPanel() {
  const { goals } = useGoals();
  const today = format(new Date(), "yyyy-MM-dd");
  const yearMonth = format(new Date(), "yyyy-MM");
  const monthLabel = format(new Date(), "MMMM yyyy");
  const daysInMonth = getDaysInMonth(new Date());
  const dayOfMonth = getDate(new Date());

  const myStats = useMemo(() => {
    const todayGoals = goals.filter((g) => {
      const repeat = g.repeat ?? "none";
      if (repeat !== "none") return isActiveToday(g);
      return g.date === today;
    });
    const completed = todayGoals.filter((g) => isCompletedToday(g)).length;
    const total = todayGoals.length;
    return { completed, total };
  }, [goals, today]);

  const {
    profile, rivalInfo, myDailyStats, rivalDailyStats,
    myMonthlyStats, rivalMonthlyStats, lastMonthResult,
    loading, error, rivalCode, online,
    createProfile, connectRival, disconnectRival, setError, retryConnection,
  } = useRivalry(myStats);

  if (!profile) {
    return <SetupProfile onCreate={createProfile} loading={loading} error={error} onRetry={retryConnection} />;
  }

  const meRate = myDailyStats?.rate ?? (myStats.total > 0 ? Math.round((myStats.completed / myStats.total) * 100) : 0);
  const meCompleted = myDailyStats?.completed ?? myStats.completed;
  const meTotal = myDailyStats?.total ?? myStats.total;

  const rivalRate = rivalDailyStats?.rate ?? 0;
  const rivalCompleted = rivalDailyStats?.completed ?? 0;
  const rivalTotal = rivalDailyStats?.total ?? 0;

  const meWinning = rivalInfo ? meRate > rivalRate : null;
  const tied = rivalInfo ? meRate === rivalRate : null;

  const myMonthAvg = myMonthlyStats?.avgRate ?? 0;
  const rivalMonthAvg = rivalMonthlyStats?.avgRate ?? 0;
  const myDaysTracked = myMonthlyStats?.daysTracked ?? 0;
  const rivalDaysTracked = rivalMonthlyStats?.daysTracked ?? 0;
  const meLeadingMonth = myMonthAvg > rivalMonthAvg;
  const monthTied = myMonthAvg === rivalMonthAvg;
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

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
          {!online && <WifiOff size={13} className="text-amber-500" />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{profile.inviteCode}</span>
          <span>you</span>
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
            online={online}
          />
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <WifiOff size={13} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">Connection issue — showing cached data</p>
                </div>
                <button onClick={retryConnection} className="text-xs text-primary font-medium underline whitespace-nowrap">Retry</button>
              </div>
            )}

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
                  <div className="text-xs text-muted-foreground">{meCompleted}/{meTotal} today</div>
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
                    {rivalDailyStats ? `${rivalCompleted}/${rivalTotal} today` : "No data yet"}
                  </div>
                </div>
              </div>
            </div>

            <ProgressBar me={meRate} rival={rivalRate} />

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Verdict</span>
              </div>
              {rivalDailyStats ? (
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {meWinning ? "🏆" : tied ? "🤝" : "💀"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {meWinning
                        ? `You're ahead by ${meRate - rivalRate}%`
                        : tied
                        ? "It's a tie right now"
                        : `${rivalInfo.displayName} leads by ${rivalRate - meRate}%`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {meWinning ? "Keep the pressure on — don't slow down." :
                       tied ? "One more goal could break the tie." :
                       "Time to catch up. You've got this."}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Waiting for {rivalInfo.displayName} to log their first goal today…
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monthly Race</span>
                </div>
                <span className="text-xs text-muted-foreground">{monthLabel}</span>
              </div>

              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/40 rounded-full transition-all"
                  style={{ width: `${monthProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Day {dayOfMonth} of {daysInMonth} — {daysInMonth - dayOfMonth} days left
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 border ${meLeadingMonth && !monthTied ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {meLeadingMonth && !monthTied && <Crown size={11} className="text-primary" />}
                    <span className="text-xs font-semibold text-foreground truncate">{profile.displayName}</span>
                  </div>
                  <div className="text-2xl font-black text-primary">{myMonthAvg}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">avg over {myDaysTracked} day{myDaysTracked !== 1 ? "s" : ""}</div>
                </div>

                <div className={`rounded-lg p-3 border ${!meLeadingMonth && !monthTied ? "border-orange-500/30 bg-orange-500/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {!meLeadingMonth && !monthTied && <Crown size={11} className="text-orange-500" />}
                    <span className="text-xs font-semibold text-foreground truncate">{rivalInfo.displayName}</span>
                  </div>
                  <div className="text-2xl font-black text-orange-500">{rivalMonthAvg}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">avg over {rivalDaysTracked} day{rivalDaysTracked !== 1 ? "s" : ""}</div>
                </div>
              </div>

              {monthTied && (myDaysTracked > 0 || rivalDaysTracked > 0) && (
                <p className="text-xs text-center text-muted-foreground">Perfectly tied — every goal matters now!</p>
              )}
              {!monthTied && (myDaysTracked > 0 || rivalDaysTracked > 0) && (
                <p className="text-xs text-center text-muted-foreground">
                  {meLeadingMonth
                    ? `You're ahead by ${myMonthAvg - rivalMonthAvg}% — keep it up!`
                    : `${rivalInfo.displayName} leads by ${rivalMonthAvg - myMonthAvg}% — time to grind.`}
                </p>
              )}

              {lastMonthResult && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-400/30 p-3 flex items-center gap-3">
                  <div className="text-2xl">🏅</div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {lastMonthResult.winner === profile.displayName ? "You won last month!" : `${lastMonthResult.winner} won last month`}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {lastMonthResult.myAvg}% vs {lastMonthResult.rivalAvg}% average
                    </div>
                  </div>
                </div>
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
