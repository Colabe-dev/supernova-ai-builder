export function applyTokens(t: any) {
  if (!t || !t.theme) return;
  const r = document.documentElement.style;
  const set = (k: string, v: string | number) => r.setProperty(k, String(v));
  const th = t.theme, sp = t.spacing || { base: 8 }, ra = t.radius || { sm:8, md:12, lg:16, xl:24 }, sh = t.shadow || {};
  set('--color-primary', th.primary); set('--color-on-primary', th.onPrimary ?? '#0b0b0b');
  set('--color-bg', th.bg); set('--color-surface', th.surface ?? th.bg); set('--color-text', th.text);
  set('--color-muted', th.muted ?? '#96a5c0'); set('--color-success', th.success ?? '#19c37d');
  set('--color-warning', th.warning ?? '#f9ae2b'); set('--color-danger', th.danger ?? '#ef4444');
  set('--radius-sm', `${ra.sm}px`); set('--radius-md', `${ra.md}px`); set('--radius-lg', `${ra.lg}px`); set('--radius-xl', `${ra.xl}px`);
  set('--space-1', `${sp.base}px`); set('--space-2', `${sp.base*2}px`); set('--space-3', `${sp.base*3}px`); set('--space-4', `${sp.base*4}px`);
  set('--shadow-sm', sh.sm ?? '0 1px 2px rgba(0,0,0,.15)'); set('--shadow-md', sh.md ?? '0 6px 16px rgba(0,0,0,.25)'); set('--shadow-lg', sh.lg ?? '0 12px 32px rgba(0,0,0,.35)');
}
