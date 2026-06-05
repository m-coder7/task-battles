import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, LogIn } from "lucide-react";

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) setError(result.error.message);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-[#0a0a0a] text-white">
      <div className="w-full max-w-xs p-6">
        <h1 className="text-lg font-semibold text-center mb-1">Task Battles</h1>
        <p className="text-xs text-neutral-500 text-center mb-5">Widgets</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111] border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF9500]/50"
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111] border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF9500]/50"
            />
          </div>
          {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#FF9500] text-[#0a0a0a] text-sm font-bold hover:bg-[#FF9500]/90 transition-colors disabled:opacity-50"
          >
            <LogIn size={15} />
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
