import type { C64Color } from './projectModel';

export interface PaletteEntry {
  index: C64Color;
  name: string;
  hex: string;
}

export const C64_PALETTE: PaletteEntry[] = [
  { index: 0, name: 'black', hex: '#000000' },
  { index: 1, name: 'white', hex: '#ffffff' },
  { index: 2, name: 'red', hex: '#813338' },
  { index: 3, name: 'cyan', hex: '#75cec8' },
  { index: 4, name: 'purple', hex: '#8e3c97' },
  { index: 5, name: 'green', hex: '#56ac4d' },
  { index: 6, name: 'blue', hex: '#2e2c9b' },
  { index: 7, name: 'yellow', hex: '#edf171' },
  { index: 8, name: 'orange', hex: '#8e5029' },
  { index: 9, name: 'brown', hex: '#553800' },
  { index: 10, name: 'light red', hex: '#c46c71' },
  { index: 11, name: 'dark grey', hex: '#4a4a4a' },
  { index: 12, name: 'grey', hex: '#7b7b7b' },
  { index: 13, name: 'light green', hex: '#a9ff9f' },
  { index: 14, name: 'light blue', hex: '#706deb' },
  { index: 15, name: 'light grey', hex: '#b2b2b2' },
];

export function colorHex(index: C64Color): string {
  return C64_PALETTE[index]?.hex ?? '#ff00ff';
}

export function colorName(index: C64Color): string {
  return C64_PALETTE[index]?.name ?? 'unknown';
}
