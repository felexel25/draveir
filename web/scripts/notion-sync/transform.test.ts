import { describe, it, expect } from 'vitest';
import {
  parseNovel, parseChapterMeta, chapterSlug, parseSaga, novelSlugOf, symmetrizeRelated,
} from './transform';
import type { NotionPage, NovelData } from './types';

const novelPage: NotionPage = {
  id: 'novel-1',
  properties: {
    'Título': { title: [{ plain_text: 'El Heraldo Gris' }] },
    'Slug': { rich_text: [{ plain_text: 'el-heraldo-gris' }] },
    'Sinopsis': { rich_text: [{ plain_text: 'Una carta reescribe el destino.' }] },
    'Estado': { select: { name: 'En progreso' } },
    'Formato': { select: { name: 'Novela' } },
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
      format: 'Novela',
      categories: ['Fantasía', 'Aventura'],
      tags: ['Magia'],
      featured: true,
      saga: null,
      sagaOrder: null,
      related: [],
    });
  });

  it('usa un slug derivado del título si falta Slug', () => {
    const noSlug: NotionPage = {
      id: 'n',
      properties: { ...novelPage.properties, 'Slug': { rich_text: [] } },
    };
    expect(parseNovel(noSlug).slug).toBe('el-heraldo-gris');
  });

  it('deja el formato en null si la novela no lo declara', () => {
    const sinFormato: NotionPage = {
      id: 'n',
      properties: { ...novelPage.properties, 'Formato': {} },
    };
    expect(parseNovel(sinFormato).format).toBeNull();
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

const sagaPage: NotionPage = {
  id: 'saga-1',
  properties: {
    'Nombre': { title: [{ plain_text: 'El Ciclo de la Niebla' }] },
    'Slug': { rich_text: [{ plain_text: 'el-ciclo-de-la-niebla' }] },
    'Descripción': { rich_text: [{ plain_text: 'Un mundo velado.' }] },
    'Orden': { number: 1 },
  },
};

const sagaNovelPage: NotionPage = {
  id: 'novel-2',
  properties: {
    ...novelPage.properties,
    'Título': { title: [{ plain_text: 'La Torre Sumergida' }] },
    'Slug': { rich_text: [{ plain_text: 'la-torre-sumergida' }] },
    'Saga': { relation: [{ id: 'saga-1' }] },
    'Orden en saga': { number: 2 },
    'Relacionadas': { relation: [{ id: 'novel-1' }, { id: 'fantasma' }] },
  },
};

describe('parseSaga', () => {
  it('mapea todas las propiedades de una saga', () => {
    expect(parseSaga(sagaPage)).toEqual({
      slug: 'el-ciclo-de-la-niebla',
      name: 'El Ciclo de la Niebla',
      description: 'Un mundo velado.',
      order: 1,
    });
  });

  it('deriva el slug del nombre si falta Slug', () => {
    const noSlug: NotionPage = {
      id: 's',
      properties: { ...sagaPage.properties, 'Slug': { rich_text: [] } },
    };
    expect(parseSaga(noSlug).slug).toBe('el-ciclo-de-la-niebla');
  });

  it('usa orden 0 si falta Orden', () => {
    const noOrder: NotionPage = {
      id: 's',
      properties: { ...sagaPage.properties, 'Orden': {} },
    };
    expect(parseSaga(noOrder).order).toBe(0);
  });
});

describe('novelSlugOf', () => {
  it('devuelve el slug sin resolver relaciones', () => {
    expect(novelSlugOf(sagaNovelPage)).toBe('la-torre-sumergida');
  });
});

describe('parseNovel con sagas', () => {
  const sagas = new Map([['saga-1', 'el-ciclo-de-la-niebla']]);
  const novels = new Map([
    ['novel-1', 'el-heraldo-gris'],
    ['novel-2', 'la-torre-sumergida'],
  ]);

  it('resuelve la saga y su orden', () => {
    const n = parseNovel(sagaNovelPage, sagas, novels);
    expect(n.saga).toBe('el-ciclo-de-la-niebla');
    expect(n.sagaOrder).toBe(2);
  });

  it('resuelve las relacionadas y descarta las que no están publicadas', () => {
    // 'fantasma' no está en el mapa: es una novela sin publicar.
    expect(parseNovel(sagaNovelPage, sagas, novels).related).toEqual(['el-heraldo-gris']);
  });

  it('una novela sin saga sale con los campos vacíos', () => {
    const n = parseNovel(novelPage, sagas, novels);
    expect(n.saga).toBeNull();
    expect(n.sagaOrder).toBeNull();
    expect(n.related).toEqual([]);
  });

  it('no rompe si no se le pasan los mapas', () => {
    expect(parseNovel(sagaNovelPage).saga).toBeNull();
  });
});

describe('symmetrizeRelated', () => {
  const novel = (slug: string, related: string[]): NovelData => ({
    slug, title: slug, synopsis: '', status: null, format: null, categories: [], tags: [],
    featured: false, saga: null, sagaOrder: null, related,
  });

  it('cierra la relación en el sentido que falta', () => {
    const [a, b] = symmetrizeRelated([novel('a', ['b']), novel('b', [])]);
    expect(a.related).toEqual(['b']);
    expect(b.related).toEqual(['a']);
  });

  it('no duplica si ambas ya se declaran', () => {
    const [a, b] = symmetrizeRelated([novel('a', ['b']), novel('b', ['a'])]);
    expect(a.related).toEqual(['b']);
    expect(b.related).toEqual(['a']);
  });

  it('ignora una novela que se relaciona consigo misma', () => {
    const [a] = symmetrizeRelated([novel('a', ['a'])]);
    expect(a.related).toEqual([]);
  });

  it('ignora relaciones a novelas que no están en la lista', () => {
    const [a] = symmetrizeRelated([novel('a', ['inexistente'])]);
    expect(a.related).toEqual([]);
  });
});
