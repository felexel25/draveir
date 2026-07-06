import { describe, it, expect } from 'vitest';
import { pickEmblem, EMBLEMS } from './emblem';

describe('pickEmblem', () => {
  it('devuelve siempre un emblema válido', () => {
    expect(EMBLEMS).toContain(pickEmblem('el-heraldo-gris'));
    expect(EMBLEMS).toContain(pickEmblem('el-jardin-de-los-relojes'));
  });
  it('es determinista', () => {
    expect(pickEmblem('el-heraldo-gris')).toBe(pickEmblem('el-heraldo-gris'));
  });
  it('varía entre slugs distintos', () => {
    const seen = new Set(
      ['alfa', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta'].map(pickEmblem),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
