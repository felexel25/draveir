import { describe, it, expect } from 'vitest';
import { resolveInitialTheme, nextTheme, THEME_KEY } from './theme';

describe('resolveInitialTheme', () => {
  it('respeta la preferencia guardada si es válida', () => {
    expect(resolveInitialTheme('light', true)).toBe('light');
    expect(resolveInitialTheme('dark', false)).toBe('dark');
  });

  it('cae al esquema del sistema si no hay preferencia válida', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
    expect(resolveInitialTheme('banana', true)).toBe('dark');
  });
});

describe('nextTheme', () => {
  it('alterna entre dark y light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});

describe('THEME_KEY', () => {
  it('es la clave de localStorage', () => {
    expect(THEME_KEY).toBe('draveir-theme');
  });
});
