import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App";
import WidgetView from "@/components/WidgetView";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

function Root() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    // Check URL first (for dev/browser)
    const params = new URLSearchParams(window.location.search);
    const widgetParam = params.get("widget");
    if (widgetParam) {
      setWindowLabel(`widget-${widgetParam}`);
      return;
    }

    // Check Tauri window label
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      import("@tauri-apps/api/webviewWindow").then(({ getCurrentWebviewWindow }) => {
        const label = getCurrentWebviewWindow().label;
        setWindowLabel(label);
      }).catch(() => setWindowLabel("main"));
    } else {
      setWindowLabel("main");
    }
  }, []);

  if (windowLabel === null) {
    return <div style={{ background: "#0a0a0a", width: "100vw", height: "100vh" }} />;
  }

  const isWidget = windowLabel.startsWith("widget-");

  if (isWidget) {
    return (
      <ErrorBoundary>
        <WidgetView />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
