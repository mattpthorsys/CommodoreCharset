import type { ProjectData } from '../c64/projectModel';
import { drawCharacterC64, setupCanvas } from './canvasHelpers';
import { button } from './toolbar';

export class TileEditor {
  readonly element = document.createElement('section');
  private readonly editorCanvas = document.createElement('canvas');
  private readonly previewCanvas = document.createElement('canvas');
  private readonly cellSize = 48;

  constructor(
    private getProject: () => ProjectData,
    private getSelectedTile: () => number,
    private getSelectedCharacter: () => number,
    private setSelectedCharacter: (index: number) => void,
    private commit: (label: string, mutator: (project: ProjectData) => void) => void,
    private setTileSize: (width: number, height: number) => void,
    private copyTile: () => void,
    private pasteTile: () => void,
  ) {
    this.element.className = 'panel tile-editor-panel';
    this.editorCanvas.className = 'tile-editor-canvas';
    this.previewCanvas.className = 'preview-canvas';
    this.editorCanvas.addEventListener('click', (event) => this.handleClick(event));
  }

  render(): void {
    this.element.innerHTML = '';
    const project = this.getProject();
    const selectedTile = this.getSelectedTile();

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<h2>Tile ${selectedTile}</h2>`;

    const dimensions = document.createElement('div');
    dimensions.className = 'tool-row';
    const widthInput = this.numberInput(project.tileWidth);
    const heightInput = this.numberInput(project.tileHeight);
    const applySize = button('Apply size', () => this.setTileSize(Number(widthInput.value), Number(heightInput.value)));
    dimensions.append('Width', widthInput, 'Height', heightInput, applySize);

    const tools = document.createElement('div');
    tools.className = 'tool-row';
    tools.append(
      button('Copy Tile', this.copyTile),
      button('Paste Tile', this.pasteTile),
      button('Clear Tile', () => this.commit('clear tile', (next) => {
        next.tiles[selectedTile].characterIndexes.fill(0);
      })),
    );

    const canvases = document.createElement('div');
    canvases.className = 'editor-canvases';
    const editWrap = document.createElement('div');
    editWrap.append(this.label('Click cells to assign selected character. Shift+click selects the cell character.'), this.editorCanvas);
    const previewWrap = document.createElement('div');
    previewWrap.append(this.label('Tile preview'), this.previewCanvas);
    canvases.append(editWrap, previewWrap);

    this.element.append(header, dimensions, tools, canvases);
    this.drawCanvases();
  }

  drawCanvases(): void {
    const project = this.getProject();
    const tile = project.tiles[this.getSelectedTile()];
    const width = project.tileWidth * this.cellSize;
    const height = project.tileHeight * this.cellSize;
    const ctx = setupCanvas(this.editorCanvas, width, height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    tile.characterIndexes.forEach((characterIndex, cellIndex) => {
      const x = cellIndex % project.tileWidth;
      const y = Math.floor(cellIndex / project.tileWidth);
      drawCharacterC64(ctx, project.characters[characterIndex], project, x * this.cellSize + 4, y * this.cellSize + 4, 5);
      ctx.strokeStyle = '#5a5a5a';
      ctx.strokeRect(x * this.cellSize + 0.5, y * this.cellSize + 0.5, this.cellSize - 1, this.cellSize - 1);
      ctx.fillStyle = '#f6f6f6';
      ctx.font = '11px system-ui';
      ctx.fillText(String(characterIndex).padStart(3, '0'), x * this.cellSize + 4, y * this.cellSize + this.cellSize - 5);
    });

    const previewScale = 10;
    const previewWidth = project.tileWidth * 8 * previewScale;
    const previewHeight = project.tileHeight * 8 * previewScale;
    const previewCtx = setupCanvas(this.previewCanvas, previewWidth, previewHeight);
    previewCtx.fillStyle = '#101010';
    previewCtx.fillRect(0, 0, previewWidth, previewHeight);
    tile.characterIndexes.forEach((characterIndex, cellIndex) => {
      const x = cellIndex % project.tileWidth;
      const y = Math.floor(cellIndex / project.tileWidth);
      drawCharacterC64(previewCtx, project.characters[characterIndex], project, x * 8 * previewScale, y * 8 * previewScale, previewScale);
    });
  }

  private numberInput(value: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '8';
    input.value = String(value);
    return input;
  }

  private label(text: string): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'canvas-label';
    label.textContent = text;
    return label;
  }

  private handleClick(event: MouseEvent): void {
    const project = this.getProject();
    const rect = this.editorCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / this.cellSize);
    const y = Math.floor((event.clientY - rect.top) / this.cellSize);
    if (x < 0 || y < 0 || x >= project.tileWidth || y >= project.tileHeight) return;
    const cellIndex = y * project.tileWidth + x;
    const tileIndex = this.getSelectedTile();
    if (event.shiftKey) {
      this.setSelectedCharacter(project.tiles[tileIndex].characterIndexes[cellIndex]);
      return;
    }
    const characterIndex = this.getSelectedCharacter();
    if (project.tiles[tileIndex].characterIndexes[cellIndex] === characterIndex) return;
    this.commit('assign tile character', (next) => {
      next.tiles[tileIndex].characterIndexes[cellIndex] = characterIndex;
    });
  }
}
