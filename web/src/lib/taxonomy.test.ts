import { describe, it, expect } from 'vitest';
import { collectTaxonomy } from './taxonomy';

const novels = [
  { categories: ['Fantasía', 'Aventura'], tags: ['Magia'] },
  { categories: ['Fantasía', 'Misterio'], tags: ['Magia', 'Academia'] },
];

describe('collectTaxonomy', () => {
  it('agrupa categorías con slug y conteo, ordenadas', () => {
    expect(collectTaxonomy(novels, 'categories')).toEqual([
      { name: 'Aventura', slug: 'aventura', count: 1 },
      { name: 'Fantasía', slug: 'fantasia', count: 2 },
      { name: 'Misterio', slug: 'misterio', count: 1 },
    ]);
  });
  it('funciona con etiquetas', () => {
    expect(collectTaxonomy(novels, 'tags').map((t) => t.slug)).toEqual(['academia', 'magia']);
  });
});
