import { describe, it, expect } from 'vitest';
import { releaseLabel } from './calendar';

describe('releaseLabel', () => {
  it('con capítulos publicados, la fecha del primero manda', () => {
    expect(releaseLabel({
      firstChapterAt: '2026-01-15T19:00:00.000-05:00',
      releaseWindow: 'Finales de 2027',
    })).toBe('enero de 2026');
  });

  it('sin capítulos, usa la ventana de lanzamiento tal cual', () => {
    expect(releaseLabel({ firstChapterAt: null, releaseWindow: 'Finales de 2027' }))
      .toBe('Finales de 2027');
  });

  it('sin nada, no promete nada', () => {
    expect(releaseLabel({ firstChapterAt: null, releaseWindow: null })).toBeNull();
  });

  it('una fecha ilegible no rompe la página: cae en la ventana', () => {
    expect(releaseLabel({ firstChapterAt: 'mañana', releaseWindow: 'Por anunciar' }))
      .toBe('Por anunciar');
  });

  it('usa la hora de Panamá: un capítulo del 1 de enero a las 19:00 no se va a diciembre', () => {
    expect(releaseLabel({ firstChapterAt: '2026-01-01T19:00:00.000-05:00', releaseWindow: null }))
      .toBe('enero de 2026');
  });
});
