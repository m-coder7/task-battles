import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, LogIn, UserPlus, Inbox, ArrowLeft } from "lucide-react";

export default function AuthScreen() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fn = mode === "signin" ? signIn : signUp;
    const result = await fn(email, password);
    if (result.error) {
      setError(result.error.message);
    } else if (mode === "signup" && "autoSignedIn" in result && result.autoSignedIn) {
      setError("Account already exists — you’ve been signed in automatically.");
    } else if (mode === "signup" && "needsConfirmation" in result && result.needsConfirmation) {
      setConfirmationSent(true);
    }
    setLoading(false);
  }

  if (confirmationSent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="w-full max-w-sm p-8 rounded-2xl border border-border bg-card shadow-sm text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Inbox size={24} className="text-primary" />
            </div>
          </div>
          <h2 className="text-lg font-medium mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <button
            onClick={() => { setConfirmationSent(false); setMode("signin"); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <img src="/icon.png" alt="Task Battles" className="w-6 h-6 rounded" />
          <h1 className="text-xl font-semibold">Task Battles</h1>
        </div>

        <h2 className="text-lg font-medium text-center mb-1">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "signin"
            ? "Welcome back! Sign in to continue."
            : "Get started with your free account."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mode === "signin" ? <LogIn size={15} /> : <UserPlus size={15} />}
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-xs text-primary hover:underline font-medium"
          >
            {mode === "signin"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
