import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc, setDoc, getDoc, onSnapshot, serverTimestamp, Timestamp,
  enableNetwork, disableNetwork,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, getDaysInMonth, getDate, getMonth, getYear } from "date-fns";

const PROFILE_KEY = "rivalry_profile";
const RIVAL_KEY = "rivalry_rival_code";

export interface RivalryProfile {
  userId: string;
  displayName: string;
  inviteCode: string;
}

export interface DailyStats {
  completed: number;
  total: number;
  rate: number;
  date: string;
  updatedAt?: Timestamp;
}

export interface MonthlyStats {
  userId: string;
  yearMonth: string;
  daysTracked: number;
  sumRate: number;
  avgRate: number;
  lastUpdated?: Timestamp;
}

export interface RivalInfo {
  userId: string;
  displayName: string;
  inviteCode: string;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateUserId(): string {
  return crypto.randomUUID();
}

function loadProfile(): RivalryProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadRivalCode(): string | null {
  return localStorage.getItem(RIVAL_KEY);
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        await enableNetwork(db);
        await new Promise((r) => setTimeout(r, delayMs * i));
      }
      return await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      const isOffline = msg.toLowerCase().includes("offline") || msg.toLowerCase().includes("network");
      if (!isOffline || i === retries - 1) throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

export function useRivalry(myStats: { completed: number; total: number }) {
  const [profile, setProfile] = useState<RivalryProfile | null>(loadProfile);
  const [rivalCode, setRivalCodeState] = useState<string | null>(loadRivalCode);
  const [rivalInfo, setRivalInfo] = useState<RivalInfo | null>(null);
  const [myDailyStats, setMyDailyStats] = useState<DailyStats | null>(null);
  const [rivalDailyStats, setRivalDailyStats] = useState<DailyStats | null>(null);
  const [myMonthlyStats, setMyMonthlyStats] = useState<MonthlyStats | null>(null);
  const [rivalMonthlyStats, setRivalMonthlyStats] = useState<MonthlyStats | null>(null);
  const [lastMonthResult, setLastMonthResult] = useState<{ winner: string; myAvg: number; rivalAvg: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const yearMonth = format(new Date(), "yyyy-MM");

  useEffect(() => {
    const handleOnline = () => { setOnline(true); enableNetwork(db); };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const createProfile = useCallback(async (displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const userId = generateUserId();
      let inviteCode = generateInviteCode();

      let exists = true;
      while (exists) {
        const snap = await retryWithBackoff(() => getDoc(doc(db, "profiles", inviteCode)));
        if (!snap.exists()) { exists = false; }
        else inviteCode = generateInviteCode();
      }

      const newProfile: RivalryProfile = { userId, displayName, inviteCode };
      await retryWithBackoff(() =>
        setDoc(doc(db, "profiles", inviteCode), {
          userId, displayName, inviteCode, createdAt: serverTimestamp(),
        })
      );

      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create profile";
      const isOffline = msg.toLowerCase().includes("offline") || msg.toLowerCase().includes("network");
      setError(isOffline
        ? "No connection to server. Check your internet and try again."
        : msg
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const connectRival = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const clean = code.trim().toUpperCase();
      if (clean === profile?.inviteCode) {
        setError("That's your own invite code!");
        setLoading(false);
        return;
      }
      const snap = await retryWithBackoff(() => getDoc(doc(db, "profiles", clean)));
      if (!snap.exists()) {
        setError("Invite code not found. Ask your friend to double check.");
        setLoading(false);
        return;
      }
      const data = snap.data() as RivalInfo;
      localStorage.setItem(RIVAL_KEY, clean);
      setRivalCodeState(clean);
      setRivalInfo(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to connect rival";
      const isOffline = msg.toLowerCase().includes("offline") || msg.toLowerCase().includes("network");
      setError(isOffline ? "No connection to server. Check your internet and try again." : msg);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const disconnectRival = useCallback(() => {
    localStorage.removeItem(RIVAL_KEY);
    setRivalCodeState(null);
    setRivalInfo(null);
    setRivalDailyStats(null);
    setRivalMonthlyStats(null);
  }, []);

  const syncMyStats = useCallback(async (stats: { completed: number; total: number }) => {
    if (!profile) return;
    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    try {
      await retryWithBackoff(() =>
        setDoc(doc(db, "stats", `${profile.userId}_${today}`), {
          ...stats, rate, date: today, updatedAt: serverTimestamp(),
        }, { merge: true })
      );
      setMyDailyStats({ ...stats, rate, date: today });

      const existingSnap = await retryWithBackoff(() =>
        getDoc(doc(db, "monthlyStats", `${profile.userId}_${yearMonth}`))
      );
      const existing = existingSnap.exists() ? existingSnap.data() as MonthlyStats : null;

      const alreadyTrackedToday = existing
        ? (existing.daysTracked >= getDate(new Date()))
        : false;

      if (!alreadyTrackedToday) {
        const newDaysTracked = (existing?.daysTracked ?? 0) + 1;
        const newSumRate = (existing?.sumRate ?? 0) + rate;
        const newAvgRate = Math.round(newSumRate / newDaysTracked);
        await retryWithBackoff(() =>
          setDoc(doc(db, "monthlyStats", `${profile.userId}_${yearMonth}`), {
            userId: profile.userId,
            yearMonth,
            daysTracked: newDaysTracked,
            sumRate: newSumRate,
            avgRate: newAvgRate,
            lastUpdated: serverTimestamp(),
          }, { merge: true })
        );
        setMyMonthlyStats({
          userId: profile.userId, yearMonth,
          daysTracked: newDaysTracked, sumRate: newSumRate, avgRate: newAvgRate,
        });
      }
    } catch {
    }
  }, [profile, today, yearMonth]);

  useEffect(() => {
    if (!profile) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncMyStats(myStats);
    }, 1500);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [myStats.completed, myStats.total, profile, syncMyStats]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(
      doc(db, "stats", `${profile.userId}_${today}`),
      (snap) => { if (snap.exists()) setMyDailyStats(snap.data() as DailyStats); },
      () => {}
    );
    return unsub;
  }, [profile, today]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(
      doc(db, "monthlyStats", `${profile.userId}_${yearMonth}`),
      (snap) => { if (snap.exists()) setMyMonthlyStats(snap.data() as MonthlyStats); },
      () => {}
    );
    return unsub;
  }, [profile, yearMonth]);

  useEffect(() => {
    if (!rivalCode) return;
    retryWithBackoff(() => getDoc(doc(db, "profiles", rivalCode))).then((snap) => {
      if (snap.exists()) setRivalInfo(snap.data() as RivalInfo);
    }).catch(() => {});
  }, [rivalCode]);

  useEffect(() => {
    if (!rivalInfo) return;
    const unsub = onSnapshot(
      doc(db, "stats", `${rivalInfo.userId}_${today}`),
      (snap) => {
        if (snap.exists()) setRivalDailyStats(snap.data() as DailyStats);
        else setRivalDailyStats(null);
      },
      () => {}
    );
    return unsub;
  }, [rivalInfo, today]);

  useEffect(() => {
    if (!rivalInfo) return;
    const unsub = onSnapshot(
      doc(db, "monthlyStats", `${rivalInfo.userId}_${yearMonth}`),
      (snap) => { if (snap.exists()) setRivalMonthlyStats(snap.data() as MonthlyStats); },
      () => {}
    );
    return unsub;
  }, [rivalInfo, yearMonth]);

  useEffect(() => {
    if (!myMonthlyStats || !rivalMonthlyStats || !rivalInfo || !profile) return;
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const dayOfMonth = getDate(now);
    const isLastDay = dayOfMonth === daysInMonth;

    if (isLastDay || dayOfMonth >= daysInMonth - 1) {
      const myAvg = myMonthlyStats.avgRate;
      const rivalAvg = rivalMonthlyStats.avgRate;
      if (myAvg !== rivalAvg) {
        const winner = myAvg > rivalAvg ? profile.displayName : rivalInfo.displayName;
        setLastMonthResult({ winner, myAvg, rivalAvg });
      }
    }
  }, [myMonthlyStats, rivalMonthlyStats, rivalInfo, profile]);

  const retryConnection = useCallback(async () => {
    setError(null);
    try {
      await enableNetwork(db);
    } catch {}
  }, []);

  return {
    profile, rivalInfo, myDailyStats, rivalDailyStats,
    myMonthlyStats, rivalMonthlyStats, lastMonthResult,
    loading, error, rivalCode, online,
    createProfile, connectRival, disconnectRival,
    setError, retryConnection,
  };
}
