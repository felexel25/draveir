import { describe, it, expect } from 'vitest';
import { emptyState, parseState, isFavorite, toggleFavorite, recordRead } from './reader';

describe('parseState', () => {
  it('vacío para null o JSON inválido o versión distinta', () => {
    expect(parseState(null)).toEqual(emptyState());
    expect(parseState('no-json')).toEqual(emptyState());
    expect(parseState(JSON.stringify({ version: 9 }))).toEqual(emptyState());
  });
  it('conserva un estado válido', () => {
    const s = { version: 1, favorites: ['a'], continueReading: { a: 'capitulo-1' }, history: [] };
    expect(parseState(JSON.stringify(s))).toEqual(s);
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
