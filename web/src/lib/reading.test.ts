import { describe, it, expect } from 'vitest';
import { readingTime } from './reading';

describe('readingTime', () => {
  it('estima minutos a ~200 ppm, redondeando hacia arriba', () => {
    expect(readingTime(Array(200).fill('palabra').join(' '))).toBe(1);
    expect(readingTime(Array(201).fill('palabra').join(' '))).toBe(2);
    expect(readingTime(Array(600).fill('x').join(' '))).toBe(3);
  });
  it('nunca baja de 1 minuto', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('hola mundo')).toBe(1);
  });
});
