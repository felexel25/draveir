import { describe, it, expect } from 'vitest';
import { normalizeText, novelMatchesQuery, revealsHidden } from './search';

const novel = {
  title: 'El Heraldo Gris',
  synopsis: 'Una carta reescribe el destino en la niebla.',
  categories: ['Fantasía', 'Aventura'],
  tags: ['Magia'],
};

describe('normalizeText', () => {
  it('quita acentos y baja a minúsculas', () => {
    expect(normalizeText('Fantasía')).toBe('fantasia');
  });
});

describe('novelMatchesQuery', () => {
  it('query vacía coincide con todo', () => {
    expect(novelMatchesQuery(novel, '   ')).toBe(true);
  });
  it('coincide por título, sinopsis, categoría o etiqueta (sin acentos)', () => {
    expect(novelMatchesQuery(novel, 'heraldo')).toBe(true);
    expect(novelMatchesQuery(novel, 'niebla')).toBe(true);
    expect(novelMatchesQuery(novel, 'fantasia')).toBe(true);
    expect(novelMatchesQuery(novel, 'magia')).toBe(true);
  });
  it('exige todos los términos (AND)', () => {
    expect(novelMatchesQuery(novel, 'heraldo magia')).toBe(true);
    expect(novelMatchesQuery(novel, 'heraldo dragones')).toBe(false);
  });
});

describe('revealsHidden', () => {
  it('destapa una oculta solo con su nombre', () => {
    expect(revealsHidden('El Signo Blanco', 'signo blanco')).toBe(true);
    expect(revealsHidden('El Signo Blanco', 'SIGNO')).toBe(true);
    expect(revealsHidden('El Señor de la Niebla', 'senor')).toBe(true); // sin tildes
  });
  it('no la destapa con consultas cortas ni ajenas', () => {
    expect(revealsHidden('El Signo Blanco', 'sig')).toBe(false);
    expect(revealsHidden('El Signo Blanco', '')).toBe(false);
    expect(revealsHidden('El Signo Blanco', 'fantasia')).toBe(false);
  });
});
