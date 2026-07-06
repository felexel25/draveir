import { describe, it, expect } from 'vitest';
import { isUnlocked, formatCountdown } from './unlock';

describe('isUnlocked', () => {
  const at = '2026-08-01T09:00:00.000-05:00';
  const t = Date.parse(at);
  it('bloqueado antes, abierto en/después de la fecha', () => {
    expect(isUnlocked(at, t - 1000)).toBe(false);
    expect(isUnlocked(at, t)).toBe(true);
    expect(isUnlocked(at, t + 1000)).toBe(true);
  });
  it('fecha inválida se trata como desbloqueado', () => {
    expect(isUnlocked('no-fecha', 0)).toBe(true);
  });
});

describe('formatCountdown', () => {
  it('formatea días/horas/min/seg', () => {
    const ms = ((3 * 24 + 4) * 3600 + 12 * 60 + 9) * 1000;
    expect(formatCountdown(ms)).toBe('3d 04h 12m 09s');
  });
  it('negativo o cero → todo en cero', () => {
    expect(formatCountdown(-5000)).toBe('0d 00h 00m 00s');
  });
});
