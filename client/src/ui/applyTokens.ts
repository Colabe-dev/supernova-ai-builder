/**
 * Runtime token application - updates CSS variables from design.tokens.json
 * Call this on app init and whenever tokens are updated via SSE
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

  // Theme colors
  set("--color-primary", theme.primary || "#fec72e");
  set("--color-on-primary", theme.onPrimary || "#0b0b0b");
  set("--color-bg", theme.bg || "#0b1f3a");
  set("--color-surface", theme.surface || theme.bg || "#0f274d");
  set("--color-text", theme.text || "#ffffff");
  set("--color-muted", theme.muted || "#96a5c0");
  set("--color-success", theme.success || "#19c37d");
  set("--color-warning", theme.warning || "#f9ae2b");
  set("--color-danger", theme.danger || "#ef4444");

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

  // Shadows
  set("--shadow-sm", shadow.sm || "0 1px 2px rgba(0,0,0,.15)");
  set("--shadow-md", shadow.md || "0 6px 16px rgba(0,0,0,.25)");
  set("--shadow-lg", shadow.lg || "0 12px 32px rgba(0,0,0,.35)");

  // Motion
  const duration = motion.duration || {};
  set("--duration-sm", `${duration.sm || 120}ms`);
  set("--duration-md", `${duration.md || 220}ms`);
  set("--duration-lg", `${duration.lg || 400}ms`);
  set("--easing", motion.easing || "cubic-bezier(0.2,0.8,0.2,1)");
}
