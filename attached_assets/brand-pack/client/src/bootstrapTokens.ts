import { applyTokens } from "./ui/applyTokens";
import "./ui/tokens.css";

(async function boot() {
  try {
    const res = await fetch("/api/design/tokens");
    const tokens = await res.json();
    applyTokens(tokens);
  } catch {}
})();

try {
  const es = new EventSource("/api/dev/preview/stream");
  es.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data);
      if (data?.type === "tokensUpdated") {
        fetch("/api/design/tokens").then(r => r.json()).then(applyTokens);
      }
    } catch {}
  });
} catch {}
