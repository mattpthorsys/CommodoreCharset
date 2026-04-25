import {
  CHARACTER_COLUMNS,
  CHARACTER_COUNT,
  CHARACTER_ROWS,
  type CharacterData,
  type CharacterPixels,
  type MulticolorPixel,
  type ProjectData,
} from './projectModel';

export function encodeMulticolorRow(pixels: readonly number[]): number {
  if (pixels.length !== CHARACTER_COLUMNS) {
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

export function encodeCharacter(characterPixels: CharacterPixels): Uint8Array {
  if (characterPixels.length !== CHARACTER_ROWS) {
    throw new Error('A character must contain exactly 8 rows.');
  }
  return Uint8Array.from(characterPixels.map(encodeMulticolorRow));
}

export function decodeCharacter(characterBytes: readonly number[]): CharacterPixels {
  if (characterBytes.length !== CHARACTER_ROWS) {
    throw new Error('A character must contain exactly 8 bytes.');
  }
  return characterBytes.map(decodeMulticolorRow);
}

export function exportCharsetBinary(project: ProjectData): Uint8Array {
  const output = new Uint8Array(CHARACTER_COUNT * CHARACTER_ROWS);
  project.characters.forEach((character, characterIndex) => {
    output.set(encodeCharacter(character.pixels), characterIndex * CHARACTER_ROWS);
  });
  return output;
}

export function characterToBytes(character: CharacterData): Uint8Array {
  return encodeCharacter(character.pixels);
}
