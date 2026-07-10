import { describe, it, expect } from 'vitest';
import { pickEmblem, emblemHash, EMBLEMS, EMBLEM_BODY, EMBLEM_STROKE } from './emblem';

describe('el set de emblemas', () => {
  it('son los 22 arcanos mayores, sin repetidos', () => {
    expect(EMBLEMS).toHaveLength(22);
    expect(new Set(EMBLEMS).size).toBe(22);
  });

  it('cada emblema tiene cuerpo y grosor de trazo', () => {
    for (const name of EMBLEMS) {
      expect(EMBLEM_BODY[name]).toMatch(/^<g transform=/);
      expect(EMBLEM_STROKE[name]).toBeGreaterThan(0);
    }
  });

  it('el trazo renderizado es el mismo en los 22', () => {
    for (const name of EMBLEMS) {
      const scale = Number(EMBLEM_BODY[name].match(/scale\(([\d.]+)\)/)![1]);
      expect(EMBLEM_STROKE[name] * scale).toBeCloseTo(2.2, 1);
    }
  });
});

describe('pickEmblem', () => {
  it('devuelve siempre un emblema válido', () => {
    expect(EMBLEMS).toContain(pickEmblem('el-heraldo-gris'));
    expect(EMBLEMS).toContain(pickEmblem('el-jardin-de-los-relojes'));
  });

  it('es determinista para un mismo slug y offset', () => {
    expect(pickEmblem('el-heraldo-gris')).toBe(pickEmblem('el-heraldo-gris'));
    expect(pickEmblem('el-heraldo-gris', 7)).toBe(pickEmblem('el-heraldo-gris', 7));
  });

  it('varía entre slugs distintos', () => {
    const seen = new Set(
      ['alfa', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta'].map((s) => pickEmblem(s)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('el offset rota el emblema de un mismo slug', () => {
    const seen = new Set(EMBLEMS.map((_, i) => pickEmblem('el-heraldo-gris', i)));
    expect(seen.size).toBe(22);
  });

  it('slugs con hash distinto no coinciden bajo un mismo offset', () => {
    const slugs = ['alfa', 'beta', 'gamma', 'delta'].filter(
      (s, _, all) => all.findIndex((o) => emblemHash(o) === emblemHash(s)) === all.indexOf(s),
    );
    for (let offset = 0; offset < EMBLEMS.length; offset++) {
      const picks = slugs.map((s) => pickEmblem(s, offset));
      expect(new Set(picks).size).toBe(slugs.length);
    }
  });

  // El hash tiene 22 casillas: dos slugs pueden colisionar y entonces comparten
  // emblema para siempre. Por eso el reparto en el cliente va por posición en la
  // página, no por hash. Esto solo documenta el límite del fallback sin JS.
  it('slugs con el mismo hash comparten emblema en todo offset', () => {
    const a = EMBLEMS.map((_, i) => `s${i}`);
    const collision = a.find((s) => s !== 'alfa' && emblemHash(s) === emblemHash('alfa'));
    if (!collision) return;
    for (let offset = 0; offset < EMBLEMS.length; offset++) {
      expect(pickEmblem(collision, offset)).toBe(pickEmblem('alfa', offset));
    }
  });

  it('el offset da la vuelta completa sin salirse del set', () => {
    expect(pickEmblem('alfa', EMBLEMS.length)).toBe(pickEmblem('alfa', 0));
  });
});
