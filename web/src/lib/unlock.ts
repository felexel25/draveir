export function isUnlocked(unlocksAt: string, now: number): boolean {
  const t = Date.parse(unlocksAt);
  return Number.isNaN(t) ? true : now >= t;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d}d ${p(h)}h ${p(m)}m ${p(sec)}s`;
}
