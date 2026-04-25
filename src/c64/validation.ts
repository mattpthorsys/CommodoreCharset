import {
  CHARACTER_COUNT,
  CHARACTER_ROWS,
  characterColumnsForMode,
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
  if (!project.map || typeof project.map !== 'object') warnings.push('Project must contain map data.');
  if (project.map && (!Number.isInteger(project.map.width) || project.map.width < 1)) warnings.push('Map width must be a positive integer.');
  if (project.map && (!Number.isInteger(project.map.height) || project.map.height < 1)) warnings.push('Map height must be a positive integer.');
  if (project.map && (!Array.isArray(project.map.rooms) || project.map.rooms.length < 1)) warnings.push('Map must contain at least one room.');
  if (!Array.isArray(project.characters) || project.characters.length !== CHARACTER_COUNT) warnings.push('Project must contain 256 characters.');
  if (!Array.isArray(project.tiles) || project.tiles.length !== TILE_COUNT) warnings.push('Project must contain 256 tiles.');

  project.characters?.forEach((character, index) => {
    if (character.mode !== 'multicolor' && character.mode !== 'hires') warnings.push(`Character ${index} mode must be multicolor or hires.`);
    if (!isIntInRange(character.defaultVisibleColor, 0, 7)) warnings.push(`Character ${index} visible colour must be 0..7.`);
    if (!Array.isArray(character.pixels) || character.pixels.length !== CHARACTER_ROWS) {
      warnings.push(`Character ${index} must contain 8 rows.`);
      return;
    }
    const mode = character.mode === 'hires' ? 'hires' : 'multicolor';
    const columns = characterColumnsForMode(mode);
    const maxPixel = mode === 'hires' ? 1 : 3;
    character.pixels.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== columns) warnings.push(`Character ${index}, row ${rowIndex} must contain ${columns} pixels.`);
      row.forEach((pixel, columnIndex) => {
        if (!isIntInRange(pixel, 0, maxPixel)) warnings.push(`Character ${index}, row ${rowIndex}, column ${columnIndex} must be 0..${maxPixel}.`);
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
    if (!Array.isArray(tile.cellModes) || tile.cellModes.length !== tileLength) {
      warnings.push(`Tile ${index} must contain ${tileLength} cell display modes.`);
      return;
    }
    tile.cellModes.forEach((mode, cellIndex) => {
      if (mode !== 'multicolor' && mode !== 'hires') warnings.push(`Tile ${index}, cell ${cellIndex} mode must be multicolor or hires.`);
    });
  });

  const mapLength = (project.map?.width ?? 0) * (project.map?.height ?? 0);
  project.map?.rooms?.forEach((room, roomIndex) => {
    if (!Array.isArray(room.tileIndexes) || room.tileIndexes.length !== mapLength) {
      warnings.push(`Map room ${roomIndex} must contain ${mapLength} tile indexes.`);
      return;
    }
    room.tileIndexes.forEach((tileIndex, cellIndex) => {
      if (!isIntInRange(tileIndex, 0, 255)) warnings.push(`Map room ${roomIndex}, cell ${cellIndex} must reference tile 0..255.`);
    });
  });

  return warnings;
}
