import {
  CHARACTER_COUNT,
  CHARACTER_ROWS,
  HIRES_CHARACTER_COLUMNS,
  MULTICOLOR_CHARACTER_COLUMNS,
  type CharacterData,
  type CharacterPixels,
  type HiresPixel,
  type MulticolorPixel,
  type ProjectData,
} from './projectModel';

export function encodeMulticolorRow(pixels: readonly number[]): number {
  if (pixels.length !== MULTICOLOR_CHARACTER_COLUMNS) {
    throw new Error('A multicolour character row must contain exactly 4 logical pixels.');
  }
  return (
    ((pixels[0] & 0b11) << 6) |
    ((pixels[1] & 0b11) << 4) |
    ((pixels[2] & 0b11) << 2) |
    ((pixels[3] & 0b11) << 0)
  );
}

export function decodeMulticolorRow(byteValue: number): [MulticolorPixel, MulticolorPixel, MulticolorPixel, MulticolorPixel] {
  return [
    ((byteValue >> 6) & 0b11) as MulticolorPixel,
    ((byteValue >> 4) & 0b11) as MulticolorPixel,
    ((byteValue >> 2) & 0b11) as MulticolorPixel,
    (byteValue & 0b11) as MulticolorPixel,
  ];
}

export function encodeHiresRow(pixels: readonly number[]): number {
  if (pixels.length !== HIRES_CHARACTER_COLUMNS) {
    throw new Error('A hi-res character row must contain exactly 8 logical pixels.');
  }
  return pixels.reduce((byteValue, pixel, index) => byteValue | ((pixel & 0b1) << (7 - index)), 0);
}

export function decodeHiresRow(byteValue: number): [HiresPixel, HiresPixel, HiresPixel, HiresPixel, HiresPixel, HiresPixel, HiresPixel, HiresPixel] {
  return [
    ((byteValue >> 7) & 0b1) as HiresPixel,
    ((byteValue >> 6) & 0b1) as HiresPixel,
    ((byteValue >> 5) & 0b1) as HiresPixel,
    ((byteValue >> 4) & 0b1) as HiresPixel,
    ((byteValue >> 3) & 0b1) as HiresPixel,
    ((byteValue >> 2) & 0b1) as HiresPixel,
    ((byteValue >> 1) & 0b1) as HiresPixel,
    (byteValue & 0b1) as HiresPixel,
  ];
}

export function encodeCharacterPixels(characterPixels: CharacterPixels, mode: CharacterData['mode']): Uint8Array {
  if (characterPixels.length !== CHARACTER_ROWS) {
    throw new Error('A character must contain exactly 8 rows.');
  }
  return Uint8Array.from(characterPixels.map((row) => (mode === 'hires' ? encodeHiresRow(row) : encodeMulticolorRow(row))));
}

export function decodeCharacterBytes(characterBytes: readonly number[], mode: CharacterData['mode']): CharacterPixels {
  if (characterBytes.length !== CHARACTER_ROWS) {
    throw new Error('A character must contain exactly 8 bytes.');
  }
  return characterBytes.map((byteValue) => (mode === 'hires' ? decodeHiresRow(byteValue) : decodeMulticolorRow(byteValue)));
}

export function exportCharsetBinary(project: ProjectData): Uint8Array {
  const output = new Uint8Array(CHARACTER_COUNT * CHARACTER_ROWS);
  project.characters.forEach((character, characterIndex) => {
    output.set(characterToBytes(character), characterIndex * CHARACTER_ROWS);
  });
  return output;
}

export function characterToBytes(character: CharacterData): Uint8Array {
  return encodeCharacterPixels(character.pixels, character.mode);
}

export const encodeCharacter = encodeCharacterPixels;
export const decodeCharacter = decodeCharacterBytes;
