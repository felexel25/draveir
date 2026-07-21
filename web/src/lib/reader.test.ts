import { describe, it, expect } from 'vitest';
import {
  emptyState,
  parseState,
  isFavorite,
  toggleFavorite,
  recordRead,
  setPosition,
  getPosition,
  isRead,
  countRead,
  discover,
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
      discovered: [],
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

describe('isRead / countRead', () => {
  it('marca leído desde el 90% de la posición', () => {
    let s = emptyState();
    expect(isRead(s, 'a/capitulo-1')).toBe(false);
    s = setPosition(s, 'a/capitulo-1', 0.89);
    expect(isRead(s, 'a/capitulo-1')).toBe(false);
    s = setPosition(s, 'a/capitulo-1', 0.9);
    expect(isRead(s, 'a/capitulo-1')).toBe(true);
    s = setPosition(s, 'a/capitulo-1', 1);
    expect(isRead(s, 'a/capitulo-1')).toBe(true);
  });
  it('cuenta solo los leídos de la lista que se le pasa', () => {
    let s = emptyState();
    s = setPosition(s, 'a/capitulo-1', 1);
    s = setPosition(s, 'a/capitulo-2', 0.3);
    s = setPosition(s, 'b/capitulo-1', 1);
    expect(countRead(s, ['a/capitulo-1', 'a/capitulo-2', 'a/capitulo-3'])).toBe(1);
  });
});

describe('discover', () => {
  it('añade una vez y no duplica', () => {
    let s = discover(emptyState(), 'secreta');
    expect(s.discovered).toEqual(['secreta']);
    s = discover(s, 'secreta');
    expect(s.discovered).toEqual(['secreta']);
    s = discover(s, 'otra');
    expect(s.discovered).toEqual(['secreta', 'otra']);
  });
  it('funciona sobre un estado viejo sin el campo', () => {
    const viejo = parseState(JSON.stringify({ version: 1, favorites: [], continueReading: {}, positions: {}, history: [] }));
    expect(discover(viejo, 'x').discovered).toEqual(['x']);
  });
});
