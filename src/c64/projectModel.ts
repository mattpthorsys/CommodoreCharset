export type C64Color = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type C64VisibleCellColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MulticolorPixel = 0 | 1 | 2 | 3;
export type HiresPixel = 0 | 1;
export type CellPixel = MulticolorPixel | HiresPixel;
export type CellDisplayMode = 'multicolor' | 'hires';
export type CharacterPixels = CellPixel[][];

export interface CharacterData {
  mode: CellDisplayMode;
  pixels: CharacterPixels;
  defaultVisibleColor: C64VisibleCellColor;
}

export interface TileDefinition {
  characterIndexes: number[];
  cellModes: CellDisplayMode[];
}

export interface MapRoomData {
  tileIndexes: number[];
}

export interface MapData {
  width: number;
  height: number;
  rooms: MapRoomData[];
}

export interface ProjectData {
  version: number;
  projectName: string;
  d021Background: C64Color;
  d022Multicolor1: C64Color;
  d023Multicolor2: C64Color;
  characters: CharacterData[];
  tiles: TileDefinition[];
  tileWidth: number;
  tileHeight: number;
  map: MapData;
}

export const PROJECT_VERSION = 3;
export const CHARACTER_COUNT = 256;
export const TILE_COUNT = 256;
export const CHARACTER_ROWS = 8;
export const MULTICOLOR_CHARACTER_COLUMNS = 4;
export const HIRES_CHARACTER_COLUMNS = 8;
export const DEFAULT_CELL_MODE: CellDisplayMode = 'multicolor';
export const DEFAULT_MAP_WIDTH = 40;
export const DEFAULT_MAP_HEIGHT = 25;
export const DEFAULT_MAP_ROOMS = 1;

export function characterColumnsForMode(mode: CellDisplayMode): number {
  return mode === 'hires' ? HIRES_CHARACTER_COLUMNS : MULTICOLOR_CHARACTER_COLUMNS;
}

export function createBlankCharacter(defaultVisibleColor: C64VisibleCellColor = 1, mode: CellDisplayMode = DEFAULT_CELL_MODE): CharacterData {
  return {
    mode,
    pixels: Array.from({ length: CHARACTER_ROWS }, () => Array.from({ length: characterColumnsForMode(mode) }, () => 0 as CellPixel)),
    defaultVisibleColor,
  };
}

export function createBlankTile(width: number, height: number): TileDefinition {
  const length = width * height;
  return {
    characterIndexes: Array.from({ length }, () => 0),
    cellModes: Array.from({ length }, () => DEFAULT_CELL_MODE),
  };
}

export function createBlankMapRoom(width: number, height: number): MapRoomData {
  return { tileIndexes: Array.from({ length: width * height }, () => 0) };
}

export function createBlankMap(width = DEFAULT_MAP_WIDTH, height = DEFAULT_MAP_HEIGHT, rooms = DEFAULT_MAP_ROOMS): MapData {
  return {
    width,
    height,
    rooms: Array.from({ length: rooms }, () => createBlankMapRoom(width, height)),
  };
}

export function createNewProject(): ProjectData {
  return {
    version: PROJECT_VERSION,
    projectName: 'Untitled Charset',
    d021Background: 0,
    d022Multicolor1: 14,
    d023Multicolor2: 3,
    characters: Array.from({ length: CHARACTER_COUNT }, () => createBlankCharacter()),
    tiles: Array.from({ length: TILE_COUNT }, () => createBlankTile(2, 2)),
    tileWidth: 2,
    tileHeight: 2,
    map: createBlankMap(),
  };
}

export function cloneProject(project: ProjectData): ProjectData {
  return JSON.parse(JSON.stringify(project)) as ProjectData;
}

export function normalizeMapDimensions(project: ProjectData, width: number, height: number, rooms: number): ProjectData {
  const next = cloneProject(project);
  next.map.width = width;
  next.map.height = height;
  const length = width * height;
  const normalizedRooms = next.map.rooms.slice(0, rooms).map((room) => {
    const tileIndexes = room.tileIndexes.slice(0, length);
    while (tileIndexes.length < length) tileIndexes.push(0);
    return { tileIndexes };
  });
  while (normalizedRooms.length < rooms) normalizedRooms.push(createBlankMapRoom(width, height));
  next.map.rooms = normalizedRooms;
  return next;
}

export function normalizeTileDimensions(project: ProjectData, width: number, height: number): ProjectData {
  const next = cloneProject(project);
  next.tileWidth = width;
  next.tileHeight = height;
  const length = width * height;
  next.tiles = next.tiles.map((tile) => {
    const indexes = tile.characterIndexes.slice(0, length);
    while (indexes.length < length) indexes.push(0);
    const cellModes = (tile.cellModes ?? []).slice(0, length);
    while (cellModes.length < length) cellModes.push(DEFAULT_CELL_MODE);
    return { characterIndexes: indexes, cellModes };
  });
  return next;
}
