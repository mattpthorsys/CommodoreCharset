import { exportCharsetBinary } from '../c64/encoding';
import {
  exportCharacterColourRamBytes,
  exportCharacterVisibleColours,
  exportOscar64Header,
  exportProjectJson,
  exportTilesFlat,
  exportTilesSeparated,
  importProjectJson,
} from '../c64/exports';
import { C64_PALETTE } from '../c64/palette';
import { cloneProject, createNewProject, normalizeTileDimensions, type MulticolorPixel, type ProjectData, type TileDefinition, type CharacterData } from '../c64/projectModel';
import { validateProject } from '../c64/validation';
import { loadStoredProject, saveStoredProject } from '../storage/localStorage';
import { CharacterEditor } from './characterEditor';
import { CharacterGrid } from './characterGrid';
import { TileEditor } from './tileEditor';
import { TileGrid } from './tileGrid';
import { button, downloadBlob, filePicker } from './toolbar';

interface Snapshot {
  project: ProjectData;
  label: string;
}

export class App {
  private project = loadStoredProject();
  private selectedCharacter = 0;
  private selectedTile = 0;
  private activeValue: MulticolorPixel = 3;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private dirty = false;
  private copiedCharacter: CharacterData | null = null;
  private copiedTile: TileDefinition | null = null;

  private readonly characterGrid = new CharacterGrid((index) => {
    this.selectedCharacter = index;
    this.render();
  });
  private readonly tileGrid = new TileGrid((index) => {
    this.selectedTile = index;
    this.render();
  });
  private readonly characterEditor = new CharacterEditor(
    () => this.project,
    () => this.selectedCharacter,
    () => this.activeValue,
    (value) => {
      this.activeValue = value;
      this.render();
    },
    (label, mutator) => this.commit(label, mutator),
    () => {
      this.copiedCharacter = cloneProject({ ...this.project, characters: [this.project.characters[this.selectedCharacter]], tiles: [] }).characters[0];
    },
    () => {
      if (!this.copiedCharacter) return;
      this.commit('paste character', (next) => {
        next.characters[this.selectedCharacter] = JSON.parse(JSON.stringify(this.copiedCharacter)) as CharacterData;
      });
    },
  );
  private readonly tileEditor = new TileEditor(
    () => this.project,
    () => this.selectedTile,
    () => this.selectedCharacter,
    (index) => {
      this.selectedCharacter = index;
      this.render();
    },
    (label, mutator) => this.commit(label, mutator),
    (width, height) => this.setTileSize(width, height),
    () => {
      this.copiedTile = JSON.parse(JSON.stringify(this.project.tiles[this.selectedTile])) as TileDefinition;
    },
    () => {
      if (!this.copiedTile) return;
      this.commit('paste tile', (next) => {
        const length = next.tileWidth * next.tileHeight;
        const indexes = this.copiedTile!.characterIndexes.slice(0, length);
        while (indexes.length < length) indexes.push(0);
        next.tiles[this.selectedTile] = { characterIndexes: indexes };
      });
    },
  );

  constructor(private readonly root: HTMLElement) {
    window.addEventListener('beforeunload', (event) => {
      if (!this.dirty) return;
      event.preventDefault();
    });
    this.render();
  }

  private render(): void {
    saveStoredProject(this.project);
    this.root.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    shell.append(this.renderToolbar(), this.renderPalettePanel(), this.renderMainEditors(), this.renderStatus());
    this.root.append(shell);
    this.characterGrid.render(this.project, this.selectedCharacter);
    this.tileGrid.render(this.project, this.selectedTile);
  }

  private renderToolbar(): HTMLElement {
    const toolbar = document.createElement('header');
    toolbar.className = 'toolbar';
    toolbar.append(
      button('New Project', () => this.newProject()),
      button('Load JSON', () => this.loadJson()),
      button('Save JSON', () => downloadBlob('c64-project.json', exportProjectJson(this.project), 'application/json')),
      button('Export Charset', () => downloadBlob('charset.bin', exportCharsetBinary(this.project))),
      button('Visible Colours', () => downloadBlob('character-visible-colours.bin', exportCharacterVisibleColours(this.project))),
      button('Colour RAM', () => downloadBlob('character-colour-ram.bin', exportCharacterColourRamBytes(this.project))),
      button('Tiles Flat', () => downloadBlob('tiles-flat.bin', exportTilesFlat(this.project))),
      button('Tiles Separated', () => this.exportSeparated()),
      button('Oscar64 .h', () => downloadBlob('c64_charset_export.h', exportOscar64Header(this.project), 'text/plain')),
      button('Undo', () => this.undo()),
      button('Redo', () => this.redo()),
    );
    return toolbar;
  }

  private renderPalettePanel(): HTMLElement {
    const panel = document.createElement('section');
    panel.className = 'panel palette-panel';
    panel.append(this.globalColourSelect('D021 background', 'd021Background'));
    panel.append(this.globalColourSelect('D022 multicolour 1', 'd022Multicolor1'));
    panel.append(this.globalColourSelect('D023 multicolour 2', 'd023Multicolor2'));

    const active = document.createElement('div');
    active.className = 'active-values';
    const labels = ['00 / D021', '01 / D022', '10 / D023', '11 / per-cell'];
    labels.forEach((label, index) => {
      const control = button(label, () => {
        this.activeValue = index as MulticolorPixel;
        this.render();
      });
      control.classList.toggle('selected', this.activeValue === index);
      active.append(control);
    });
    panel.append(active);
    return panel;
  }

  private renderMainEditors(): HTMLElement {
    const main = document.createElement('main');
    main.className = 'editor-layout';
    const characterSide = document.createElement('section');
    characterSide.className = 'grid-panel';
    characterSide.append(this.heading('Characters'), this.characterGrid.canvas);
    this.characterEditor.render();
    const tileSide = document.createElement('section');
    tileSide.className = 'grid-panel';
    tileSide.append(this.heading('Tiles'), this.tileGrid.canvas);
    this.tileEditor.render();
    main.append(characterSide, this.characterEditor.element, tileSide, this.tileEditor.element);
    return main;
  }

  private renderStatus(): HTMLElement {
    const status = document.createElement('footer');
    status.className = 'status';
    const usage = this.project.tiles.reduce((count, tile) => count + tile.characterIndexes.filter((index) => index === this.selectedCharacter).length, 0);
    const warnings = validateProject(this.project);
    status.textContent = `Character ${this.selectedCharacter} | Tile ${this.selectedTile} | Tile size ${this.project.tileWidth}x${this.project.tileHeight} | Character usage ${usage} | ${warnings.length ? warnings[0] : 'Project valid'}`;
    return status;
  }

  private globalColourSelect(label: string, key: 'd021Background' | 'd022Multicolor1' | 'd023Multicolor2'): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'colour-control';
    wrap.textContent = `${label} `;
    const select = document.createElement('select');
    C64_PALETTE.forEach((entry) => {
      const option = document.createElement('option');
      option.value = String(entry.index);
      option.textContent = `${entry.index} ${entry.name}`;
      select.append(option);
    });
    select.value = String(this.project[key]);
    select.addEventListener('change', () => {
      const value = Number(select.value);
      this.commit(`set ${label}`, (next) => {
        next[key] = value as ProjectData[typeof key];
      });
    });
    wrap.append(select);
    return wrap;
  }

  private heading(text: string): HTMLHeadingElement {
    const heading = document.createElement('h2');
    heading.textContent = text;
    return heading;
  }

  private commit(label: string, mutator: (project: ProjectData) => void): void {
    this.undoStack.push({ project: cloneProject(this.project), label });
    this.redoStack = [];
    const next = cloneProject(this.project);
    mutator(next);
    this.project = next;
    this.dirty = true;
    this.render();
  }

  private undo(): void {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return;
    this.redoStack.push({ project: cloneProject(this.project), label: snapshot.label });
    this.project = snapshot.project;
    this.dirty = true;
    this.render();
  }

  private redo(): void {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return;
    this.undoStack.push({ project: cloneProject(this.project), label: snapshot.label });
    this.project = snapshot.project;
    this.dirty = true;
    this.render();
  }

  private newProject(): void {
    if (this.dirty && !window.confirm('Discard unsaved changes and create a new project?')) return;
    this.project = createNewProject();
    this.undoStack = [];
    this.redoStack = [];
    this.selectedCharacter = 0;
    this.selectedTile = 0;
    this.dirty = false;
    this.render();
  }

  private loadJson(): void {
    if (this.dirty && !window.confirm('Replace the current project with the selected JSON file?')) return;
    filePicker('.json,application/json', (text) => {
      const imported = importProjectJson(text);
      const warnings = validateProject(imported);
      if (warnings.length) {
        window.alert(`Project JSON is invalid:\n${warnings.slice(0, 6).join('\n')}`);
        return;
      }
      this.project = imported;
      this.undoStack = [];
      this.redoStack = [];
      this.dirty = false;
      this.render();
    });
  }

  private exportSeparated(): void {
    for (const file of exportTilesSeparated(this.project)) {
      downloadBlob(file.filename, file.bytes);
    }
  }

  private setTileSize(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8 || height > 8) {
      window.alert('Tile width and height must be integers from 1 to 8.');
      return;
    }
    this.commit('set tile size', (next) => {
      const resized = normalizeTileDimensions(next, width, height);
      Object.assign(next, resized);
    });
  }
}
