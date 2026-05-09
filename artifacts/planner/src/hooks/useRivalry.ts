import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc, setDoc, getDoc, onSnapshot, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

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

export function useRivalry(myStats: { completed: number; total: number }) {
  const [profile, setProfile] = useState<RivalryProfile | null>(loadProfile);
  const [rivalCode, setRivalCodeState] = useState<string | null>(loadRivalCode);
  const [rivalInfo, setRivalInfo] = useState<RivalInfo | null>(null);
  const [myDailyStats, setMyDailyStats] = useState<DailyStats | null>(null);
  const [rivalDailyStats, setRivalDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const createProfile = useCallback(async (displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const userId = generateUserId();
      let inviteCode = generateInviteCode();

      let exists = true;
      while (exists) {
        const snap = await getDoc(doc(db, "profiles", inviteCode));
        if (!snap.exists()) { exists = false; }
        else inviteCode = generateInviteCode();
      }

      const newProfile: RivalryProfile = { userId, displayName, inviteCode };
      await setDoc(doc(db, "profiles", inviteCode), {
        userId,
        displayName,
        inviteCode,
        createdAt: serverTimestamp(),
      });

      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create profile");
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
      const snap = await getDoc(doc(db, "profiles", clean));
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
      setError(e instanceof Error ? e.message : "Failed to connect rival");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const disconnectRival = useCallback(() => {
    localStorage.removeItem(RIVAL_KEY);
    setRivalCodeState(null);
    setRivalInfo(null);
    setRivalDailyStats(null);
  }, []);

  const syncMyStats = useCallback(async (stats: { completed: number; total: number }) => {
    if (!profile) return;
    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const statDoc = { ...stats, rate, date: today, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "stats", `${profile.userId}_${today}`), statDoc, { merge: true });
    setMyDailyStats({ ...stats, rate, date: today });
  }, [profile, today]);

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
    const unsub = onSnapshot(doc(db, "stats", `${profile.userId}_${today}`), (snap) => {
      if (snap.exists()) setMyDailyStats(snap.data() as DailyStats);
    });
    return unsub;
  }, [profile, today]);

  useEffect(() => {
    if (!rivalCode) return;
    getDoc(doc(db, "profiles", rivalCode)).then((snap) => {
      if (snap.exists()) setRivalInfo(snap.data() as RivalInfo);
    });
  }, [rivalCode]);

  useEffect(() => {
    if (!rivalInfo) return;
    const unsub = onSnapshot(doc(db, "stats", `${rivalInfo.userId}_${today}`), (snap) => {
      if (snap.exists()) setRivalDailyStats(snap.data() as DailyStats);
      else setRivalDailyStats(null);
    });
    return unsub;
  }, [rivalInfo, today]);

  return {
    profile, rivalInfo, myDailyStats, rivalDailyStats,
    loading, error, rivalCode,
    createProfile, connectRival, disconnectRival,
    setError,
  };
}
