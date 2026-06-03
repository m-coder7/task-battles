import { createRoot } from "react-dom/client";
import App from "./App";
import WidgetView from "@/components/WidgetView";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

const isWidget = new URLSearchParams(window.location.search).has("widget");

if (isWidget) {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <WidgetView />
    </ErrorBoundary>
  );
} else {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  );
}
