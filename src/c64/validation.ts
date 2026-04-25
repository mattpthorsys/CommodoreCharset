import type { ProjectData } from './projectModel';
import { CHARACTER_COUNT, TILE_COUNT } from './projectModel';

export function validateProject(project: ProjectData): string[] {
  const errors: string[] = [];

  if (project.characters.length !== CHARACTER_COUNT) {
    errors.push(`characters must contain exactly ${CHARACTER_COUNT} entries`);
  }
  if (project.tiles.length !== TILE_COUNT) {
    errors.push(`tiles must contain exactly ${TILE_COUNT} entries`);
  }

  if (!Number.isInteger(project.tileWidth) || project.tileWidth <= 0) {
    errors.push('tileWidth must be a positive integer');
  }
  if (!Number.isInteger(project.tileHeight) || project.tileHeight <= 0) {
    errors.push('tileHeight must be a positive integer');
  }

  for (const [name, value] of [
    ['d021Background', project.d021Background],
    ['d022Multicolor1', project.d022Multicolor1],
    ['d023Multicolor2', project.d023Multicolor2],
  ] as const) {
    if (!Number.isInteger(value) || value < 0 || value > 15) {
      errors.push(`${name} must be 0..15`);
    }
  }

  project.characters.forEach((char, index) => {
    if (char.pixels.length !== 8) {
      errors.push(`character ${index} must have 8 rows`);
      return;
    }
    char.pixels.forEach((row, y) => {
      if (row.length !== 4) {
        errors.push(`character ${index} row ${y} must have 4 pixels`);
        return;
      }
      row.forEach((pixel, x) => {
        if (!Number.isInteger(pixel) || pixel < 0 || pixel > 3) {
          errors.push(`character ${index} row ${y} col ${x} pixel must be 0..3`);
        }
      });
    });
    if (!Number.isInteger(char.defaultVisibleColor) || char.defaultVisibleColor < 0 || char.defaultVisibleColor > 7) {
      errors.push(`character ${index} defaultVisibleColor must be 0..7`);
    }
  });

  const requiredTileCells = project.tileWidth * project.tileHeight;
  project.tiles.forEach((tile, index) => {
    if (tile.characterIndexes.length !== requiredTileCells) {
      errors.push(`tile ${index} must have ${requiredTileCells} character indexes`);
      return;
    }
    tile.characterIndexes.forEach((charIndex, cellIndex) => {
      if (!Number.isInteger(charIndex) || charIndex < 0 || charIndex > 255) {
        errors.push(`tile ${index} cell ${cellIndex} character index must be 0..255`);
      }
    });
  });

  return errors;
}
