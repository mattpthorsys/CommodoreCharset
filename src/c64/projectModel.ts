export type C64Color =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type C64VisibleCellColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MulticolorPixel = 0 | 1 | 2 | 3;

export interface CharacterData {
  pixels: MulticolorPixel[][];
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
  metadata?: {
    name?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export const PROJECT_VERSION = 1;
export const CHARACTER_COUNT = 256;
export const TILE_COUNT = 256;

export function createEmptyCharacter(): CharacterData {
  return {
    pixels: Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => 0 as MulticolorPixel)),
    defaultVisibleColor: 1,
  };
}

export function createEmptyTile(tileWidth: number, tileHeight: number): TileDefinition {
  return {
    characterIndexes: Array.from({ length: tileWidth * tileHeight }, () => 0),
  };
}

export function createNewProject(tileWidth = 2, tileHeight = 2): ProjectData {
  return {
    version: PROJECT_VERSION,
    d021Background: 0,
    d022Multicolor1: 5,
    d023Multicolor2: 14,
    characters: Array.from({ length: CHARACTER_COUNT }, () => createEmptyCharacter()),
    tiles: Array.from({ length: TILE_COUNT }, () => createEmptyTile(tileWidth, tileHeight)),
    tileWidth,
    tileHeight,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function cloneProject(project: ProjectData): ProjectData {
  return structuredClone(project);
}
