import {
  CHARACTER_COLUMNS,
  CHARACTER_COUNT,
  CHARACTER_ROWS,
  TILE_COUNT,
  type ProjectData,
} from './projectModel';

export function validateProject(project: ProjectData): string[] {
  const warnings: string[] = [];
  const isIntInRange = (value: unknown, min: number, max: number) =>
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

  if (!isIntInRange(project.d021Background, 0, 15)) warnings.push('D021 must be 0..15.');
  if (project.projectName !== undefined && typeof project.projectName !== 'string') warnings.push('Project name must be text.');
  if (!isIntInRange(project.d022Multicolor1, 0, 15)) warnings.push('D022 must be 0..15.');
  if (!isIntInRange(project.d023Multicolor2, 0, 15)) warnings.push('D023 must be 0..15.');
  if (!Number.isInteger(project.tileWidth) || project.tileWidth < 1) warnings.push('Tile width must be a positive integer.');
  if (!Number.isInteger(project.tileHeight) || project.tileHeight < 1) warnings.push('Tile height must be a positive integer.');
  if (!Array.isArray(project.characters) || project.characters.length !== CHARACTER_COUNT) warnings.push('Project must contain 256 characters.');
  if (!Array.isArray(project.tiles) || project.tiles.length !== TILE_COUNT) warnings.push('Project must contain 256 tiles.');

  project.characters?.forEach((character, index) => {
    if (!isIntInRange(character.defaultVisibleColor, 0, 7)) warnings.push(`Character ${index} visible colour must be 0..7.`);
    if (!Array.isArray(character.pixels) || character.pixels.length !== CHARACTER_ROWS) {
      warnings.push(`Character ${index} must contain 8 rows.`);
      return;
    }
    character.pixels.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== CHARACTER_COLUMNS) warnings.push(`Character ${index}, row ${rowIndex} must contain 4 pixels.`);
      row.forEach((pixel, columnIndex) => {
        if (!isIntInRange(pixel, 0, 3)) warnings.push(`Character ${index}, row ${rowIndex}, column ${columnIndex} must be 0..3.`);
      });
    });
  });

  const tileLength = project.tileWidth * project.tileHeight;
  project.tiles?.forEach((tile, index) => {
    if (!Array.isArray(tile.characterIndexes) || tile.characterIndexes.length !== tileLength) {
      warnings.push(`Tile ${index} must contain ${tileLength} character indexes.`);
      return;
    }
    tile.characterIndexes.forEach((characterIndex, cellIndex) => {
      if (!isIntInRange(characterIndex, 0, 255)) warnings.push(`Tile ${index}, cell ${cellIndex} must reference character 0..255.`);
    });
  });

  return warnings;
}
