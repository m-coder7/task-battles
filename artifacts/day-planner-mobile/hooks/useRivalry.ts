import AsyncStorage from "@react-native-async-storage/async-storage";
import { format, getDate, getDaysInMonth, subDays } from "date-fns";
import {
  doc,
  enableNetwork,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { db } from "@/lib/firebase";

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

export interface WeekDay {
  date: string;
  label: string;
  myRate: number;
  rivalRate: number;
}

export interface IncomingReaction {
  fromName: string;
  emoji: string;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        await enableNetwork(db);
        await new Promise((r) => setTimeout(r, delayMs * i));
      }
      return await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      const isOffline =
        msg.toLowerCase().includes("offline") ||
        msg.toLowerCase().includes("network");
      if (!isOffline || i === retries - 1) throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

export function useRivalry(myStats: { completed: number; total: number }) {
  const [profile, setProfile] = useState<RivalryProfile | null>(null);
  const [rivalCode, setRivalCodeState] = useState<string | null>(null);
  const [rivalInfo, setRivalInfo] = useState<RivalInfo | null>(null);
  const [myDailyStats, setMyDailyStats] = useState<DailyStats | null>(null);
  const [rivalDailyStats, setRivalDailyStats] = useState<DailyStats | null>(null);
  const [myMonthlyStats, setMyMonthlyStats] = useState<MonthlyStats | null>(null);
  const [rivalMonthlyStats, setRivalMonthlyStats] = useState<MonthlyStats | null>(null);
  const [lastMonthResult, setLastMonthResult] = useState<{
    winner: string;
    myAvg: number;
    rivalAvg: number;
  } | null>(null);
  const [weekHistory, setWeekHistory] = useState<WeekDay[]>([]);
  const [incomingReaction, setIncomingReaction] = useState<IncomingReaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const yearMonth = format(new Date(), "yyyy-MM");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PROFILE_KEY),
      AsyncStorage.getItem(RIVAL_KEY),
    ]).then(([profileVal, rivalVal]) => {
      if (profileVal) {
        try {
          setProfile(JSON.parse(profileVal));
        } catch {}
      }
      if (rivalVal) setRivalCodeState(rivalVal);
      setInitialized(true);
    });
  }, []);

  const myStreak = useMemo(() => {
    let s = 0;
    for (let i = weekHistory.length - 1; i >= 0; i--) {
      if (weekHistory[i].myRate > 0) s++;
      else break;
    }
    return s;
  }, [weekHistory]);

  const rivalStreak = useMemo(() => {
    let s = 0;
    for (let i = weekHistory.length - 1; i >= 0; i--) {
      if (weekHistory[i].rivalRate > 0) s++;
      else break;
    }
    return s;
  }, [weekHistory]);

  const createProfile = useCallback(async (displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const userId = genId();
      let inviteCode = generateInviteCode();
      let exists = true;
      while (exists) {
        const snap = await retryWithBackoff(() =>
          getDoc(doc(db, "profiles", inviteCode))
        );
        if (!snap.exists()) exists = false;
        else inviteCode = generateInviteCode();
      }
      const newProfile: RivalryProfile = { userId, displayName, inviteCode };
      await retryWithBackoff(() =>
        setDoc(doc(db, "profiles", inviteCode), {
          userId,
          displayName,
          inviteCode,
          createdAt: serverTimestamp(),
        })
      );
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create profile";
      const isOffline =
        msg.toLowerCase().includes("offline") ||
        msg.toLowerCase().includes("network");
      setError(
        isOffline
          ? "No connection to server. Check your internet and try again."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const changeDisplayName = useCallback(
    async (newName: string) => {
      if (!profile) return;
      try {
        await retryWithBackoff(() =>
          setDoc(
            doc(db, "profiles", profile.inviteCode),
            { displayName: newName },
            { merge: true }
          )
        );
      } catch {}
      const updated = { ...profile, displayName: newName };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      setProfile(updated);
    },
    [profile]
  );

  const connectRival = useCallback(
    async (code: string) => {
      setLoading(true);
      setError(null);
      try {
        const clean = code.trim().toUpperCase();
        if (clean === profile?.inviteCode) {
          setError("That's your own invite code!");
          setLoading(false);
          return;
        }
        const snap = await retryWithBackoff(() =>
          getDoc(doc(db, "profiles", clean))
        );
        if (!snap.exists()) {
          setError("Invite code not found. Ask your friend to double check.");
          setLoading(false);
          return;
        }
        const data = snap.data() as RivalInfo;
        await AsyncStorage.setItem(RIVAL_KEY, clean);
        setRivalCodeState(clean);
        setRivalInfo(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to connect rival";
        const isOffline =
          msg.toLowerCase().includes("offline") ||
          msg.toLowerCase().includes("network");
        setError(
          isOffline ? "No connection. Check your internet and try again." : msg
        );
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  const disconnectRival = useCallback(async () => {
    await AsyncStorage.removeItem(RIVAL_KEY);
    setRivalCodeState(null);
    setRivalInfo(null);
    setRivalDailyStats(null);
    setRivalMonthlyStats(null);
    setWeekHistory([]);
  }, []);

  const deleteProfile = useCallback(async () => {
    await AsyncStorage.multiRemove([PROFILE_KEY, RIVAL_KEY]);
    setProfile(null);
    setRivalCodeState(null);
    setRivalInfo(null);
    setRivalDailyStats(null);
    setRivalMonthlyStats(null);
    setMyDailyStats(null);
    setMyMonthlyStats(null);
    setWeekHistory([]);
    setIncomingReaction(null);
    setLastMonthResult(null);
  }, []);

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!profile || !rivalCode) return;
      try {
        await setDoc(doc(db, "reactions", rivalCode), {
          fromName: profile.displayName,
          emoji,
          sentAt: serverTimestamp(),
          seen: false,
        });
      } catch {}
    },
    [profile, rivalCode]
  );

  const clearIncomingReaction = useCallback(async () => {
    if (!profile) return;
    setIncomingReaction(null);
    try {
      await setDoc(
        doc(db, "reactions", profile.inviteCode),
        { seen: true },
        { merge: true }
      );
    } catch {}
  }, [profile]);

  const syncMyStats = useCallback(
    async (stats: { completed: number; total: number }) => {
      if (!profile) return;
      const rate =
        stats.total > 0
          ? Math.round((stats.completed / stats.total) * 100)
          : 0;
      try {
        await retryWithBackoff(() =>
          setDoc(
            doc(db, "stats", `${profile.userId}_${today}`),
            { ...stats, rate, date: today, updatedAt: serverTimestamp() },
            { merge: true }
          )
        );
        setMyDailyStats({ ...stats, rate, date: today });

        const existingSnap = await retryWithBackoff(() =>
          getDoc(doc(db, "monthlyStats", `${profile.userId}_${yearMonth}`))
        );
        const existing = existingSnap.exists()
          ? (existingSnap.data() as MonthlyStats)
          : null;
        const alreadyTrackedToday = existing
          ? existing.daysTracked >= getDate(new Date())
          : false;

        if (!alreadyTrackedToday) {
          const newDaysTracked = (existing?.daysTracked ?? 0) + 1;
          const newSumRate = (existing?.sumRate ?? 0) + rate;
          const newAvgRate = Math.round(newSumRate / newDaysTracked);
          await retryWithBackoff(() =>
            setDoc(
              doc(db, "monthlyStats", `${profile.userId}_${yearMonth}`),
              {
                userId: profile.userId,
                yearMonth,
                daysTracked: newDaysTracked,
                sumRate: newSumRate,
                avgRate: newAvgRate,
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            )
          );
          setMyMonthlyStats({
            userId: profile.userId,
            yearMonth,
            daysTracked: newDaysTracked,
            sumRate: newSumRate,
            avgRate: newAvgRate,
          });
        }
      } catch {}
    },
    [profile, today, yearMonth]
  );

  useEffect(() => {
    if (!profile || !initialized) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncMyStats(myStats);
    }, 1500);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [myStats.completed, myStats.total, profile, initialized, syncMyStats]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(
      doc(db, "stats", `${profile.userId}_${today}`),
      (snap) => {
        if (snap.exists()) setMyDailyStats(snap.data() as DailyStats);
      },
      () => {}
    );
    return unsub;
  }, [profile, today]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(
      doc(db, "monthlyStats", `${profile.userId}_${yearMonth}`),
      (snap) => {
        if (snap.exists()) setMyMonthlyStats(snap.data() as MonthlyStats);
      },
      () => {}
    );
    return unsub;
  }, [profile, yearMonth]);

  useEffect(() => {
    if (!rivalCode) return;
    retryWithBackoff(() => getDoc(doc(db, "profiles", rivalCode)))
      .then((snap) => {
        if (snap.exists()) setRivalInfo(snap.data() as RivalInfo);
      })
      .catch(() => {});
  }, [rivalCode]);

  useEffect(() => {
    if (!rivalInfo) return;
    const unsub = onSnapshot(
      doc(db, "stats", `${rivalInfo.userId}_${today}`),
      (snap) => {
        setRivalDailyStats(snap.exists() ? (snap.data() as DailyStats) : null);
      },
      () => {}
    );
    return unsub;
  }, [rivalInfo, today]);

  useEffect(() => {
    if (!rivalInfo) return;
    const unsub = onSnapshot(
      doc(db, "monthlyStats", `${rivalInfo.userId}_${yearMonth}`),
      (snap) => {
        if (snap.exists()) setRivalMonthlyStats(snap.data() as MonthlyStats);
      },
      () => {}
    );
    return unsub;
  }, [rivalInfo, yearMonth]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(
      doc(db, "reactions", profile.inviteCode),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (!data.seen)
            setIncomingReaction({ fromName: data.fromName, emoji: data.emoji });
          else setIncomingReaction(null);
        }
      },
      () => {}
    );
    return unsub;
  }, [profile?.inviteCode]);

  useEffect(() => {
    if (!profile || !rivalInfo) return;
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
    });

    Promise.all(
      dates.map(async ({ date, label }) => {
        const [mySnap, rivalSnap] = await Promise.all([
          getDoc(doc(db, "stats", `${profile.userId}_${date}`)).catch(
            () => null
          ),
          getDoc(
            doc(db, "stats", `${rivalInfo.userId}_${date}`)
          ).catch(() => null),
        ]);
        return {
          date,
          label,
          myRate: mySnap?.exists()
            ? (mySnap.data() as DailyStats).rate
            : -1,
          rivalRate: rivalSnap?.exists()
            ? (rivalSnap.data() as DailyStats).rate
            : -1,
        };
      })
    )
      .then(setWeekHistory)
      .catch(() => {});
  }, [profile?.userId, rivalInfo?.userId]);

  useEffect(() => {
    if (weekHistory.length === 0) return;
    setWeekHistory((prev) =>
      prev.map((d) => {
        if (d.date !== today) return d;
        const myRate = myDailyStats
          ? myDailyStats.rate
          : myStats.total > 0
          ? Math.round((myStats.completed / myStats.total) * 100)
          : -1;
        return {
          ...d,
          myRate,
          rivalRate: rivalDailyStats ? rivalDailyStats.rate : d.rivalRate,
        };
      })
    );
  }, [myDailyStats, rivalDailyStats, today, myStats]);

  useEffect(() => {
    if (
      !myMonthlyStats ||
      !rivalMonthlyStats ||
      !rivalInfo ||
      !profile
    )
      return;
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const dayOfMonth = getDate(now);
    if (dayOfMonth >= daysInMonth - 1) {
      const myAvg = myMonthlyStats.avgRate;
      const rivalAvg = rivalMonthlyStats.avgRate;
      if (myAvg !== rivalAvg) {
        const winner =
          myAvg > rivalAvg ? profile.displayName : rivalInfo.displayName;
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
    profile,
    rivalInfo,
    myDailyStats,
    rivalDailyStats,
    myMonthlyStats,
    rivalMonthlyStats,
    lastMonthResult,
    weekHistory,
    incomingReaction,
    myStreak,
    rivalStreak,
    loading,
    error,
    rivalCode,
    initialized,
    createProfile,
    changeDisplayName,
    connectRival,
    disconnectRival,
    deleteProfile,
    sendReaction,
    clearIncomingReaction,
    setError,
    retryConnection,
  };
}
