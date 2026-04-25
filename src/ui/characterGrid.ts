import { drawCharacterC64, setupCanvas } from './canvasHelpers';
import type { ProjectData } from '../c64/projectModel';

export class CharacterGrid {
  readonly canvas = document.createElement('canvas');
  private readonly size = 384;
  private readonly cell = this.size / 16;

  constructor(private onSelect: (index: number) => void) {
    this.canvas.className = 'character-grid';
    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / this.cell);
      const y = Math.floor((event.clientY - rect.top) / this.cell);
      this.onSelect(y * 16 + x);
    });
  }

  render(project: ProjectData, selectedIndex: number): void {
    const ctx = setupCanvas(this.canvas, this.size, this.size);
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, this.size, this.size);
    project.characters.forEach((character, index) => {
      const x = (index % 16) * this.cell;
      const y = Math.floor(index / 16) * this.cell;
      drawCharacterC64(ctx, character, project, x + 2, y + 2, 2.5);
      ctx.strokeStyle = index === selectedIndex ? '#ffffff' : '#3a3a3a';
      ctx.lineWidth = index === selectedIndex ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1);
    });
  }
}
