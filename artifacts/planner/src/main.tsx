import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import "./index.css";

async function processAuthHash() {
  const hash = window.location.hash;
  if (hash && hash.includes("access_token=")) {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? "",
      });
      if (!error) {
        // Clear the hash so it doesn't get processed again on reload
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }
}

async function init() {
  await processAuthHash();

  // On Windows, deep links spawn a new instance with the URL as CLI arg.
  // We'll poll for deep links via Rust command on first load.
  if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const deepLink: string | null = await invoke("get_deep_link");
      if (deepLink && deepLink.includes("access_token=")) {
        const url = new URL(deepLink);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? "",
          });
        }
      }
    } catch {
      // ignore if Tauri API not available
    }

    // On macOS, listen for deep-link events in the running app instance
    try {
      const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
      await onOpenUrl((urls: string[]) => {
        for (const urlStr of urls) {
          if (urlStr.includes("access_token=")) {
            const url = new URL(urlStr);
            const params = new URLSearchParams(url.hash.substring(1));
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            if (accessToken) {
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken ?? "",
              });
            }
          }
        }
      });
    } catch {
      // ignore if deep-link plugin not available
    }
  }

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  );
}

init();
