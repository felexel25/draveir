import { describe, it, expect } from 'vitest';
import { readingOrder, positionIn, type OrderedNovel } from './saga';

const n = (slug: string, order: number | null, title = slug): OrderedNovel =>
  ({ slug, title, order });

describe('readingOrder', () => {
  it('ordena por order', () => {
    const out = readingOrder([n('c', 3), n('a', 1), n('b', 2)]);
    expect(out.map((x) => x.slug)).toEqual(['a', 'b', 'c']);
  });

  it('manda al final las que no tienen orden, alfabéticas entre sí', () => {
    const out = readingOrder([n('z', null, 'Zafiro'), n('a', null, 'Alba'), n('b', 1)]);
    expect(out.map((x) => x.slug)).toEqual(['b', 'a', 'z']);
  });

  it('no muta la lista original', () => {
    const input = [n('b', 2), n('a', 1)];
    readingOrder(input);
    expect(input.map((x) => x.slug)).toEqual(['b', 'a']);
  });
});

describe('positionIn', () => {
  const ordered = readingOrder([n('a', 1), n('b', 2), n('c', 3)]);

  it('describe la posición en femenino, como "novela"', () => {
    expect(positionIn('b', ordered)).toBe('2ª de 3');
  });

  it('devuelve null si la novela no está en la saga', () => {
    expect(positionIn('x', ordered)).toBeNull();
  });

  it('devuelve null si la saga tiene una sola novela: "1ª de 1" no informa de nada', () => {
    expect(positionIn('a', readingOrder([n('a', 1)]))).toBeNull();
  });
});
