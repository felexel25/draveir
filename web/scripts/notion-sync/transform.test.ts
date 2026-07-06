import { describe, it, expect } from 'vitest';
import { parseNovel, parseChapterMeta, chapterSlug } from './transform';
import type { NotionPage } from './types';

const novelPage: NotionPage = {
  id: 'novel-1',
  properties: {
    'Título': { title: [{ plain_text: 'El Heraldo Gris' }] },
    'Slug': { rich_text: [{ plain_text: 'el-heraldo-gris' }] },
    'Sinopsis': { rich_text: [{ plain_text: 'Una carta reescribe el destino.' }] },
    'Estado': { select: { name: 'En progreso' } },
    'Categorías': { multi_select: [{ name: 'Fantasía' }, { name: 'Aventura' }] },
    'Etiquetas': { multi_select: [{ name: 'Magia' }] },
    'Destacada': { checkbox: true },
    'Publicada': { checkbox: true },
  },
};

const chapterPage: NotionPage = {
  id: 'chapter-1',
  properties: {
    'Título': { title: [{ plain_text: 'Capítulo 1: La carta' }] },
    'Novela': { relation: [{ id: 'novel-1' }] },
    'Número': { number: 1 },
    'Estado': { select: { name: 'Publicado' } },
    'Fecha de publicación': { date: { start: '2026-06-01T09:00:00.000-05:00' } },
  },
};

describe('chapterSlug', () => {
  it('formatea el número como slug', () => {
    expect(chapterSlug(3)).toBe('capitulo-3');
  });
});

describe('parseNovel', () => {
  it('mapea todas las propiedades de una novela', () => {
    expect(parseNovel(novelPage)).toEqual({
      slug: 'el-heraldo-gris',
      title: 'El Heraldo Gris',
      synopsis: 'Una carta reescribe el destino.',
      status: 'En progreso',
      categories: ['Fantasía', 'Aventura'],
      tags: ['Magia'],
      featured: true,
    });
  });

  it('usa un slug derivado del título si falta Slug', () => {
    const noSlug: NotionPage = {
      id: 'n',
      properties: { ...novelPage.properties, 'Slug': { rich_text: [] } },
    };
    expect(parseNovel(noSlug).slug).toBe('el-heraldo-gris');
  });
});

describe('parseChapterMeta', () => {
  const map = new Map([['novel-1', 'el-heraldo-gris']]);

  it('mapea un capítulo y resuelve el slug de su novela', () => {
    expect(parseChapterMeta(chapterPage, map)).toEqual({
      novelSlug: 'el-heraldo-gris',
      number: 1,
      title: 'Capítulo 1: La carta',
      chapterSlug: 'capitulo-1',
      publishedAt: '2026-06-01T09:00:00.000-05:00',
    });
  });

  it('devuelve null si la novela relacionada no está en el mapa', () => {
    expect(parseChapterMeta(chapterPage, new Map())).toBeNull();
  });
});
