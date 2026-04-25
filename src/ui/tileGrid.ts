import type { ProjectData } from '../c64/projectModel';
import { clearCanvas, drawCharacterToCanvas } from './canvasHelpers';

export class TileGrid {
  readonly element: HTMLCanvasElement;
  private readonly cellSize = 24;

  constructor(
    private readonly project: () => ProjectData,
    private readonly selectedTile: () => number,
    private readonly onSelect: (index: number) => void,
  ) {
    this.element = document.createElement('canvas');
    this.element.width = this.cellSize * 16;
    this.element.height = this.cellSize * 16;
    this.element.className = 'panel-canvas';
    this.element.addEventListener('click', (event) => {
      const rect = this.element.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / this.cellSize);
      const y = Math.floor((event.clientY - rect.top) / this.cellSize);
      const index = y * 16 + x;
      if (index >= 0 && index < 256) this.onSelect(index);
    });
  }

  render(): void {
    const project = this.project();
    const ctx = clearCanvas(this.element, '#11131a');
    const previewScale = 1;
    const maxWidth = project.tileWidth * 8;
    const maxHeight = project.tileHeight * 8;
    const tileScale = Math.max(1, Math.floor((this.cellSize - 4) / Math.max(maxWidth, maxHeight)));

    for (let i = 0; i < 256; i += 1) {
      const tile = project.tiles[i];
      const tileX = (i % 16) * this.cellSize;
      const tileY = Math.floor(i / 16) * this.cellSize;

      for (let cellY = 0; cellY < project.tileHeight; cellY += 1) {
        for (let cellX = 0; cellX < project.tileWidth; cellX += 1) {
          const charIndex = tile.characterIndexes[cellY * project.tileWidth + cellX];
          drawCharacterToCanvas(
            ctx,
            project.characters[charIndex],
            project,
            tileX + 2 + cellX * 8 * tileScale * previewScale,
            tileY + 2 + cellY * 8 * tileScale,
            tileScale,
            true,
          );
        }
      }

      ctx.strokeStyle = i === this.selectedTile() ? '#00d4ff' : '#2e3440';
      ctx.strokeRect(tileX + 0.5, tileY + 0.5, this.cellSize - 1, this.cellSize - 1);
    }
  }
}
