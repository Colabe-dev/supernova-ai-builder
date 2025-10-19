/**
 * Runtime token application - updates CSS variables from design.tokens.json
 * Call this on app init and whenever tokens are updated via SSE
 * Collab Creative Studio - Neon Edition
 */
export function applyTokens(tokens: any) {
  const root = document.documentElement.style;
  const set = (key: string, value: string | number) =>
    root.setProperty(key, String(value));

  const theme = tokens.theme || {};
  const spacing = tokens.spacing || { base: 8 };
  const radius = tokens.radius || {};
  const shadow = tokens.shadow || {};
  const typography = tokens.typography || {};
  const motion = tokens.motion || {};

  // Neon theme colors
  set("--color-primary", theme.primary || "#00ffff");
  set("--color-secondary", theme.secondary || "#ff00ff");
  set("--color-accent", theme.accent || "#ffff00");
  set("--color-on-primary", theme.onPrimary || "#000000");
  set("--color-bg", theme.bg || "#0a0a0f");
  set("--color-surface", theme.surface || "#121218");
  set("--color-text", theme.text || "#ffffff");
  set("--color-muted", theme.muted || "#8b5cf6");
  set("--color-success", theme.success || "#00ff88");
  set("--color-warning", theme.warning || "#ffaa00");
  set("--color-danger", theme.danger || "#ff0066");
  
  // Extra neon colors
  set("--color-neon-cyan", theme.neonCyan || "#00ffff");
  set("--color-neon-pink", theme.neonPink || "#ff00ff");
  set("--color-neon-yellow", theme.neonYellow || "#ffff00");
  set("--color-neon-green", theme.neonGreen || "#00ff88");
  set("--color-neon-orange", theme.neonOrange || "#ff6600");

  // Typography
  set("--font-family", typography.fontFamily || "Inter, ui-sans-serif, system-ui");
  set("--line-height", typography.lineHeight || 1.5);

  // Border radius
  set("--radius-sm", `${radius.sm || 8}px`);
  set("--radius-md", `${radius.md || 12}px`);
  set("--radius-lg", `${radius.lg || 16}px`);
  set("--radius-xl", `${radius.xl || 24}px`);
  set("--radius-full", `${radius.full || 9999}px`);

  // Spacing (multipliers of base)
  const base = spacing.base || 8;
  set("--space-1", `${base}px`);
  set("--space-2", `${base * 2}px`);
  set("--space-3", `${base * 3}px`);
  set("--space-4", `${base * 4}px`);
  set("--space-5", `${base * 5}px`);
  set("--space-6", `${base * 6}px`);

  // Shadows (including neon glows)
  set("--shadow-sm", shadow.sm || "0 1px 2px rgba(0,0,0,.15)");
  set("--shadow-md", shadow.md || "0 6px 16px rgba(0,0,0,.25)");
  set("--shadow-lg", shadow.lg || "0 12px 32px rgba(0,0,0,.35)");
  set("--shadow-neon-cyan", shadow.neonCyan || "0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff");
  set("--shadow-neon-pink", shadow.neonPink || "0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff");
  set("--shadow-neon-yellow", shadow.neonYellow || "0 0 10px #ffff00, 0 0 20px #ffff00, 0 0 30px #ffff00");
  set("--shadow-neon-green", shadow.neonGreen || "0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88");

  // Motion
  const duration = motion.duration || {};
  set("--duration-sm", `${duration.sm || 120}ms`);
  set("--duration-md", `${duration.md || 220}ms`);
  set("--duration-lg", `${duration.lg || 400}ms`);
  set("--easing", motion.easing || "cubic-bezier(0.2,0.8,0.2,1)");
}
