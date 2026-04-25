import type { ProjectData } from '../c64/projectModel';
import { clearCanvas, drawCharacterToCanvas } from './canvasHelpers';

export class CharacterGrid {
  readonly element: HTMLCanvasElement;
  private readonly cellSize = 16;

  constructor(
    private readonly project: () => ProjectData,
    private readonly selectedCharacter: () => number,
    private readonly onSelect: (index: number) => void,
  ) {
    this.element = document.createElement('canvas');
    this.element.width = 16 * this.cellSize;
    this.element.height = 16 * this.cellSize;
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
    const ctx = clearCanvas(this.element, '#11131a');
    const project = this.project();
    for (let i = 0; i < 256; i += 1) {
      const x = (i % 16) * this.cellSize;
      const y = Math.floor(i / 16) * this.cellSize;
      drawCharacterToCanvas(ctx, project.characters[i], project, x, y, 2, true);
      ctx.strokeStyle = i === this.selectedCharacter() ? '#ffcc00' : '#2e3440';
      ctx.strokeRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);
    }
  }
}
