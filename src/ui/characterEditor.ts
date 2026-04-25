import type { C64VisibleCellColor, MulticolorPixel, ProjectData } from '../c64/projectModel';
import { C64_PALETTE } from '../c64/palette';
import { clearCanvas, drawCharacterToCanvas, mapLogicalPixelToColor } from './canvasHelpers';

export interface CharacterEditorActions {
  onChangePixel: (x: number, y: number, value: MulticolorPixel) => void;
  onSetActiveValue: (value: MulticolorPixel) => void;
  onSetDefaultVisibleColor: (value: C64VisibleCellColor) => void;
  onCopyCharacter: () => void;
  onPasteCharacter: () => void;
  onClearCharacter: () => void;
  onMirrorHorizontal: () => void;
  onMirrorVertical: () => void;
}

export class CharacterEditor {
  readonly element: HTMLElement;
  private readonly editCanvas: HTMLCanvasElement;
  private readonly previewCanvas: HTMLCanvasElement;
  private readonly activeValueSelect: HTMLSelectElement;
  private readonly visibleColorSelect: HTMLSelectElement;
  private drawing = false;

  constructor(
    private readonly project: () => ProjectData,
    private readonly selectedCharacter: () => number,
    private readonly activeValue: () => MulticolorPixel,
    private readonly actions: CharacterEditorActions,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Character Editor';

    this.editCanvas = document.createElement('canvas');
    this.editCanvas.width = 240;
    this.editCanvas.height = 480;
    this.editCanvas.className = 'editor-canvas';

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = 160;
    this.previewCanvas.height = 160;
    this.previewCanvas.className = 'editor-canvas';

    this.activeValueSelect = document.createElement('select');
    ['00 / D021', '01 / D022', '10 / D023', '11 / per-cell colour'].forEach((label, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${index}: ${label}`;
      this.activeValueSelect.append(option);
    });
    this.activeValueSelect.addEventListener('change', () => {
      this.actions.onSetActiveValue(Number(this.activeValueSelect.value) as MulticolorPixel);
    });

    this.visibleColorSelect = document.createElement('select');
    C64_PALETTE.slice(0, 8).forEach((entry) => {
      const option = document.createElement('option');
      option.value = String(entry.index);
      option.textContent = `${entry.index} ${entry.name}`;
      this.visibleColorSelect.append(option);
    });
    this.visibleColorSelect.addEventListener('change', () => {
      this.actions.onSetDefaultVisibleColor(Number(this.visibleColorSelect.value) as C64VisibleCellColor);
    });

    const info = document.createElement('p');
    info.className = 'hint';
    info.textContent = 'Per-cell visible colour is limited to 0..7 in multicolour mode. Colour RAM export writes visible+8 (8..15).';

    const controlBar = document.createElement('div');
    controlBar.className = 'control-row';
    controlBar.append(
      labelWrap('Active draw value', this.activeValueSelect),
      labelWrap('Default visible colour (0..7)', this.visibleColorSelect),
      actionButton('Copy', this.actions.onCopyCharacter),
      actionButton('Paste', this.actions.onPasteCharacter),
      actionButton('Clear', this.actions.onClearCharacter),
      actionButton('Mirror H', this.actions.onMirrorHorizontal),
      actionButton('Mirror V', this.actions.onMirrorVertical),
    );

    const canvasRow = document.createElement('div');
    canvasRow.className = 'canvas-row';
    canvasRow.append(this.editCanvas, this.previewCanvas);

    this.element.append(heading, controlBar, canvasRow, info);

    this.setupPointerHandling();
  }

  private setupPointerHandling(): void {
    this.editCanvas.addEventListener('contextmenu', (event) => event.preventDefault());

    this.editCanvas.addEventListener('pointerdown', (event) => {
      this.drawing = true;
      this.applyPointer(event);
    });
    window.addEventListener('pointerup', () => {
      this.drawing = false;
    });
    this.editCanvas.addEventListener('pointermove', (event) => {
      if (!this.drawing) return;
      this.applyPointer(event);
    });
  }

  private applyPointer(event: PointerEvent): void {
    const rect = this.editCanvas.getBoundingClientRect();
    const cellW = this.editCanvas.width / 4;
    const cellH = this.editCanvas.height / 8;
    const x = Math.floor((event.clientX - rect.left) / cellW);
    const y = Math.floor((event.clientY - rect.top) / cellH);
    if (x < 0 || x >= 4 || y < 0 || y >= 8) return;

    const project = this.project();
    const selectedChar = project.characters[this.selectedCharacter()];

    if (event.button === 2) {
      this.actions.onSetActiveValue(selectedChar.pixels[y][x]);
      return;
    }

    this.actions.onChangePixel(x, y, this.activeValue());
  }

  render(): void {
    const project = this.project();
    const char = project.characters[this.selectedCharacter()];

    this.activeValueSelect.value = String(this.activeValue());
    this.visibleColorSelect.value = String(char.defaultVisibleColor);

    const ctx = clearCanvas(this.editCanvas);
    const cellW = this.editCanvas.width / 4;
    const cellH = this.editCanvas.height / 8;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        ctx.fillStyle = mapLogicalPixelToColor(char.pixels[y][x], char.defaultVisibleColor, project);
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
        ctx.strokeStyle = '#262b36';
        ctx.strokeRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
      }
    }

    const previewCtx = clearCanvas(this.previewCanvas);
    drawCharacterToCanvas(previewCtx, char, project, 16, 16, 16, true);
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
