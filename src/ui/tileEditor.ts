import type { ProjectData } from '../c64/projectModel';
import { clearCanvas, drawCharacterToCanvas } from './canvasHelpers';

export interface TileEditorActions {
  onSetDimensions: (w: number, h: number) => void;
  onAssignCharacter: (tileCell: number) => void;
  onSelectCharacterFromTile: (charIndex: number) => void;
  onCopyTile: () => void;
  onPasteTile: () => void;
  onClearTile: () => void;
}

export class TileEditor {
  readonly element: HTMLElement;
  private readonly editCanvas: HTMLCanvasElement;
  private readonly previewCanvas: HTMLCanvasElement;
  private readonly widthInput: HTMLInputElement;
  private readonly heightInput: HTMLInputElement;

  constructor(
    private readonly project: () => ProjectData,
    private readonly selectedTile: () => number,
    private readonly selectedCharacter: () => number,
    private readonly actions: TileEditorActions,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Tile Editor';

    this.widthInput = numericInput(1, 16);
    this.heightInput = numericInput(1, 16);
    this.widthInput.addEventListener('change', () => this.emitSizeChange());
    this.heightInput.addEventListener('change', () => this.emitSizeChange());

    this.editCanvas = document.createElement('canvas');
    this.editCanvas.width = 320;
    this.editCanvas.height = 320;
    this.editCanvas.className = 'editor-canvas';

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = 320;
    this.previewCanvas.height = 160;
    this.previewCanvas.className = 'editor-canvas';

    this.editCanvas.addEventListener('click', (event) => this.handleTileCanvasClick(event));

    const controls = document.createElement('div');
    controls.className = 'control-row';
    controls.append(
      labelWrap('Tile width (chars)', this.widthInput),
      labelWrap('Tile height (chars)', this.heightInput),
      actionButton('Copy tile', this.actions.onCopyTile),
      actionButton('Paste tile', this.actions.onPasteTile),
      actionButton('Clear tile', this.actions.onClearTile),
    );

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Click tile cell to assign selected character. Shift+click tile cell selects character in main editor.';

    const canvasRow = document.createElement('div');
    canvasRow.className = 'canvas-row';
    canvasRow.append(this.editCanvas, this.previewCanvas);

    this.element.append(heading, controls, canvasRow, hint);
  }

  private emitSizeChange(): void {
    const width = Number(this.widthInput.value);
    const height = Number(this.heightInput.value);
    this.actions.onSetDimensions(width, height);
  }

  private handleTileCanvasClick(event: MouseEvent): void {
    const project = this.project();
    const rect = this.editCanvas.getBoundingClientRect();
    const cellSize = Math.min(this.editCanvas.width / project.tileWidth, this.editCanvas.height / project.tileHeight);
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);
    if (x < 0 || x >= project.tileWidth || y < 0 || y >= project.tileHeight) return;
    const cell = y * project.tileWidth + x;

    if (event.shiftKey) {
      const tile = project.tiles[this.selectedTile()];
      this.actions.onSelectCharacterFromTile(tile.characterIndexes[cell]);
      return;
    }

    this.actions.onAssignCharacter(cell);
  }

  render(): void {
    const project = this.project();
    const tile = project.tiles[this.selectedTile()];

    this.widthInput.value = String(project.tileWidth);
    this.heightInput.value = String(project.tileHeight);

    const ctx = clearCanvas(this.editCanvas);
    const cellSize = Math.min(this.editCanvas.width / project.tileWidth, this.editCanvas.height / project.tileHeight);

    for (let y = 0; y < project.tileHeight; y += 1) {
      for (let x = 0; x < project.tileWidth; x += 1) {
        const cellIndex = y * project.tileWidth + x;
        const charIndex = tile.characterIndexes[cellIndex];
        ctx.fillStyle = '#0f1118';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        drawCharacterToCanvas(
          ctx,
          project.characters[charIndex],
          project,
          x * cellSize + 4,
          y * cellSize + 4,
          Math.max(2, Math.floor(cellSize / 12)),
          true,
        );

        ctx.strokeStyle = '#2e3440';
        ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
        ctx.fillStyle = '#c5d0e6';
        ctx.font = '12px monospace';
        ctx.fillText(String(charIndex), x * cellSize + 6, y * cellSize + cellSize - 6);
      }
    }

    const previewCtx = clearCanvas(this.previewCanvas);
    const scale = Math.max(1, Math.floor(Math.min(this.previewCanvas.width / (project.tileWidth * 8), this.previewCanvas.height / (project.tileHeight * 8))));
    for (let y = 0; y < project.tileHeight; y += 1) {
      for (let x = 0; x < project.tileWidth; x += 1) {
        const charIndex = tile.characterIndexes[y * project.tileWidth + x];
        drawCharacterToCanvas(previewCtx, project.characters[charIndex], project, x * 8 * scale, y * 8 * scale, scale, true);
      }
    }
  }
}

function labelWrap(label: string, control: HTMLElement): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'label-wrap';
  const span = document.createElement('span');
  span.textContent = label;
  wrapper.append(span, control);
  return wrapper;
}

function actionButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

function numericInput(min: number, max: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  return input;
}
