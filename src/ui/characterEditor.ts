import { characterToBytes, decodeCharacterBytes } from '../c64/encoding';
import { C64_PALETTE } from '../c64/palette';
import { CHARACTER_ROWS, characterColumnsForMode, type CellDisplayMode, type CellPixel, type ProjectData } from '../c64/projectModel';
import { clearCanvas, drawCharacterC64, drawCharacterLogical, setupCanvas } from './canvasHelpers';
import { createColorSelect } from './colorSelect';
import { button } from './toolbar';

export class CharacterEditor {
  readonly element = document.createElement('section');
  private readonly editorCanvas = document.createElement('canvas');
  private readonly previewCanvas = document.createElement('canvas');
  private readonly cellHeight = 34;
  private isPainting = false;

  constructor(
    private getProject: () => ProjectData,
    private getSelectedCharacter: () => number,
    private getActiveValue: () => CellPixel,
    private setActiveValue: (value: CellPixel) => void,
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
      this.modeButton('Multicolour', 'multicolor', selected),
      this.modeButton('Hi-res', 'hires', selected),
      button('Clear', () => this.commit('clear character', (next) => {
        next.characters[selected].pixels.forEach((row) => row.fill(0));
      })),
      button('Mirror H', () => this.commit('mirror character horizontally', (next) => {
        next.characters[selected].pixels = next.characters[selected].pixels.map((row) => [...row].reverse() as CellPixel[]);
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
    hint.textContent = character.mode === 'hires'
      ? 'Hi-res cells use colour RAM colours 0..7 and draw 8 one-bit pixels per row.'
      : 'Multicolour cells use colour RAM visible colour + 8 and draw 4 two-bit pixels per row.';

    const canvases = document.createElement('div');
    canvases.className = 'editor-canvases';
    const editWrap = document.createElement('div');
    editWrap.append(this.label(`Logical ${characterColumnsForMode(character.mode)}x8 edit grid`), this.editorCanvas);
    const previewWrap = document.createElement('div');
    previewWrap.append(this.label('True 8x8 C64 preview'), this.previewCanvas);
    canvases.append(editWrap, previewWrap);

    this.element.append(header, tools, visible, hint, canvases);
    this.drawCanvases();
  }

  drawCanvases(): void {
    const project = this.getProject();
    const character = project.characters[this.getSelectedCharacter()];
    const cellWidth = this.cellWidth(character.mode);
    const editWidth = characterColumnsForMode(character.mode) * cellWidth;
    const editHeight = CHARACTER_ROWS * this.cellHeight;
    const editCtx = setupCanvas(this.editorCanvas, editWidth, editHeight);
    clearCanvas(editCtx, editWidth, editHeight);
    drawCharacterLogical(editCtx, character, project, 0, 0, cellWidth, this.cellHeight, true);

    const previewCtx = setupCanvas(this.previewCanvas, 160, 160);
    previewCtx.fillStyle = '#101010';
    previewCtx.fillRect(0, 0, 160, 160);
    drawCharacterC64(previewCtx, character, project, 16, 16, 16);
  }

  private modeButton(label: string, mode: CellDisplayMode, selected: number): HTMLButtonElement {
    const control = button(label, () => {
      const current = this.getProject().characters[selected];
      if (current.mode === mode) return;
      const bytes = characterToBytes(current);
      this.commit(`set character ${mode} mode`, (next) => {
        next.characters[selected].mode = mode;
        next.characters[selected].pixels = decodeCharacterBytes(Array.from(bytes), mode);
      });
      if (mode === 'hires' && this.getActiveValue() > 1) this.setActiveValue(1);
    });
    control.classList.toggle('selected', this.getProject().characters[selected].mode === mode);
    return control;
  }

  private label(text: string): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'canvas-label';
    label.textContent = text;
    return label;
  }

  private handlePointer(event: PointerEvent): void {
    const character = this.getProject().characters[this.getSelectedCharacter()];
    const cellWidth = this.cellWidth(character.mode);
    const rect = this.editorCanvas.getBoundingClientRect();
    const column = Math.floor((event.clientX - rect.left) / cellWidth);
    const row = Math.floor((event.clientY - rect.top) / this.cellHeight);
    if (column < 0 || column >= characterColumnsForMode(character.mode) || row < 0 || row >= CHARACTER_ROWS) return;
    const selected = this.getSelectedCharacter();
    if (event.button === 2) {
      this.setActiveValue(this.getProject().characters[selected].pixels[row][column]);
      return;
    }
    if (event.button !== 0 && event.buttons !== 1) return;
    this.isPainting = true;
    const value = (character.mode === 'hires' ? Math.min(this.getActiveValue(), 1) : this.getActiveValue()) as CellPixel;
    if (this.getProject().characters[selected].pixels[row][column] === value) return;
    this.commit('paint character pixel', (next) => {
      next.characters[selected].pixels[row][column] = value;
    });
  }

  private cellWidth(mode: CellDisplayMode): number {
    return mode === 'hires' ? this.cellHeight : this.cellHeight * 2;
  }
}
