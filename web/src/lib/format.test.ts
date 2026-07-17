import { describe, it, expect } from 'vitest';
import { formatSubtitle, formatMinutes } from './format';

describe('formatSubtitle', () => {
  it('da el término culto de los formatos que lo tienen', () => {
    expect(formatSubtitle('Relato largo')).toBe('novelette');
    expect(formatSubtitle('Novela corta')).toBe('nouvelle');
  });

  it('no inventa subtítulo para los formatos que no lo necesitan', () => {
    expect(formatSubtitle('Microrrelato')).toBeNull();
    expect(formatSubtitle('Relato')).toBeNull();
    expect(formatSubtitle('Novela')).toBeNull();
  });

  it('devuelve null si el formato falta o no se reconoce', () => {
    expect(formatSubtitle(null)).toBeNull();
    expect(formatSubtitle('Novelón')).toBeNull();
  });

  it('no se cuela una propiedad heredada de Object', () => {
    expect(formatSubtitle('toString')).toBeNull();
    expect(formatSubtitle('constructor')).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('menos de una hora: solo minutos', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(1)).toBe('1 min');
    expect(formatMinutes(59)).toBe('59 min');
  });

  it('una hora en punto: sin minutos colgando', () => {
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(120)).toBe('2 h');
  });

  it('más de una hora: horas y minutos', () => {
    expect(formatMinutes(100)).toBe('1 h 40 min');
    expect(formatMinutes(605)).toBe('10 h 5 min');
  });
});
