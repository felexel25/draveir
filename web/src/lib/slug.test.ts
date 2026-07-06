import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('normaliza acentos y espacios', () => {
    expect(slugify('Ciencia ficción')).toBe('ciencia-ficcion');
    expect(slugify('Fantasía')).toBe('fantasia');
    expect(slugify('  Terror  ')).toBe('terror');
  });
});
