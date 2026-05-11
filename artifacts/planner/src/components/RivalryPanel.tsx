import { useState, useMemo } from "react";
import { format, getDaysInMonth, getDate } from "date-fns";
import {
  Swords, Copy, Check, UserPlus, LogIn, Trophy, Unlink, RefreshCw,
  WifiOff, Calendar, Crown, Settings, Trash2, X, Flame, Pencil,
} from "lucide-react";
import { useRivalry, WeekDay } from "@/hooks/useRivalry";
import { useGoals, isCompletedToday, isActiveToday } from "@/hooks/useGoals";

const REACTIONS = ["🔥", "💀", "🏆", "😤", "😴", "🤡"];

// ─── Stat ring ───────────────────────────────────────────────────────────────
function StatRing({ value, size = 80, color }: { value: number; size?: number; color: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={8} className="text-muted/60" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${(value / 100) * circ} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ─── Head-to-head bar ─────────────────────────────────────────────────────────
function HeadToHead({ me, rival }: { me: number; rival: number }) {
  const total  = me + rival;
  const mePct  = total === 0 ? 50 : (me / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1.5">
        <span className="text-primary">You</span>
        <span className="text-orange-500">Rival</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-primary rounded-l-full transition-all duration-700" style={{ width: `${mePct}%` }} />
        <div className="h-full bg-orange-500 rounded-r-full transition-all duration-700" style={{ width: `${100 - mePct}%` }} />
      </div>
    </div>
  );
}

// ─── 7-day chart ─────────────────────────────────────────────────────────────
function WeekChart({ history, myName, rivalName }: { history: WeekDay[]; myName: string; rivalName: string }) {
  if (history.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading 7-day history…
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-end gap-1.5 h-24">
        {history.map((day) => {
          const isToday = day.date === format(new Date(), "yyyy-MM-dd");
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 h-full">
              <div className="flex-1 flex items-end gap-0.5 w-full">
                <div
                  className={`flex-1 rounded-t-sm transition-all ${day.myRate >= 0 ? "bg-primary" : "bg-primary/15"}`}
                  style={{ height: day.myRate >= 0 ? `${Math.max(day.myRate, 6)}%` : "6%" }}
                  title={`${myName}: ${day.myRate >= 0 ? day.myRate + "%" : "no data"}`}
                />
                <div
                  className={`flex-1 rounded-t-sm transition-all ${day.rivalRate >= 0 ? "bg-orange-500" : "bg-orange-200/40"}`}
                  style={{ height: day.rivalRate >= 0 ? `${Math.max(day.rivalRate, 6)}%` : "6%" }}
                  title={`${rivalName}: ${day.rivalRate >= 0 ? day.rivalRate + "%" : "no data"}`}
                />
              </div>
              <span className={`text-[9px] font-medium ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {isToday ? "Today" : day.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 justify-center">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-primary inline-block" />
          <span className="text-[10px] text-muted-foreground">{myName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />
          <span className="text-[10px] text-muted-foreground">{rivalName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Setup profile screen ─────────────────────────────────────────────────────
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
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Pick a display name. Your task details stay private — only your completion rate is shared with your rival.
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
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-left">
            <div className="flex items-center gap-2 mb-1">
              {isOffline && <WifiOff size={13} className="text-destructive shrink-0" />}
              <p className="text-xs text-destructive font-medium">{error}</p>
            </div>
            {isOffline && (
              <button onClick={onRetry} className="text-xs text-primary underline">Retry connection</button>
            )}
          </div>
        )}
        <button
          disabled={!name.trim() || loading}
          onClick={() => onCreate(name.trim())}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? "Creating…" : "Create Profile"}
        </button>
      </div>
    </div>
  );
}

// ─── Connect rival screen ────────────────────────────────────────────────────
function ConnectRival({ myCode, onConnect, loading, error, onClearError, online }: {
  myCode: string;
  onConnect: (code: string) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  online: boolean;
}) {
  const [copied, setCopied]         = useState(false);
  const [rivalCode, setRivalCode]   = useState("");

  function copy() {
    navigator.clipboard.writeText(myCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-y-auto">
      {!online && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2.5 flex items-center gap-2">
          <WifiOff size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">You're offline — rivalry features need internet</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Your Invite Code</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Share this with your rival so they can challenge you.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-2xl font-mono font-black text-primary tracking-[0.3em] text-center select-all">
            {myCode}
          </div>
          <button
            onClick={copy}
            className="p-3 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <LogIn size={14} className="text-orange-500" />
          <span className="text-sm font-semibold text-foreground">Challenge a Rival</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Get their invite code and enter it here to start competing.</p>
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
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-500/90 disabled:opacity-50 transition"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : "⚔️ Challenge"}
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Both players need to enter each other's codes to connect.<br />
          Once connected, your daily goal completion rates are compared live.
        </p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function RivalryPanel() {
  const { goals } = useGoals();
  const today     = format(new Date(), "yyyy-MM-dd");
  const yearMonth = format(new Date(), "yyyy-MM");
  const monthLabel    = format(new Date(), "MMMM yyyy");
  const daysInMonth   = getDaysInMonth(new Date());
  const dayOfMonth    = getDate(new Date());
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingName, setEditingName]   = useState(false);
  const [nameInput, setNameInput]       = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reactionSent, setReactionSent] = useState<string | null>(null);

  const myStats = useMemo(() => {
    const todayGoals = goals.filter((g) => {
      const repeat = g.repeat ?? "none";
      return repeat !== "none" ? isActiveToday(g) : g.date === today;
    });
    const completed = todayGoals.filter((g) => isCompletedToday(g)).length;
    return { completed, total: todayGoals.length };
  }, [goals, today]);

  const {
    profile, rivalInfo, myDailyStats, rivalDailyStats,
    myMonthlyStats, rivalMonthlyStats, lastMonthResult,
    weekHistory, incomingReaction, myStreak, rivalStreak,
    loading, error, rivalCode, online,
    createProfile, changeDisplayName, connectRival,
    disconnectRival, deleteProfile,
    sendReaction, clearIncomingReaction,
    setError, retryConnection,
  } = useRivalry(myStats);

  function handleSendReaction(emoji: string) {
    sendReaction(emoji);
    setReactionSent(emoji);
    setTimeout(() => setReactionSent(null), 2000);
  }

  function handleSaveName() {
    if (nameInput.trim()) changeDisplayName(nameInput.trim());
    setEditingName(false);
    setSettingsOpen(false);
  }

  if (!profile) {
    return <SetupProfile onCreate={createProfile} loading={loading} error={error} onRetry={retryConnection} />;
  }

  const meRate      = myDailyStats?.rate ?? (myStats.total > 0 ? Math.round((myStats.completed / myStats.total) * 100) : 0);
  const meCompleted = myDailyStats?.completed ?? myStats.completed;
  const meTotal     = myDailyStats?.total ?? myStats.total;
  const rivalRate   = rivalDailyStats?.rate ?? 0;
  const rivalCompleted = rivalDailyStats?.completed ?? 0;
  const rivalTotal     = rivalDailyStats?.total ?? 0;

  const meWinning = rivalInfo ? meRate > rivalRate : null;
  const tied      = rivalInfo ? meRate === rivalRate : null;

  const myMonthAvg      = myMonthlyStats?.avgRate ?? 0;
  const rivalMonthAvg   = rivalMonthlyStats?.avgRate ?? 0;
  const myDaysTracked   = myMonthlyStats?.daysTracked ?? 0;
  const rivalDaysTracked = rivalMonthlyStats?.daysTracked ?? 0;
  const meLeadingMonth  = myMonthAvg > rivalMonthAvg;
  const monthTied       = myMonthAvg === rivalMonthAvg;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <Swords size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Rivalry</h2>
          {rivalInfo && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              meWinning ? "bg-green-500/15 text-green-700" :
              tied      ? "bg-yellow-500/15 text-yellow-700" :
                          "bg-red-500/15 text-red-700"
            }`}>
              {meWinning ? "Winning 🏆" : tied ? "Tied 🤝" : "Behind 💀"}
            </span>
          )}
          {!online && <WifiOff size={13} className="text-amber-500" />}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg tracking-widest select-all">
            {profile.inviteCode}
          </div>
          <div className="relative">
            <button
              onClick={() => { setSettingsOpen((o) => !o); setEditingName(false); setConfirmDelete(false); }}
              className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${settingsOpen ? "bg-muted text-foreground" : ""}`}
            >
              <Settings size={15} />
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">{profile.displayName}</p>
                  <p className="text-[10px] text-muted-foreground">Rivalry profile settings</p>
                </div>

                {!editingName && !confirmDelete && (
                  <>
                    <button
                      onClick={() => { setEditingName(true); setNameInput(profile.displayName); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                    >
                      <Pencil size={13} className="text-muted-foreground" />
                      Change display name
                    </button>
                    {rivalInfo && (
                      <button
                        onClick={() => { setConfirmLeave(true); setSettingsOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                      >
                        <Unlink size={13} className="text-muted-foreground" />
                        Leave rivalry with {rivalInfo.displayName}
                      </button>
                    )}
                    <div className="h-px bg-border mx-3" />
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <Trash2 size={13} />
                      Delete profile
                    </button>
                  </>
                )}

                {editingName && (
                  <div className="p-3 space-y-2">
                    <input
                      autoFocus
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                      maxLength={24}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditingName(false)} className="flex-1 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">Cancel</button>
                      <button
                        onClick={handleSaveName}
                        disabled={!nameInput.trim()}
                        className="flex-1 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {confirmDelete && (
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium text-destructive">Delete your rivalry profile? This cannot be undone.</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">Cancel</button>
                      <button
                        onClick={() => { deleteProfile(); setSettingsOpen(false); }}
                        className="flex-1 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" onClick={() => setSettingsOpen(false)}>
        {/* No rival connected */}
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
            {/* Offline warning */}
            {error && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <WifiOff size={13} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Offline — showing cached data</p>
                </div>
                <button onClick={retryConnection} className="text-xs text-primary font-medium underline whitespace-nowrap">Retry</button>
              </div>
            )}

            {/* Incoming reaction banner */}
            {incomingReaction && (
              <div className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-3 flex items-center gap-3">
                <span className="text-3xl">{incomingReaction.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{incomingReaction.fromName} sent you a reaction!</p>
                  <p className="text-[11px] text-muted-foreground">They're thinking about you 👀</p>
                </div>
                <button onClick={clearIncomingReaction} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Today's stat rings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <div className="relative">
                  <StatRing value={meRate} color="hsl(214, 85%, 44%)" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-foreground">{meRate}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground truncate max-w-[100px]">{profile.displayName}</div>
                  <div className="text-xs text-muted-foreground">{meCompleted}/{meTotal} today</div>
                  {myStreak > 0 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Flame size={10} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-orange-500">{myStreak}-day streak</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <div className="relative">
                  <StatRing value={rivalRate} color="rgb(249,115,22)" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-foreground">{rivalRate}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground truncate max-w-[100px]">{rivalInfo.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {rivalDailyStats ? `${rivalCompleted}/${rivalTotal} today` : "No data yet"}
                  </div>
                  {rivalStreak > 0 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Flame size={10} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-orange-500">{rivalStreak}-day streak</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Head to head bar */}
            <HeadToHead me={meRate} rival={rivalRate} />

            {/* Today's verdict */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Verdict</span>
              </div>
              {rivalDailyStats ? (
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{meWinning ? "🏆" : tied ? "🤝" : "💀"}</div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {meWinning
                        ? `You're ahead by ${meRate - rivalRate}%`
                        : tied ? "It's a tie right now"
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

            {/* Reaction bar */}
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Send a Reaction</div>
              <div className="flex gap-2 flex-wrap">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    title="Send to rival"
                    className={`text-xl rounded-xl px-3 py-2 hover:bg-muted transition-all hover:scale-110 active:scale-95 border ${
                      reactionSent === emoji ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {reactionSent && (
                <p className="text-xs text-primary mt-2 font-medium">{reactionSent} sent to {rivalInfo.displayName}!</p>
              )}
            </div>

            {/* 7-day history */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Calendar size={14} className="text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">7-Day History</span>
              </div>
              <WeekChart history={weekHistory} myName={profile.displayName} rivalName={rivalInfo.displayName} />
            </div>

            {/* Monthly race */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monthly Race</span>
                </div>
                <span className="text-xs text-muted-foreground">{monthLabel}</span>
              </div>

              <div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
                  <div className="h-full bg-primary/40 rounded-full transition-all" style={{ width: `${monthProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">Day {dayOfMonth} of {daysInMonth}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl p-3 border ${meLeadingMonth && !monthTied ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {meLeadingMonth && !monthTied && <Crown size={11} className="text-primary" />}
                    <span className="text-xs font-semibold text-foreground truncate">{profile.displayName}</span>
                  </div>
                  <div className="text-2xl font-black text-primary">{myMonthAvg}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">avg · {myDaysTracked}d tracked</div>
                </div>

                <div className={`rounded-xl p-3 border ${!meLeadingMonth && !monthTied ? "border-orange-500/30 bg-orange-500/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {!meLeadingMonth && !monthTied && <Crown size={11} className="text-orange-500" />}
                    <span className="text-xs font-semibold text-foreground truncate">{rivalInfo.displayName}</span>
                  </div>
                  <div className="text-2xl font-black text-orange-500">{rivalMonthAvg}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">avg · {rivalDaysTracked}d tracked</div>
                </div>
              </div>

              {(myDaysTracked > 0 || rivalDaysTracked > 0) && (
                <p className="text-xs text-center text-muted-foreground">
                  {monthTied
                    ? "Perfectly tied — every goal matters!"
                    : meLeadingMonth
                    ? `You lead by ${myMonthAvg - rivalMonthAvg}% — keep grinding!`
                    : `${rivalInfo.displayName} leads by ${rivalMonthAvg - myMonthAvg}% — time to step up.`}
                </p>
              )}

              {lastMonthResult && (
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-400/30 p-3 flex items-center gap-3">
                  <div className="text-2xl">🏅</div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {lastMonthResult.winner === profile.displayName ? "You won last month! 🎉" : `${lastMonthResult.winner} won last month`}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {lastMonthResult.myAvg}% vs {lastMonthResult.rivalAvg}% average
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Leave rivalry */}
            {confirmLeave ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 space-y-3">
                <p className="text-sm font-medium text-destructive">Remove {rivalInfo.displayName} as your rival?</p>
                <p className="text-xs text-muted-foreground">You'll keep your profile and stats. You can challenge a new rival anytime.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { disconnectRival(); setConfirmLeave(false); }}
                    className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
                  >
                    Yes, leave rivalry
                  </button>
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="flex-1 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLeave(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 rounded-xl transition-colors border border-transparent hover:border-destructive/20"
              >
                <Unlink size={13} />
                Leave rivalry with {rivalInfo.displayName}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
