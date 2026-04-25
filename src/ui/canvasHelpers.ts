import { colorHex } from '../c64/palette';
import type { CharacterData, ProjectData } from '../c64/projectModel';

export function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function logicalColor(project: ProjectData, character: CharacterData, value: number): string {
  if (value === 0) return colorHex(project.d021Background);
  if (value === 1) return colorHex(project.d022Multicolor1);
  if (value === 2) return colorHex(project.d023Multicolor2);
  return colorHex(character.defaultVisibleColor);
}

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
}

export function drawCharacterLogical(
  ctx: CanvasRenderingContext2D,
  character: CharacterData,
  project: ProjectData,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
  showGrid: boolean,
): void {
  character.pixels.forEach((row, rowIndex) => {
    row.forEach((pixel, columnIndex) => {
      ctx.fillStyle = logicalColor(project, character, pixel);
      ctx.fillRect(x + columnIndex * cellWidth, y + rowIndex * cellHeight, cellWidth, cellHeight);
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.strokeRect(x + columnIndex * cellWidth + 0.5, y + rowIndex * cellHeight + 0.5, cellWidth, cellHeight);
      }
    });
  });
}

export function drawCharacterC64(
  ctx: CanvasRenderingContext2D,
  character: CharacterData,
  project: ProjectData,
  x: number,
  y: number,
  pixelSize: number,
): void {
  character.pixels.forEach((row, rowIndex) => {
    row.forEach((pixel, columnIndex) => {
      ctx.fillStyle = logicalColor(project, character, pixel);
      ctx.fillRect(x + columnIndex * pixelSize * 2, y + rowIndex * pixelSize, pixelSize * 2, pixelSize);
    });
  });
}
