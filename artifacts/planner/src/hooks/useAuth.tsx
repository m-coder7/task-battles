import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation?: boolean; autoSignedIn?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "taskbattles://auth/callback" },
    });

    if (error) {
      return { error };
    }

    // If no session, either new user awaiting confirmation or existing user
    if (!data.session && data.user) {
      // Try to sign in to see if account already exists
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        // Account already existed and password matched — signed in automatically
        return { error: null, needsConfirmation: false, autoSignedIn: true };
      }
      if (signInError.message.includes("Email not confirmed")) {
        return { error: new Error("This email is already registered but not confirmed. Please check your inbox for the verification link."), needsConfirmation: true };
      }
      if (signInError.message.includes("Invalid login")) {
        return { error: new Error("An account with this email already exists. Please sign in with your existing password."), needsConfirmation: false };
      }
      return { error: null, needsConfirmation: true };
    }

    return { error: null, needsConfirmation: false };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getStorageKey(base: string, userId: string | null | undefined) {
  return `${base}_${userId ?? "anon"}`;
}
