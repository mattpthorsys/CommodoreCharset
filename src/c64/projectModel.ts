export type C64Color = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type C64VisibleCellColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MulticolorPixel = 0 | 1 | 2 | 3;
export type CharacterPixels = MulticolorPixel[][];

export interface CharacterData {
  pixels: CharacterPixels;
  defaultVisibleColor: C64VisibleCellColor;
}

export interface TileDefinition {
  characterIndexes: number[];
}

export interface ProjectData {
  version: number;
  d021Background: C64Color;
  d022Multicolor1: C64Color;
  d023Multicolor2: C64Color;
  characters: CharacterData[];
  tiles: TileDefinition[];
  tileWidth: number;
  tileHeight: number;
}

export const PROJECT_VERSION = 1;
export const CHARACTER_COUNT = 256;
export const TILE_COUNT = 256;
export const CHARACTER_ROWS = 8;
export const CHARACTER_COLUMNS = 4;

export function createBlankCharacter(defaultVisibleColor: C64VisibleCellColor = 1): CharacterData {
  return {
    pixels: Array.from({ length: CHARACTER_ROWS }, () => Array.from({ length: CHARACTER_COLUMNS }, () => 0 as MulticolorPixel)),
    defaultVisibleColor,
  };
}

export function createBlankTile(width: number, height: number): TileDefinition {
  return { characterIndexes: Array.from({ length: width * height }, () => 0) };
}

export function createNewProject(): ProjectData {
  return {
    version: PROJECT_VERSION,
    d021Background: 6,
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
    return { characterIndexes: indexes };
  });
  return next;
}
