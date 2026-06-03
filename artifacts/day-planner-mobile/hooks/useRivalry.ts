import AsyncStorage from "@react-native-async-storage/async-storage";
import { format, getDate, getDaysInMonth, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { supabase } from "@/lib/supabase";

const PROFILE_KEY = "rivalry_profile";
const RIVAL_KEY   = "rivalry_rival_code";

// ─── Offline write queue ───────────────────────────────────────────────────
const QUEUE_KEY = "sb_offline_queue";

interface QueuedWrite { id: string; table: string; data: Record<string, unknown> }

async function loadQueue(): Promise<QueuedWrite[]> {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? "[]"); }
  catch { return []; }
}
async function enqueueWrite(item: QueuedWrite) {
  const q = (await loadQueue()).filter((i) => i.id !== item.id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...q, item]));
}
async function flushQueue() {
  const q = await loadQueue();
  if (!q.length) return;
  const succeeded: string[] = [];
  for (const item of q) {
    const { error } = await (supabase.from(item.table as never) as ReturnType<typeof supabase.from>).upsert(item.data as never);
    if (!error) succeeded.push(item.id);
  }
  const remaining = (await loadQueue()).filter((i) => !succeeded.includes(i.id));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

// ─── Types ─────────────────────────────────────────────────────────────────
export interface RivalryProfile  { userId: string; displayName: string; inviteCode: string }
export interface DailyStats      { completed: number; total: number; rate: number; date: string }
export interface MonthlyStats    { userId: string; yearMonth: string; daysTracked: number; sumRate: number; avgRate: number }
export interface RivalInfo       { userId: string; displayName: string; inviteCode: string }
export interface WeekDay         { date: string; label: string; myRate: number; rivalRate: number }
export interface IncomingReaction { fromName: string; emoji: string }

function generateInviteCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function generateUserId()     { return `${Date.now()}-${Math.random().toString(36).substring(2)}`; }

async function loadProfile(): Promise<RivalryProfile | null> {
  try { return JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) ?? "null"); }
  catch { return null; }
}
async function loadRivalCode(): Promise<string | null> {
  return AsyncStorage.getItem(RIVAL_KEY);
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useRivalry(myStats: { completed: number; total: number }) {
  const [initialized, setInitialized]             = useState(false);
  const [profile, setProfile]                     = useState<RivalryProfile | null>(null);
  const [rivalCode, setRivalCodeState]             = useState<string | null>(null);
  const [rivalInfo, setRivalInfo]                 = useState<RivalInfo | null>(null);
  const [myDailyStats, setMyDailyStats]           = useState<DailyStats | null>(null);
  const [rivalDailyStats, setRivalDailyStats]     = useState<DailyStats | null>(null);
  const [myMonthlyStats, setMyMonthlyStats]       = useState<MonthlyStats | null>(null);
  const [rivalMonthlyStats, setRivalMonthlyStats] = useState<MonthlyStats | null>(null);
  const [lastMonthResult, setLastMonthResult]     = useState<{ winner: string; myAvg: number; rivalAvg: number } | null>(null);
  const [weekHistory, setWeekHistory]             = useState<WeekDay[]>([]);
  const [incomingReaction, setIncomingReaction]   = useState<IncomingReaction | null>(null);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState<string | null>(null);

  const syncTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today      = format(new Date(), "yyyy-MM-dd");
  const yearMonth  = format(new Date(), "yyyy-MM");

  // ─── Load persisted state on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [p, rc] = await Promise.all([loadProfile(), loadRivalCode()]);
      setProfile(p);
      setRivalCodeState(rc);
      setInitialized(true);
      flushQueue();
    })();
  }, []);

  // Flush queue when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") flushQueue();
    });
    return () => sub.remove();
  }, []);

  // ─── Streaks ────────────────────────────────────────────────────────────
  const myStreak = useMemo(() => {
    let s = 0;
    for (let i = weekHistory.length - 1; i >= 0; i--) { if (weekHistory[i].myRate > 0) s++; else break; }
    return s;
  }, [weekHistory]);
  const rivalStreak = useMemo(() => {
    let s = 0;
    for (let i = weekHistory.length - 1; i >= 0; i--) { if (weekHistory[i].rivalRate > 0) s++; else break; }
    return s;
  }, [weekHistory]);

  // ─── createProfile ──────────────────────────────────────────────────────
  const createProfile = useCallback(async (displayName: string) => {
    setLoading(true); setError(null);
    try {
      const userId = generateUserId();
      let inviteCode = generateInviteCode();
      for (;;) {
        const { data } = await supabase.from("profiles").select("invite_code").eq("invite_code", inviteCode).maybeSingle();
        if (!data) break;
        inviteCode = generateInviteCode();
      }
      const { error: err } = await supabase.from("profiles").insert({ invite_code: inviteCode, user_id: userId, display_name: displayName });
      if (err) throw err;
      const p: RivalryProfile = { userId, displayName, inviteCode };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      setProfile(p);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create profile";
      setError(msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch") ? "No connection. Try again." : msg);
    } finally { setLoading(false); }
  }, []);

  // ─── changeDisplayName ──────────────────────────────────────────────────
  const changeDisplayName = useCallback(async (newName: string) => {
    if (!profile) return;
    const updated = { ...profile, displayName: newName };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    setProfile(updated);
    const { error } = await supabase.from("profiles").update({ display_name: newName }).eq("invite_code", profile.inviteCode);
    if (error) enqueueWrite({ id: `profile_${profile.inviteCode}`, table: "profiles", data: { invite_code: profile.inviteCode, user_id: profile.userId, display_name: newName } });
  }, [profile]);

  // ─── connectRival ────────────────────────────────────────────────────────
  const connectRival = useCallback(async (code: string) => {
    setLoading(true); setError(null);
    try {
      const clean = code.trim().toUpperCase();
      if (clean === profile?.inviteCode) { setError("That's your own invite code!"); return; }
      const { data, error: err } = await supabase.from("profiles").select("*").eq("invite_code", clean).maybeSingle();
      if (err) throw err;
      if (!data) { setError("Invite code not found. Ask your friend to double check."); return; }
      const d = data as Record<string, string>;
      const info: RivalInfo = { userId: d.user_id, displayName: d.display_name, inviteCode: d.invite_code };
      await AsyncStorage.setItem(RIVAL_KEY, clean);
      setRivalCodeState(clean); setRivalInfo(info);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to connect rival";
      setError(msg.toLowerCase().includes("fetch") ? "No connection. Try again." : msg);
    } finally { setLoading(false); }
  }, [profile]);

  const disconnectRival = useCallback(async () => {
    await AsyncStorage.removeItem(RIVAL_KEY);
    setRivalCodeState(null); setRivalInfo(null); setRivalDailyStats(null); setRivalMonthlyStats(null); setWeekHistory([]);
  }, []);

  const deleteProfile = useCallback(async () => {
    await AsyncStorage.multiRemove([PROFILE_KEY, RIVAL_KEY]);
    setProfile(null); setRivalCodeState(null); setRivalInfo(null);
    setRivalDailyStats(null); setRivalMonthlyStats(null); setMyDailyStats(null); setMyMonthlyStats(null);
    setWeekHistory([]); setIncomingReaction(null); setLastMonthResult(null);
  }, []);

  // ─── sendReaction ────────────────────────────────────────────────────────
  const sendReaction = useCallback(async (emoji: string) => {
    if (!profile || !rivalCode) return;
    const row = { invite_code: rivalCode, from_name: profile.displayName, emoji, seen: false };
    const { error } = await supabase.from("reactions").upsert(row);
    if (error) enqueueWrite({ id: `reaction_${rivalCode}`, table: "reactions", data: row });
  }, [profile, rivalCode]);

  const clearIncomingReaction = useCallback(async () => {
    if (!profile) return;
    setIncomingReaction(null);
    await supabase.from("reactions").update({ seen: true }).eq("invite_code", profile.inviteCode);
  }, [profile]);

  // ─── syncMyStats ─────────────────────────────────────────────────────────
  const syncMyStats = useCallback(async (stats: { completed: number; total: number }) => {
    if (!profile) return;
    const rate    = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const statsId = `${profile.userId}_${today}`;
    const dailyRow = { id: statsId, user_id: profile.userId, completed: stats.completed, total: stats.total, rate, date: today };
    const { error: e1 } = await supabase.from("daily_stats").upsert(dailyRow);
    if (e1) enqueueWrite({ id: `daily_${statsId}`, table: "daily_stats", data: dailyRow });
    else setMyDailyStats({ completed: stats.completed, total: stats.total, rate, date: today });

    const monthId = `${profile.userId}_${yearMonth}`;
    const { data: ex } = await supabase.from("monthly_stats").select("*").eq("id", monthId).maybeSingle();
    const existing = ex as Record<string, number> | null;
    const alreadyToday = existing ? existing.days_tracked >= getDate(new Date()) : false;
    if (!alreadyToday) {
      const newDays = (existing?.days_tracked ?? 0) + 1;
      const newSum  = (existing?.sum_rate ?? 0) + rate;
      const newAvg  = Math.round(newSum / newDays);
      const monthRow = { id: monthId, user_id: profile.userId, year_month: yearMonth, days_tracked: newDays, sum_rate: newSum, avg_rate: newAvg };
      const { error: e2 } = await supabase.from("monthly_stats").upsert(monthRow);
      if (e2) enqueueWrite({ id: `monthly_${monthId}`, table: "monthly_stats", data: monthRow });
      else setMyMonthlyStats({ userId: profile.userId, yearMonth, daysTracked: newDays, sumRate: newSum, avgRate: newAvg });
    }
  }, [profile, today, yearMonth]);

  useEffect(() => {
    if (!profile) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncMyStats(myStats), 1500);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [myStats.completed, myStats.total, profile, syncMyStats]);

  // Load rival info when rivalCode changes
  useEffect(() => {
    if (!rivalCode) return;
    supabase.from("profiles").select("*").eq("invite_code", rivalCode).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Record<string, string>;
          setRivalInfo({ userId: d.user_id, displayName: d.display_name, inviteCode: d.invite_code });
        }
      }, () => {});
  }, [rivalCode]);

  // Realtime: rival daily stats
  useEffect(() => {
    if (!rivalInfo) return;
    const id = `${rivalInfo.userId}_${today}`;
    const ch = supabase.channel(`daily_rival_${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_stats", filter: `id=eq.${id}` },
        (p) => { const r = p.new as Record<string, number>; setRivalDailyStats({ completed: r.completed, total: r.total, rate: r.rate, date: today }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rivalInfo?.userId, today]);

  // Realtime: incoming reactions
  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel(`reactions_${profile.inviteCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions", filter: `invite_code=eq.${profile.inviteCode}` },
        (p) => {
          const r = p.new as Record<string, unknown>;
          if (!r.seen) setIncomingReaction({ fromName: r.from_name as string, emoji: r.emoji as string });
          else setIncomingReaction(null);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.inviteCode]);

  // 7-day history
  useEffect(() => {
    if (!profile || !rivalInfo) return;
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
    });
    const ids = dates.flatMap(({ date }) => [`${profile.userId}_${date}`, `${rivalInfo.userId}_${date}`]);
    supabase.from("daily_stats").select("id,rate").in("id", ids)
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map((r: Record<string, unknown>) => [r.id as string, r.rate as number]));
        setWeekHistory(dates.map(({ date, label }) => ({
          date, label,
          myRate:    map[`${profile.userId}_${date}`]    ?? -1,
          rivalRate: map[`${rivalInfo.userId}_${date}`] ?? -1,
        })));
      }, () => {});
  }, [profile?.userId, rivalInfo?.userId]);

  useEffect(() => {
    if (!weekHistory.length) return;
    setWeekHistory((prev) => prev.map((d) => {
      if (d.date !== today) return d;
      const myRate = myDailyStats?.rate ?? (myStats.total > 0 ? Math.round((myStats.completed / myStats.total) * 100) : -1);
      return { ...d, myRate, rivalRate: rivalDailyStats?.rate ?? d.rivalRate };
    }));
  }, [myDailyStats, rivalDailyStats, today, myStats]);

  useEffect(() => {
    if (!myMonthlyStats || !rivalMonthlyStats || !rivalInfo || !profile) return;
    const now = new Date();
    if (getDate(now) >= getDaysInMonth(now) - 1 && myMonthlyStats.avgRate !== rivalMonthlyStats.avgRate) {
      const winner = myMonthlyStats.avgRate > rivalMonthlyStats.avgRate ? profile.displayName : rivalInfo.displayName;
      setLastMonthResult({ winner, myAvg: myMonthlyStats.avgRate, rivalAvg: rivalMonthlyStats.avgRate });
    }
  }, [myMonthlyStats, rivalMonthlyStats, rivalInfo, profile]);

  const retryConnection = useCallback(() => { setError(null); flushQueue(); }, []);

  return {
    initialized, profile, rivalInfo, myDailyStats, rivalDailyStats,
    myMonthlyStats, rivalMonthlyStats, lastMonthResult,
    weekHistory, incomingReaction, myStreak, rivalStreak,
    loading, error, rivalCode,
    createProfile, changeDisplayName, connectRival,
    disconnectRival, deleteProfile,
    sendReaction, clearIncomingReaction,
    setError, retryConnection,
  };
}
