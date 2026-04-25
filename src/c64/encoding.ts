import type { MulticolorPixel } from './projectModel';

export function encodeMulticolorRow(pixels: [number, number, number, number]): number {
  return (
    ((pixels[0] & 0b11) << 6) |
    ((pixels[1] & 0b11) << 4) |
    ((pixels[2] & 0b11) << 2) |
    (pixels[3] & 0b11)
  );
}

export function decodeMulticolorRow(byteValue: number): [number, number, number, number] {
  return [
    (byteValue >> 6) & 0b11,
    (byteValue >> 4) & 0b11,
    (byteValue >> 2) & 0b11,
    byteValue & 0b11,
  ];
}

export function encodeCharacter(characterPixels: MulticolorPixel[][]): Uint8Array {
  const out = new Uint8Array(8);
  for (let y = 0; y < 8; y += 1) {
    const row = characterPixels[y] ?? [0, 0, 0, 0];
    out[y] = encodeMulticolorRow([row[0], row[1], row[2], row[3]]);
  }
  return out;
}

export function decodeCharacter(characterBytes: Uint8Array): MulticolorPixel[][] {
  const rows: MulticolorPixel[][] = [];
  for (let y = 0; y < 8; y += 1) {
    const [a, b, c, d] = decodeMulticolorRow(characterBytes[y] ?? 0);
    rows.push([a, b, c, d] as MulticolorPixel[]);
  }
  return rows;
}
