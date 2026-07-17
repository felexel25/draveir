import { describe, it, expect } from 'vitest';
import { releaseLabel, nextChapterLabel, romanNumeral } from './calendar';

describe('releaseLabel', () => {
  it('con capítulos publicados, la fecha del primero manda', () => {
    expect(releaseLabel({
      firstChapterAt: '2026-01-15T19:00:00.000-05:00',
      releaseWindow: 'Finales de 2027',
    })).toBe('15 ene 2026');
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
      .toBe('1 ene 2026');
  });

  // Notion deja la fecha sin hora cuando el autor no la especifica. Leída como
  // medianoche UTC y mostrada en Panamá, retrocedía un día: el capítulo del 6
  // de julio salía anunciado el 5.
  it('una fecha sin hora se queda en su día, no retrocede al anterior', () => {
    expect(releaseLabel({ firstChapterAt: '2026-07-06', releaseWindow: null }))
      .toBe('6 jul 2026');
    expect(releaseLabel({ firstChapterAt: '2026-01-01', releaseWindow: null }))
      .toBe('1 ene 2026');
  });
});

describe('nextChapterLabel', () => {
  it('da el día y la hora en la zona del autor', () => {
    expect(nextChapterLabel('2026-07-18T19:00:00.000-05:00')).toBe('sáb 18 jul · 7:00 PM');
  });

  it('usa PM y AM en mayúsculas, no la abreviatura del sistema', () => {
    expect(nextChapterLabel('2026-07-18T09:30:00.000-05:00')).toBe('sáb 18 jul · 9:30 AM');
  });

  it('una fecha ilegible no rompe la página', () => {
    expect(nextChapterLabel('el jueves')).toBeNull();
  });
});

describe('romanNumeral', () => {
  it('numera las fases como las numera Marvel', () => {
    expect(romanNumeral(1)).toBe('I');
    expect(romanNumeral(4)).toBe('IV');
    expect(romanNumeral(9)).toBe('IX');
    expect(romanNumeral(14)).toBe('XIV');
  });
});
