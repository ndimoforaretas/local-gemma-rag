/**
 * CogniVault v1 "Cited" design tokens.
 * Single source of truth for the dark palette used across all v1 components.
 */
export const v1 = {
  /** Page / canvas background */
  bg: '#0e0d10',
  /** Cards, composer, sidebar */
  surface: '#16151a',
  /** Pills, hover surfaces, status bar */
  surfaceHi: '#1c1a21',
  /** Right-rail background */
  panel: '#0c0b0e',
  /** Inset snippet panel inside source cards */
  snippetBg: '#0a0a0c',

  border: 'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.10)',

  text: '#e8e6ec',
  textDim: '#9a96a4',
  textMute: '#6d6878',

  /** Violet-400 accent */
  accent: '#a78bfa',
  accentSoft: 'rgba(167,139,250,0.14)',
  accentBorder: 'rgba(167,139,250,0.32)',
  /** Text colour on accent-filled surfaces */
  accentInk: '#16121f',

  /** User message bubble */
  user: '#7c5fde',
  /** Online status dot */
  ok: '#5ce0a8',
} as const;
