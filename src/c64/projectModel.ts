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
}

export const PROJECT_VERSION = 2;
export const CHARACTER_COUNT = 256;
export const TILE_COUNT = 256;
export const CHARACTER_ROWS = 8;
export const MULTICOLOR_CHARACTER_COLUMNS = 4;
export const HIRES_CHARACTER_COLUMNS = 8;
export const DEFAULT_CELL_MODE: CellDisplayMode = 'multicolor';

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
  };
}

export function cloneProject(project: ProjectData): ProjectData {
  return JSON.parse(JSON.stringify(project)) as ProjectData;
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
