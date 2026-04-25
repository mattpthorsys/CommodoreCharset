import type { CharacterData, ProjectData } from '../c64/projectModel';
import { getPaletteHex } from '../c64/palette';

export function drawCharacterToCanvas(
  ctx: CanvasRenderingContext2D,
  character: CharacterData,
  project: ProjectData,
  x: number,
  y: number,
  logicalPixelSize: number,
  c64DoubleWidth = true,
): void {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const pixel = character.pixels[row][col];
      const color = mapLogicalPixelToColor(pixel, character.defaultVisibleColor, project);
      ctx.fillStyle = color;
      const width = c64DoubleWidth ? logicalPixelSize * 2 : logicalPixelSize;
      ctx.fillRect(x + col * width, y + row * logicalPixelSize, width, logicalPixelSize);
    }
  }
}

export function mapLogicalPixelToColor(pixel: number, charColor: number, project: ProjectData): string {
  if (pixel === 0) return getPaletteHex(project.d021Background);
  if (pixel === 1) return getPaletteHex(project.d022Multicolor1);
  if (pixel === 2) return getPaletteHex(project.d023Multicolor2);
  return getPaletteHex(charColor);
}

export function clearCanvas(canvas: HTMLCanvasElement, color = '#101218'): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot get canvas context');
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}
