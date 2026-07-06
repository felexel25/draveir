import { describe, it, expect } from 'vitest';
import { coverGradient } from './covers';

describe('coverGradient', () => {
  it('devuelve el gradiente de la primera categoría conocida', () => {
    expect(coverGradient(['Terror'])).toContain('#5a2431');
    expect(coverGradient(['Ciencia ficción'])).toContain('#2e6e7e');
  });

  it('usa el fallback neutro si no hay categorías o no se reconocen', () => {
    expect(coverGradient([])).toContain('#3a4658');
    expect(coverGradient(['Inexistente'])).toContain('#3a4658');
  });

  it('siempre produce un linear-gradient', () => {
    expect(coverGradient(['Fantasía'])).toMatch(/^linear-gradient\(/);
  });
});
