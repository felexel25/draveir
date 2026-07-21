import { describe, it, expect } from 'vitest';
import { rarityOf, pick, pickMany, HIDDEN_CHANCE, type GachaCard } from './gacha';

const card = (slug: string, format: string | null, hidden = false): GachaCard => ({
  slug,
  title: slug,
  format,
  hidden,
  rarity: rarityOf(format, hidden),
});

// Devuelve los valores en orden; útil para fijar qué rama toma pick().
const secuencia = (valores: number[]) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
};

describe('rarityOf', () => {
  it('mapea el formato a la rareza', () => {
    expect(rarityOf('Microrrelato')).toBe(3);
    expect(rarityOf('Relato')).toBe(3);
    expect(rarityOf('Relato largo')).toBe(4);
    expect(rarityOf('Novela corta')).toBe(4);
    expect(rarityOf('Novela')).toBe(5);
  });
  it('un formato desconocido o ausente cae en 3★', () => {
    expect(rarityOf(null)).toBe(3);
    expect(rarityOf('Poema sinfónico')).toBe(3);
  });
  it('una historia oculta siempre es 5★', () => {
    expect(rarityOf('Microrrelato', true)).toBe(5);
    expect(rarityOf(null, true)).toBe(5);
  });
});

describe('pick', () => {
  const visibles = [card('a', 'Novela'), card('b', 'Relato')];
  const ocultas = [card('secreta', 'Relato', true)];

  it('saca del grupo oculto bajo el umbral', () => {
    const c = pick(visibles, ocultas, secuencia([HIDDEN_CHANCE - 0.01, 0]));
    expect(c?.slug).toBe('secreta');
    expect(c?.rarity).toBe(5);
  });
  it('saca del grupo visible por encima del umbral', () => {
    expect(pick(visibles, ocultas, secuencia([HIDDEN_CHANCE + 0.01, 0]))?.slug).toBe('a');
  });
  it('sin ocultas por descubrir, siempre sale una visible', () => {
    // Con la lista vacía el cortocircuito no llega a pedir aleatorio para el
    // umbral, así que el primer valor ya es el del índice.
    expect(pick(visibles, [], secuencia([0.99]))?.slug).toBe('b');
    expect(pick(visibles, [], secuencia([0]))?.slug).toBe('a');
  });
  it('sin catálogo no inventa una carta', () => {
    expect(pick([], [], secuencia([0.5]))).toBeNull();
  });
  it('un aleatorio de 1 no se sale del array', () => {
    expect(pick(visibles, [], secuencia([1, 1]))?.slug).toBe('b');
  });
});

describe('pickMany', () => {
  it('no repite la misma oculta dentro de la tanda', () => {
    const visibles = [card('a', 'Novela')];
    const ocultas = [card('secreta', 'Relato', true)];
    // Siempre por debajo del umbral: sin el filtro, las diez serían 'secreta'.
    const diez = pickMany(visibles, ocultas, () => 0, 10);
    expect(diez).toHaveLength(10);
    expect(diez.filter((c) => c.hidden)).toHaveLength(1);
  });
  it('devuelve tantas cartas como se piden', () => {
    expect(pickMany([card('a', 'Novela')], [], Math.random, 10)).toHaveLength(10);
  });
});
