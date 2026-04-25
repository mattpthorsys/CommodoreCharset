import { drawCharacterC64, setupCanvas } from './canvasHelpers';
import type { ProjectData } from '../c64/projectModel';

export class TileGrid {
  readonly canvas = document.createElement('canvas');
  private cell = 24;

  constructor(private onSelect: (index: number) => void) {
    this.canvas.className = 'tile-grid';
    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / this.cell);
      const y = Math.floor((event.clientY - rect.top) / this.cell);
      this.onSelect(y * 16 + x);
    });
  }

  render(project: ProjectData, selectedIndex: number, zoom: 1 | 2 | 4): void {
    this.cell = Math.max(24, Math.max(project.tileWidth * 8, project.tileHeight * 8) * zoom + 8);
    const size = this.cell * 16;
    const ctx = setupCanvas(this.canvas, size, size);
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, size, size);
    project.tiles.forEach((tile, tileIndex) => {
      const x = (tileIndex % 16) * this.cell;
      const y = Math.floor(tileIndex / 16) * this.cell;
      tile.characterIndexes.forEach((characterIndex, cellIndex) => {
        const cx = cellIndex % project.tileWidth;
        const cy = Math.floor(cellIndex / project.tileWidth);
        drawCharacterC64(ctx, project.characters[characterIndex], project, x + 4 + cx * 8 * zoom, y + 4 + cy * 8 * zoom, zoom, tile.cellModes[cellIndex] ?? project.characters[characterIndex].mode);
      });
      ctx.strokeStyle = tileIndex === selectedIndex ? '#ffffff' : '#3a3a3a';
      ctx.lineWidth = tileIndex === selectedIndex ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1);
    });
  }
}
