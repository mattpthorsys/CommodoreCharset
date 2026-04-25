import { describe, expect, test } from 'vitest';
import { decodeMulticolorRow, encodeMulticolorRow } from '../src/c64/encoding';
import {
  exportCharacterColourRamBytes,
  exportCharacterVisibleColours,
  exportCharsetBinary,
  exportTilesFlat,
  exportTilesSeparated,
} from '../src/c64/exports';
import { createNewProject } from '../src/c64/projectModel';

describe('encoding', () => {
  test('encode row examples', () => {
    expect(encodeMulticolorRow([0, 0, 0, 0])).toBe(0x00);
    expect(encodeMulticolorRow([3, 3, 3, 3])).toBe(0xff);
    expect(encodeMulticolorRow([0, 1, 2, 3])).toBe(0x1b);
  });

  test('decode row example', () => {
    expect(decodeMulticolorRow(0x1b)).toEqual([0, 1, 2, 3]);
  });

  test('export sizes and ranges', () => {
    const project = createNewProject(2, 2);

    const charset = exportCharsetBinary(project);
    expect(charset.length).toBe(2048);

    const visible = exportCharacterVisibleColours(project);
    expect(visible.length).toBe(256);
    expect(Math.min(...visible)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...visible)).toBeLessThanOrEqual(7);

    const colorRam = exportCharacterColourRamBytes(project);
    expect(colorRam.length).toBe(256);
    expect(Math.min(...colorRam)).toBeGreaterThanOrEqual(8);
    expect(Math.max(...colorRam)).toBeLessThanOrEqual(15);

    const separated = exportTilesSeparated(project);
    expect(Object.keys(separated).length).toBe(4);
    Object.values(separated).forEach((bytes) => expect(bytes.length).toBe(256));

    const flat = exportTilesFlat(project);
    expect(flat.length).toBe(1024);
  });
});
