import { describe, it, expect } from 'vitest';
import {
  rarityOf,
  pick,
  canPull,
  invocationDay,
  nextInvocationAt,
  HIDDEN_CHANCE,
  type GachaCard,
} from './gacha';

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

// Panamá es UTC-05:00, así que las 7 PM de Panamá son las 00:00 UTC del día
// siguiente. Se escriben en UTC para no depender de la zona de quien ejecuta.
const panama = (iso: string) => Date.parse(iso);

describe('invocationDay', () => {
  it('el día cambia a las 7 PM de Panamá, no a medianoche', () => {
    const antes = panama('2026-07-20T23:59:00Z'); // 6:59 PM en Panamá
    const despues = panama('2026-07-21T00:00:00Z'); // 7:00 PM en Panamá
    expect(invocationDay(despues)).toBe(invocationDay(antes) + 1);
  });
  it('la medianoche de Panamá no abre nada', () => {
    const antesDeMedianoche = panama('2026-07-21T04:59:00Z'); // 11:59 PM
    const despuesDeMedianoche = panama('2026-07-21T05:01:00Z'); // 12:01 AM
    expect(invocationDay(despuesDeMedianoche)).toBe(invocationDay(antesDeMedianoche));
  });
});

describe('canPull', () => {
  const ahora = panama('2026-07-20T18:00:00Z'); // 1 PM en Panamá
  it('sin tirada previa, se puede', () => {
    expect(canPull(null, ahora)).toBe(true);
  });
  it('con la tirada de hoy hecha, no se puede', () => {
    expect(canPull({ day: invocationDay(ahora) }, ahora)).toBe(false);
  });
  it('la tirada de ayer no bloquea', () => {
    expect(canPull({ day: invocationDay(ahora) - 1 }, ahora)).toBe(true);
  });
  it('se reabre justo al pasar las 7 PM', () => {
    const seisPM = panama('2026-07-20T23:00:00Z');
    const sietePM = panama('2026-07-21T00:00:00Z');
    const daily = { day: invocationDay(seisPM) };
    expect(canPull(daily, seisPM)).toBe(false);
    expect(canPull(daily, sietePM)).toBe(true);
  });
});

describe('nextInvocationAt', () => {
  it('apunta a las próximas 7 PM de Panamá', () => {
    const mediodia = panama('2026-07-20T17:00:00Z'); // 12 PM en Panamá
    expect(new Date(nextInvocationAt(mediodia)).toISOString()).toBe('2026-07-21T00:00:00.000Z');
  });
  it('pasadas las 7 PM apunta a las del día siguiente', () => {
    const ochoPM = panama('2026-07-21T01:00:00Z'); // 8 PM en Panamá
    expect(new Date(nextInvocationAt(ochoPM)).toISOString()).toBe('2026-07-22T00:00:00.000Z');
  });
  it('siempre queda en el futuro', () => {
    for (const iso of ['2026-01-01T00:00:00Z', '2026-07-20T23:59:59Z', '2026-12-28T05:00:00Z']) {
      const t = panama(iso);
      expect(nextInvocationAt(t)).toBeGreaterThan(t);
    }
  });
});
