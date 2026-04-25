import { encodeMulticolorRow, decodeMulticolorRow, exportCharsetBinary } from '../src/c64/encoding';
import { exportCharacterColourRamBytes, exportCharacterVisibleColours, exportTilesFlat, exportTilesSeparated } from '../src/c64/exports';
import { createNewProject } from '../src/c64/projectModel';

const project = createNewProject();

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertOk(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

assertEqual(encodeMulticolorRow([0, 0, 0, 0]), 0x00, 'blank row encodes as 0x00');
assertEqual(encodeMulticolorRow([3, 3, 3, 3]), 0xff, 'full row encodes as 0xff');
assertEqual(encodeMulticolorRow([0, 1, 2, 3]), 0x1b, 'mixed row encodes as 0x1b');
assertDeepEqual(decodeMulticolorRow(0x1b), [0, 1, 2, 3], '0x1b decodes as [0,1,2,3]');

assertEqual(exportCharsetBinary(project).length, 2048, 'charset export length');
assertEqual(exportCharacterVisibleColours(project).length, 256, 'visible colour export length');

const colourRam = exportCharacterColourRamBytes(project);
assertEqual(colourRam.length, 256, 'colour RAM export length');
assertOk(Array.from(colourRam).every((value) => value >= 8 && value <= 15), 'colour RAM values are 8..15');

const separated = exportTilesSeparated(project);
assertEqual(separated.length, 4, '2x2 separated export file count');
assertOk(separated.every((file) => file.bytes.length === 256), 'separated tile files are 256 bytes');
assertEqual(exportTilesFlat(project).length, 1024, '2x2 flat tile export length');

console.log('encoding/export tests passed');
