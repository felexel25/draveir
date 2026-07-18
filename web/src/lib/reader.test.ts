import { describe, it, expect } from 'vitest';
import {
  emptyState,
  parseState,
  isFavorite,
  toggleFavorite,
  recordRead,
  setPosition,
  getPosition,
} from './reader';

describe('parseState', () => {
  it('vacío para null o JSON inválido o versión distinta', () => {
    expect(parseState(null)).toEqual(emptyState());
    expect(parseState('no-json')).toEqual(emptyState());
    expect(parseState(JSON.stringify({ version: 9 }))).toEqual(emptyState());
  });
  it('conserva un estado válido', () => {
    const s = {
      version: 1,
      favorites: ['a'],
      continueReading: { a: 'capitulo-1' },
      positions: { 'a/capitulo-1': 0.5 },
      history: [],
    };
    expect(parseState(JSON.stringify(s))).toEqual(s);
  });
  it('rellena positions si falta (estado viejo)', () => {
    const viejo = JSON.stringify({ version: 1, favorites: [], continueReading: {}, history: [] });
    expect(parseState(viejo).positions).toEqual({});
  });
});

describe('positions', () => {
  it('guarda, acota a 0..1 y lee la posición', () => {
    let s = emptyState();
    s = setPosition(s, 'a/capitulo-1', 0.42);
    expect(getPosition(s, 'a/capitulo-1')).toBe(0.42);
    s = setPosition(s, 'a/capitulo-1', 1.8);
    expect(getPosition(s, 'a/capitulo-1')).toBe(1);
  });
  it('devuelve 0 si no hay posición guardada', () => {
    expect(getPosition(emptyState(), 'x/y')).toBe(0);
  });
});

describe('favorites', () => {
  it('alterna y consulta', () => {
    let s = emptyState();
    expect(isFavorite(s, 'a')).toBe(false);
    s = toggleFavorite(s, 'a');
    expect(isFavorite(s, 'a')).toBe(true);
    s = toggleFavorite(s, 'a');
    expect(isFavorite(s, 'a')).toBe(false);
  });
});

describe('recordRead', () => {
  it('actualiza continueReading y encabeza el historial sin duplicar', () => {
    let s = emptyState();
    s = recordRead(s, { novelSlug: 'a', chapterSlug: 'capitulo-1', title: 'A · 1', at: 1 });
    s = recordRead(s, { novelSlug: 'a', chapterSlug: 'capitulo-2', title: 'A · 2', at: 2 });
    s = recordRead(s, { novelSlug: 'a', chapterSlug: 'capitulo-1', title: 'A · 1', at: 3 });
    expect(s.continueReading.a).toBe('capitulo-1');
    expect(s.history.map((h) => h.chapterSlug)).toEqual(['capitulo-1', 'capitulo-2']);
    expect(s.history[0].at).toBe(3);
  });
});
