import {
  assertProjectForExport,
  exportCharacterColourRamBytes,
  exportCharacterVisibleColours,
  exportCharsetBinary,
  exportOscar64C,
  exportProjectJson,
  exportTilesFlat,
  exportTilesSeparated,
  importProjectJson,
} from '../c64/exports';
import {
  cloneProject,
  createEmptyTile,
  createNewProject,
  type C64Color,
  type C64VisibleCellColor,
  type MulticolorPixel,
  type ProjectData,
  type TileDefinition,
} from '../c64/projectModel';
import { validateProject } from '../c64/validation';
import { loadProjectFromLocalStorage, saveProjectToLocalStorage } from '../storage/localStorage';
import { CharacterEditor } from './characterEditor';
import { CharacterGrid } from './characterGrid';
import { TileEditor } from './tileEditor';
import { TileGrid } from './tileGrid';
import { createToolbar } from './toolbar';
import { C64_PALETTE } from '../c64/palette';

export class App {
  private project: ProjectData = loadProjectFromLocalStorage() ?? createNewProject();
  private selectedCharacterIndex = 0;
  private selectedTileIndex = 0;
  private activeDrawValue: MulticolorPixel = 3;
  private dirty = false;

  private readonly undoStack: ProjectData[] = [];
  private readonly redoStack: ProjectData[] = [];
  private characterClipboard: ProjectData['characters'][number] | null = null;
  private tileClipboard: TileDefinition | null = null;

  private readonly root: HTMLElement;
  private readonly characterGrid: CharacterGrid;
  private readonly tileGrid: TileGrid;
  private readonly characterEditor: CharacterEditor;
  private readonly tileEditor: TileEditor;
  private readonly statusNode: HTMLElement;
  private readonly validationNode: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;

    const toolbar = createToolbar({
      onNewProject: () => this.newProject(),
      onLoadProject: () => this.loadProjectJson(),
      onSaveProject: () => this.saveProjectJson(),
      onExportCharset: () => this.exportBinary('charset.bin', exportCharsetBinary(this.project)),
      onExportCharacterColors: () => {
        this.exportBinary('character_visible_colours.bin', exportCharacterVisibleColours(this.project));
        this.exportBinary('character_colour_ram_bytes.bin', exportCharacterColourRamBytes(this.project));
      },
      onExportTilesFlat: () => this.exportBinary('tiles_flat.bin', exportTilesFlat(this.project)),
      onExportTilesSeparated: () => {
        const separated = exportTilesSeparated(this.project);
        Object.entries(separated).forEach(([name, bytes]) => this.exportBinary(name, bytes));
      },
      onExportOscar64: () => this.exportText('c64_assets.h', exportOscar64C(this.project)),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
    });

    this.characterGrid = new CharacterGrid(
      () => this.project,
      () => this.selectedCharacterIndex,
      (index) => {
        this.selectedCharacterIndex = index;
        this.render();
      },
    );

    this.tileGrid = new TileGrid(
      () => this.project,
      () => this.selectedTileIndex,
      (index) => {
        this.selectedTileIndex = index;
        this.render();
      },
    );

    this.characterEditor = new CharacterEditor(
      () => this.project,
      () => this.selectedCharacterIndex,
      () => this.activeDrawValue,
      {
        onChangePixel: (x, y, value) => this.setCharacterPixel(x, y, value),
        onSetActiveValue: (value) => {
          this.activeDrawValue = value;
          this.render();
        },
        onSetDefaultVisibleColor: (value) => this.setCharacterVisibleColor(value),
        onCopyCharacter: () => {
          this.characterClipboard = structuredClone(this.currentCharacter());
        },
        onPasteCharacter: () => {
          if (!this.characterClipboard) return;
          this.mutateProject(() => {
            this.project.characters[this.selectedCharacterIndex] = structuredClone(this.characterClipboard!);
          });
        },
        onClearCharacter: () => {
          this.mutateProject(() => {
            const char = this.currentCharacter();
            for (let y = 0; y < 8; y += 1) for (let x = 0; x < 4; x += 1) char.pixels[y][x] = 0;
          });
        },
        onMirrorHorizontal: () => {
          this.mutateProject(() => {
            const char = this.currentCharacter();
            char.pixels = char.pixels.map((row) => [...row].reverse() as MulticolorPixel[]);
          });
        },
        onMirrorVertical: () => {
          this.mutateProject(() => {
            const char = this.currentCharacter();
            char.pixels = [...char.pixels].reverse();
          });
        },
      },
    );

    this.tileEditor = new TileEditor(
      () => this.project,
      () => this.selectedTileIndex,
      () => this.selectedCharacterIndex,
      {
        onSetDimensions: (w, h) => this.setTileDimensions(w, h),
        onAssignCharacter: (tileCell) => {
          this.mutateProject(() => {
            const tile = this.currentTile();
            tile.characterIndexes[tileCell] = this.selectedCharacterIndex;
          });
        },
        onSelectCharacterFromTile: (charIndex) => {
          this.selectedCharacterIndex = charIndex;
          this.render();
        },
        onCopyTile: () => {
          this.tileClipboard = structuredClone(this.currentTile());
        },
        onPasteTile: () => {
          if (!this.tileClipboard) return;
          this.mutateProject(() => {
            this.project.tiles[this.selectedTileIndex] = structuredClone(this.tileClipboard!);
          });
        },
        onClearTile: () => {
          this.mutateProject(() => {
            this.project.tiles[this.selectedTileIndex] = createEmptyTile(this.project.tileWidth, this.project.tileHeight);
          });
        },
      },
    );

    const palettePanel = this.buildPalettePanel();

    this.statusNode = document.createElement('div');
    this.statusNode.className = 'status';

    this.validationNode = document.createElement('div');
    this.validationNode.className = 'validation';

    const layout = document.createElement('div');
    layout.className = 'layout';

    const charSection = document.createElement('section');
    charSection.className = 'split-section';
    charSection.append(this.characterGrid.element, this.characterEditor.element);

    const tileSection = document.createElement('section');
    tileSection.className = 'split-section';
    tileSection.append(this.tileGrid.element, this.tileEditor.element);

    layout.append(charSection, tileSection);

    this.root.append(toolbar, palettePanel, layout, this.statusNode, this.validationNode);
    this.render();
  }

  private buildPalettePanel(): HTMLElement {
    const panel = document.createElement('section');
    panel.className = 'palette-panel';

    const heading = document.createElement('h3');
    heading.textContent = 'Palette / VIC-II Registers';
    panel.append(heading);

    const row = document.createElement('div');
    row.className = 'control-row';

    row.append(
      this.paletteSelect('D021 background', this.project.d021Background, (value) => this.setRegisterColor('d021Background', value)),
      this.paletteSelect('D022 multicolour 1', this.project.d022Multicolor1, (value) => this.setRegisterColor('d022Multicolor1', value)),
      this.paletteSelect('D023 multicolour 2', this.project.d023Multicolor2, (value) => this.setRegisterColor('d023Multicolor2', value)),
    );

    panel.append(row);
    return panel;
  }

  private paletteSelect(label: string, initial: number, onChange: (value: C64Color) => void): HTMLElement {
    const select = document.createElement('select');
    C64_PALETTE.forEach((entry) => {
      const option = document.createElement('option');
      option.value = String(entry.index);
      option.textContent = `${entry.index} ${entry.name}`;
      if (entry.index === initial) option.selected = true;
      select.append(option);
    });
    select.addEventListener('change', () => onChange(Number(select.value) as C64Color));

    const wrapper = document.createElement('label');
    wrapper.className = 'label-wrap';
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(span, select);
    return wrapper;
  }

  private currentCharacter() {
    return this.project.characters[this.selectedCharacterIndex];
  }

  private currentTile() {
    return this.project.tiles[this.selectedTileIndex];
  }

  private setCharacterPixel(x: number, y: number, value: MulticolorPixel): void {
    this.mutateProject(() => {
      this.currentCharacter().pixels[y][x] = value;
    });
  }

  private setCharacterVisibleColor(value: C64VisibleCellColor): void {
    this.mutateProject(() => {
      this.currentCharacter().defaultVisibleColor = value;
    });
  }

  private setRegisterColor(name: 'd021Background' | 'd022Multicolor1' | 'd023Multicolor2', value: C64Color): void {
    this.mutateProject(() => {
      this.project[name] = value;
    });
  }

  private setTileDimensions(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return;
    if (width === this.project.tileWidth && height === this.project.tileHeight) return;

    this.mutateProject(() => {
      const oldWidth = this.project.tileWidth;
      const oldHeight = this.project.tileHeight;
      this.project.tileWidth = width;
      this.project.tileHeight = height;

      this.project.tiles = this.project.tiles.map((tile) => {
        const next = createEmptyTile(width, height);
        for (let y = 0; y < Math.min(oldHeight, height); y += 1) {
          for (let x = 0; x < Math.min(oldWidth, width); x += 1) {
            next.characterIndexes[y * width + x] = tile.characterIndexes[y * oldWidth + x];
          }
        }
        return next;
      });
    });
  }

  private mutateProject(fn: () => void): void {
    this.undoStack.push(cloneProject(this.project));
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    fn();
    this.project.metadata = {
      ...(this.project.metadata ?? {}),
      updatedAt: new Date().toISOString(),
    };
    this.dirty = true;
    saveProjectToLocalStorage(this.project);
    this.render();
  }

  private undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(cloneProject(this.project));
    this.project = previous;
    this.dirty = true;
    saveProjectToLocalStorage(this.project);
    this.render();
  }

  private redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(cloneProject(this.project));
    this.project = next;
    this.dirty = true;
    saveProjectToLocalStorage(this.project);
    this.render();
  }

  private newProject(): void {
    if (this.dirty && !window.confirm('Discard current project and create a new one?')) return;
    this.project = createNewProject(this.project.tileWidth, this.project.tileHeight);
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.dirty = false;
    saveProjectToLocalStorage(this.project);
    this.render();
  }

  private loadProjectJson(): void {
    if (this.dirty && !window.confirm('Replace current project with loaded JSON?')) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        this.project = importProjectJson(text);
        this.undoStack.length = 0;
        this.redoStack.length = 0;
        this.dirty = false;
        saveProjectToLocalStorage(this.project);
        this.render();
      } catch (error) {
        window.alert((error as Error).message);
      }
    });
    input.click();
  }

  private saveProjectJson(): void {
    this.exportText('project.json', exportProjectJson(this.project));
    this.dirty = false;
    this.render();
  }

  private exportBinary(name: string, data: Uint8Array): void {
    try {
      assertProjectForExport(this.project);
      const blob = new Blob([data], { type: 'application/octet-stream' });
      this.downloadBlob(name, blob);
    } catch (error) {
      window.alert((error as Error).message);
    }
  }

  private exportText(name: string, text: string): void {
    try {
      assertProjectForExport(this.project);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      this.downloadBlob(name, blob);
    } catch (error) {
      window.alert((error as Error).message);
    }
  }

  private downloadBlob(name: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private computeCharacterUsage(): number[] {
    const usage = Array.from({ length: 256 }, () => 0);
    this.project.tiles.forEach((tile) => {
      tile.characterIndexes.forEach((index) => {
        usage[index] += 1;
      });
    });
    return usage;
  }

  private renderStatus(): void {
    const usage = this.computeCharacterUsage();
    const selectedCharUsage = usage[this.selectedCharacterIndex] ?? 0;
    this.statusNode.textContent = `Selected character: ${this.selectedCharacterIndex} | Selected tile: ${this.selectedTileIndex} | Tile size: ${this.project.tileWidth}x${this.project.tileHeight} | Character usage count: ${selectedCharUsage} | Unsaved changes: ${this.dirty ? 'yes' : 'no'}`;

    const errors = validateProject(this.project);
    this.validationNode.innerHTML = '';
    if (errors.length > 0) {
      this.validationNode.textContent = `Validation warnings: ${errors.join(' | ')}`;
      this.validationNode.classList.add('error');
    } else {
      this.validationNode.textContent = 'Validation: OK';
      this.validationNode.classList.remove('error');
    }
  }

  render(): void {
    this.characterGrid.render();
    this.tileGrid.render();
    this.characterEditor.render();
    this.tileEditor.render();
    this.renderStatus();
  }
}
