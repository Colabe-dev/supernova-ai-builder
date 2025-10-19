import React from "react";
export const Container: React.FC<React.PropsWithChildren<{ max?: number }>> = ({ max = 1200, children }) => (
  <div style={{ margin: "0 auto", maxWidth: max, padding: "0 var(--space-2)" }}>{children}</div>
);
export const Stack: React.FC<React.PropsWithChildren<{ gap?: number }>> = ({ gap = 2, children }) => (
  <div style={{ display: "grid", gap: `var(--space-${gap})` }}>{children}</div>
);
export const Grid: React.FC<React.PropsWithChildren<{ cols?: number; gap?: number }>> = ({ cols = 12, gap = 2, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: `var(--space-${gap})` }}>{children}</div>
);
export const Card: React.FC<React.PropsWithChildren<{ pad?: number }>> = ({ pad = 2, children }) => (
  <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: `var(--space-${pad})`, boxShadow: "var(--shadow-md)" }}>{children}</div>
);
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...rest }) => (
  <button {...rest} style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", border: "none", borderRadius: "var(--radius-lg)", padding: "10px 16px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-sm)", ...style }}>
    {children}
  </button>
);
