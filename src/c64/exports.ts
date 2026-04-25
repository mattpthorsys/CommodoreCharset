import { decodeCharacterBytes, exportCharsetBinary, characterToBytes } from './encoding';
import {
  CHARACTER_ROWS,
  DEFAULT_CELL_MODE,
  CHARACTER_COUNT,
  PROJECT_VERSION,
  TILE_COUNT,
  characterColumnsForMode,
  createBlankMap,
  createBlankCharacter,
  createBlankTile,
  type CellDisplayMode,
  type CharacterData,
  type C64VisibleCellColor,
  type MapData,
  type ProjectData,
} from './projectModel';

export interface NamedBinaryExport {
  filename: string;
  bytes: Uint8Array;
}

export function exportCharacterVisibleColours(project: ProjectData): Uint8Array {
  return Uint8Array.from(project.characters.map((character) => character.defaultVisibleColor));
}

export function colourRamByteForCell(mode: CellDisplayMode, visibleColor: C64VisibleCellColor): number {
  return mode === 'hires' ? visibleColor : visibleColor + 8;
}

export function exportCharacterColourRamBytes(project: ProjectData): Uint8Array {
  return Uint8Array.from(project.characters.map((character) => colourRamByteForCell(character.mode, character.defaultVisibleColor)));
}

export function exportTilesFlat(project: ProjectData): Uint8Array {
  return Uint8Array.from(project.tiles.flatMap((tile) => tile.characterIndexes));
}

export function exportTilesSeparated(project: ProjectData): NamedBinaryExport[] {
  const files: NamedBinaryExport[] = [];
  for (let y = 0; y < project.tileHeight; y += 1) {
    for (let x = 0; x < project.tileWidth; x += 1) {
      const offset = y * project.tileWidth + x;
      files.push({
        filename: `tile_x${x}_y${y}.bin`,
        bytes: Uint8Array.from(project.tiles.map((tile) => tile.characterIndexes[offset] ?? 0)),
      });
    }
  }
  return files;
}

export function exportMapFlat(map: MapData): Uint8Array {
  return Uint8Array.from(map.rooms.flatMap((room) => room.tileIndexes));
}

export function exportMapRoomsSeparated(map: MapData): NamedBinaryExport[] {
  return map.rooms.map((room, index) => ({
    filename: `map_room_${String(index).padStart(2, '0')}.bin`,
    bytes: Uint8Array.from(room.tileIndexes),
  }));
}

export function exportMapJson(map: MapData): string {
  return JSON.stringify(normalizeMap(map), null, 2);
}

export function importMapJson(text: string): MapData {
  return normalizeMap(JSON.parse(text) as Partial<MapData>);
}

export function exportTileColourRamFlat(project: ProjectData): Uint8Array {
  return Uint8Array.from(project.tiles.flatMap((tile) => tile.characterIndexes.map((characterIndex, cellIndex) => {
    const character = project.characters[characterIndex] ?? createBlankCharacter();
    return colourRamByteForCell(tile.cellModes[cellIndex] ?? character.mode, character.defaultVisibleColor);
  })));
}

export function exportTileColourRamSeparated(project: ProjectData): NamedBinaryExport[] {
  const files: NamedBinaryExport[] = [];
  for (let y = 0; y < project.tileHeight; y += 1) {
    for (let x = 0; x < project.tileWidth; x += 1) {
      const offset = y * project.tileWidth + x;
      files.push({
        filename: `tile_colour_ram_x${x}_y${y}.bin`,
        bytes: Uint8Array.from(project.tiles.map((tile) => {
          const character = project.characters[tile.characterIndexes[offset] ?? 0] ?? createBlankCharacter();
          return colourRamByteForCell(tile.cellModes[offset] ?? character.mode, character.defaultVisibleColor);
        })),
      });
    }
  }
  return files;
}

export function exportProjectJson(project: ProjectData): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectJson(text: string): ProjectData {
  return normalizeProject(JSON.parse(text) as Partial<ProjectData>);
}

function normalizeCharacter(character: Partial<CharacterData> | undefined): CharacterData {
  const source = character ?? {};
  const mode: CellDisplayMode = source.mode === 'hires' ? 'hires' : DEFAULT_CELL_MODE;
  const defaultVisibleColor = Number.isInteger(source.defaultVisibleColor) && source.defaultVisibleColor! >= 0 && source.defaultVisibleColor! <= 7
    ? source.defaultVisibleColor as C64VisibleCellColor
    : 1;
  const blank = createBlankCharacter(defaultVisibleColor, mode);
  if (!Array.isArray(source.pixels) || source.pixels.length !== CHARACTER_ROWS) return blank;

  try {
    const bytes = characterToBytes({ mode: DEFAULT_CELL_MODE, defaultVisibleColor, pixels: source.pixels });
    return { mode, defaultVisibleColor, pixels: decodeCharacterBytes(Array.from(bytes), mode) };
  } catch {
    const columns = characterColumnsForMode(mode);
    return {
      mode,
      defaultVisibleColor,
      pixels: source.pixels.map((row) => {
        const normalized = Array.isArray(row) ? row.slice(0, columns).map((pixel) => Number(pixel) || 0) : [];
        while (normalized.length < columns) normalized.push(0);
        return normalized.map((pixel) => Math.max(0, Math.min(mode === 'hires' ? 1 : 3, pixel))) as CharacterData['pixels'][number];
      }),
    };
  }
}

function normalizeProject(source: Partial<ProjectData>): ProjectData {
  const width = Number.isInteger(source.tileWidth) && source.tileWidth! > 0 ? source.tileWidth! : 2;
  const height = Number.isInteger(source.tileHeight) && source.tileHeight! > 0 ? source.tileHeight! : 2;
  const tileLength = width * height;
  const characters = Array.from({ length: CHARACTER_COUNT }, (_, index) => normalizeCharacter(source.characters?.[index]));
  const tiles = Array.from({ length: TILE_COUNT }, (_, index) => {
    const sourceTile = source.tiles?.[index];
    const tile = createBlankTile(width, height);
    if (Array.isArray(sourceTile?.characterIndexes)) {
      tile.characterIndexes = sourceTile.characterIndexes.slice(0, tileLength).map((value) => Number(value) || 0);
      while (tile.characterIndexes.length < tileLength) tile.characterIndexes.push(0);
    }
    if (Array.isArray(sourceTile?.cellModes)) {
      tile.cellModes = sourceTile.cellModes.slice(0, tileLength).map((mode) => mode === 'hires' ? 'hires' : DEFAULT_CELL_MODE);
      while (tile.cellModes.length < tileLength) tile.cellModes.push(DEFAULT_CELL_MODE);
    }
    return tile;
  });
  return {
    version: PROJECT_VERSION,
    projectName: typeof source.projectName === 'string' ? source.projectName : 'Untitled Charset',
    d021Background: source.d021Background ?? 0,
    d022Multicolor1: source.d022Multicolor1 ?? 14,
    d023Multicolor2: source.d023Multicolor2 ?? 3,
    characters,
    tiles,
    tileWidth: width,
    tileHeight: height,
    map: normalizeMap(source.map),
  } as ProjectData;
}

function normalizeMap(source: Partial<MapData> | undefined): MapData {
  const width = Number.isInteger(source?.width) && source!.width! > 0 ? Math.min(source!.width!, 255) : 40;
  const height = Number.isInteger(source?.height) && source!.height! > 0 ? Math.min(source!.height!, 255) : 25;
  const sourceRooms = Array.isArray(source?.rooms) && source!.rooms!.length > 0 ? source!.rooms! : createBlankMap(width, height, 1).rooms;
  const length = width * height;
  return {
    width,
    height,
    rooms: sourceRooms.map((room) => {
      const tileIndexes = Array.isArray(room.tileIndexes) ? room.tileIndexes.slice(0, length).map((value) => Number(value) || 0) : [];
      while (tileIndexes.length < length) tileIndexes.push(0);
      return { tileIndexes: tileIndexes.map((value) => Math.max(0, Math.min(255, value))) };
    }),
  };
}

function formatHexArray(bytes: Uint8Array, indent = '  '): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = Array.from(bytes.slice(i, i + 16), (byte) => `0x${byte.toString(16).padStart(2, '0')}`);
    lines.push(`${indent}${chunk.join(', ')}${i + 16 < bytes.length ? ',' : ''}`);
  }
  return lines.join('\n');
}

function cArray(name: string, bytes: Uint8Array): string {
  return `// ${name}: ${bytes.length} bytes\nunsigned char ${name}[${bytes.length}] = {\n${formatHexArray(bytes)}\n};`;
}

export function exportOscar64Header(project: ProjectData): string {
  const pieces = [
    '/* Generated by C64 Multicolour Charset Editor. */',
    '/* Colour RAM is per screen cell; hi-res cells use 0..7 and multicolour cells use visible colour + 8. */',
    cArray('charsetData', exportCharsetBinary(project)),
    cArray('characterVisibleColours', exportCharacterVisibleColours(project)),
    cArray('characterColourRamBytes', exportCharacterColourRamBytes(project)),
    cArray('tileMapFlat', exportTilesFlat(project)),
    cArray('tileColourRamFlat', exportTileColourRamFlat(project)),
    cArray('screenMapFlat', exportMapFlat(project.map)),
  ];

  for (const file of exportTilesSeparated(project)) {
    const name = file.filename.replace('.bin', '').replace(/[^a-zA-Z0-9_]/g, '_');
    pieces.push(cArray(`tilePlane_${name.replace(/^tile_/, '')}`, file.bytes));
  }
  for (const file of exportTileColourRamSeparated(project)) {
    const name = file.filename.replace('.bin', '').replace(/[^a-zA-Z0-9_]/g, '_');
    pieces.push(cArray(`tileColourRamPlane_${name.replace(/^tile_colour_ram_/, '')}`, file.bytes));
  }
  for (const file of exportMapRoomsSeparated(project.map)) {
    const name = file.filename.replace('.bin', '').replace(/[^a-zA-Z0-9_]/g, '_');
    pieces.push(cArray(name, file.bytes));
  }

  pieces.push(`// tile count: ${TILE_COUNT}, character count: ${CHARACTER_COUNT}, tile size: ${project.tileWidth}x${project.tileHeight}, map size: ${project.map.width}x${project.map.height}, rooms: ${project.map.rooms.length}`);
  return `${pieces.join('\n\n')}\n`;
}
