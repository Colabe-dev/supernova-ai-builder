/**
 * Bootstrap design tokens on app load and listen for live updates via SSE
 * Collab Creative Studio Brand Pack v1.0.0
 */
import { applyTokens } from "./ui/applyTokens";

// Load initial tokens
(async function boot() {
  try {
    const res = await fetch("/api/design/tokens");
    const tokens = await res.json();
    applyTokens(tokens);
  } catch (err) {
    console.warn("Failed to load initial design tokens:", err);
  }
})();

// Listen for token updates via SSE
try {
  const es = new EventSource("/api/dev/preview/stream");
  
  es.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data);
      if (data?.type === "tokensUpdated") {
        fetch("/api/design/tokens")
          .then((r) => r.json())
          .then((tokens) => {
            applyTokens(tokens);
            console.log("Design tokens reloaded and applied");
          });
      }
    } catch (err) {
      // Silent fail for non-JSON messages (like heartbeat pings)
    }
  });

  es.addEventListener("error", () => {
    // Auto-reconnect handled by EventSource
  });
} catch (err) {
  console.warn("SSE not available:", err);
}
