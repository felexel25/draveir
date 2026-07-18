import { describe, it, expect } from 'vitest';
import { isFresh } from './fresh';

const now = new Date('2026-07-17T12:00:00.000-05:00');

describe('isFresh', () => {
  it('publicado hoy es nuevo', () => {
    expect(isFresh('2026-07-17T07:00:00.000-05:00', now)).toBe(true);
  });

  it('publicado hace 2 días es nuevo', () => {
    expect(isFresh('2026-07-15T12:00:00.000-05:00', now)).toBe(true);
  });

  it('publicado hace más de 3 días ya no es nuevo', () => {
    expect(isFresh('2026-07-13T11:00:00.000-05:00', now)).toBe(false);
  });

  it('el borde exacto de 3 días ya no es nuevo', () => {
    expect(isFresh('2026-07-14T12:00:00.000-05:00', now)).toBe(false);
  });

  it('una fecha futura no es nueva', () => {
    expect(isFresh('2026-07-22T19:00:00.000-05:00', now)).toBe(false);
  });

  it('una fecha ilegible no es nueva', () => {
    expect(isFresh('mañana', now)).toBe(false);
  });

  it('respeta una ventana personalizada', () => {
    expect(isFresh('2026-07-11T12:00:00.000-05:00', now, 7)).toBe(true);
    expect(isFresh('2026-07-11T12:00:00.000-05:00', now, 3)).toBe(false);
  });
});
