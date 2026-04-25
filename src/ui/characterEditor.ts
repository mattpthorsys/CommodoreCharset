import { C64_PALETTE } from '../c64/palette';
import { CHARACTER_COLUMNS, CHARACTER_ROWS, type MulticolorPixel, type ProjectData } from '../c64/projectModel';
import { clearCanvas, drawCharacterC64, drawCharacterLogical, setupCanvas } from './canvasHelpers';
import { createColorSelect } from './colorSelect';
import { button } from './toolbar';

export class CharacterEditor {
  readonly element = document.createElement('section');
  private readonly editorCanvas = document.createElement('canvas');
  private readonly previewCanvas = document.createElement('canvas');
  private readonly cellHeight = 34;
  private readonly cellWidth = this.cellHeight * 2;
  private isPainting = false;

  constructor(
    private getProject: () => ProjectData,
    private getSelectedCharacter: () => number,
    private getActiveValue: () => MulticolorPixel,
    private setActiveValue: (value: MulticolorPixel) => void,
    private commit: (label: string, mutator: (project: ProjectData) => void) => void,
    private copyCharacter: () => void,
    private pasteCharacter: () => void,
  ) {
    this.element.className = 'panel character-editor-panel';
    this.editorCanvas.className = 'pixel-editor';
    this.previewCanvas.className = 'preview-canvas';
    this.editorCanvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.editorCanvas.addEventListener('pointerdown', (event) => this.handlePointer(event));
    this.editorCanvas.addEventListener('pointermove', (event) => {
      if (this.isPainting) this.handlePointer(event);
    });
    window.addEventListener('pointerup', () => {
      this.isPainting = false;
    });
  }

  render(): void {
    this.element.innerHTML = '';
    const project = this.getProject();
    const selected = this.getSelectedCharacter();
    const character = project.characters[selected];

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<h2>Character ${selected}</h2>`;

    const tools = document.createElement('div');
    tools.className = 'tool-row';
    tools.append(
      button('Copy', this.copyCharacter),
      button('Paste', this.pasteCharacter),
      button('Clear', () => this.commit('clear character', (next) => {
        next.characters[selected].pixels.forEach((row) => row.fill(0));
      })),
      button('Mirror H', () => this.commit('mirror character horizontally', (next) => {
        next.characters[selected].pixels = next.characters[selected].pixels.map((row) => [...row].reverse() as MulticolorPixel[]);
      })),
      button('Mirror V', () => this.commit('mirror character vertically', (next) => {
        next.characters[selected].pixels = [...next.characters[selected].pixels].reverse();
      })),
    );

    const visible = document.createElement('div');
    visible.className = 'colour-control';
    visible.append('Per-cell colour 0..7 ');
    visible.append(createColorSelect(C64_PALETTE.slice(0, 8), character.defaultVisibleColor, (value) => {
      this.commit('set character visible colour', (next) => {
        next.characters[selected].defaultVisibleColor = value;
      });
    }));

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Colour RAM visible colours are limited to 0..7; C64 export writes visible colour + 8 for multicolour cells.';

    const canvases = document.createElement('div');
    canvases.className = 'editor-canvases';
    const editWrap = document.createElement('div');
    editWrap.append(this.label('Logical 4x8 edit grid'), this.editorCanvas);
    const previewWrap = document.createElement('div');
    previewWrap.append(this.label('True 8x8 C64 preview'), this.previewCanvas);
    canvases.append(editWrap, previewWrap);

    this.element.append(header, tools, visible, hint, canvases);
    this.drawCanvases();
  }

  drawCanvases(): void {
    const project = this.getProject();
    const character = project.characters[this.getSelectedCharacter()];
    const editWidth = CHARACTER_COLUMNS * this.cellWidth;
    const editHeight = CHARACTER_ROWS * this.cellHeight;
    const editCtx = setupCanvas(this.editorCanvas, editWidth, editHeight);
    clearCanvas(editCtx, editWidth, editHeight);
    drawCharacterLogical(editCtx, character, project, 0, 0, this.cellWidth, this.cellHeight, true);

    const previewCtx = setupCanvas(this.previewCanvas, 160, 160);
    previewCtx.fillStyle = '#101010';
    previewCtx.fillRect(0, 0, 160, 160);
    drawCharacterC64(previewCtx, character, project, 16, 16, 16);
  }

  private label(text: string): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'canvas-label';
    label.textContent = text;
    return label;
  }

  private handlePointer(event: PointerEvent): void {
    const rect = this.editorCanvas.getBoundingClientRect();
    const column = Math.floor((event.clientX - rect.left) / this.cellWidth);
    const row = Math.floor((event.clientY - rect.top) / this.cellHeight);
    if (column < 0 || column >= CHARACTER_COLUMNS || row < 0 || row >= CHARACTER_ROWS) return;
    const selected = this.getSelectedCharacter();
    if (event.button === 2) {
      this.setActiveValue(this.getProject().characters[selected].pixels[row][column]);
      return;
    }
    if (event.button !== 0 && event.buttons !== 1) return;
    this.isPainting = true;
    const value = this.getActiveValue();
    if (this.getProject().characters[selected].pixels[row][column] === value) return;
    this.commit('paint character pixel', (next) => {
      next.characters[selected].pixels[row][column] = value;
    });
  }
}
