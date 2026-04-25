import { exportCharsetBinary } from '../c64/encoding';
import {
  exportCharacterColourRamBytes,
  exportCharacterVisibleColours,
  exportOscar64Header,
  exportProjectJson,
  exportTileColourRamFlat,
  exportTileColourRamSeparated,
  exportTilesFlat,
  exportTilesSeparated,
  importProjectJson,
} from '../c64/exports';
import { C64_PALETTE } from '../c64/palette';
import { cloneProject, createNewProject, normalizeTileDimensions, type CellPixel, type MulticolorPixel, type ProjectData, type TileDefinition, type CharacterData } from '../c64/projectModel';
import { validateProject } from '../c64/validation';
import { loadStoredProject, saveStoredProject } from '../storage/localStorage';
import { CharacterEditor } from './characterEditor';
import { CharacterGrid } from './characterGrid';
import { createColorSelect } from './colorSelect';
import { MapEditor } from './mapEditor';
import { TileEditor } from './tileEditor';
import { TileGrid } from './tileGrid';
import { button, downloadBlob, filePicker } from './toolbar';

interface Snapshot {
  project: ProjectData;
  label: string;
}

export class App {
  private project = loadStoredProject();
  private activePanel: 'tileset' | 'map' = 'tileset';
  private selectedCharacter = 0;
  private selectedTile = 0;
  private tileGridZoom: 1 | 2 | 4 = 2;
  private activeValue: CellPixel = 3;
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
        const cellModes = (this.copiedTile!.cellModes ?? []).slice(0, length);
        while (cellModes.length < length) cellModes.push('multicolor');
        next.tiles[this.selectedTile] = { characterIndexes: indexes, cellModes };
      });
    },
  );
  private readonly mapEditor = new MapEditor(
    () => this.project,
    (label, mutator) => this.commit(label, mutator),
    () => this.filePrefix(),
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
    shell.append(this.renderToolbar(), this.renderTabs());
    if (this.activePanel === 'tileset') {
      shell.append(this.renderPalettePanel(), this.renderMainEditors());
    } else {
      this.mapEditor.render();
      shell.append(this.mapEditor.element);
    }
    shell.append(this.renderStatus());
    this.root.append(shell);
    if (this.activePanel === 'tileset') {
      this.characterGrid.render(this.project, this.selectedCharacter);
      this.tileGrid.render(this.project, this.selectedTile, this.tileGridZoom);
    }
  }

  private renderToolbar(): HTMLElement {
    const toolbar = document.createElement('header');
    toolbar.className = 'toolbar';
    const projectName = this.projectNameInput();
    toolbar.append(
      projectName,
      button('New Project', () => this.newProject()),
      button('Load JSON', () => this.loadJson()),
      button('Save JSON', () => downloadBlob(`${this.filePrefix()}.json`, exportProjectJson(this.project), 'application/json')),
      button('Export Charset', () => downloadBlob(`${this.filePrefix()}_charset.bin`, exportCharsetBinary(this.project))),
      button('Visible Colours', () => downloadBlob(`${this.filePrefix()}_character_visible_colours.bin`, exportCharacterVisibleColours(this.project))),
      button('Colour RAM', () => downloadBlob(`${this.filePrefix()}_character_colour_ram.bin`, exportCharacterColourRamBytes(this.project))),
      button('Tiles Flat', () => downloadBlob(`${this.filePrefix()}_tiles_flat.bin`, exportTilesFlat(this.project))),
      button('Tiles Separated', () => this.exportSeparated()),
      button('Tile Colour RAM', () => downloadBlob(`${this.filePrefix()}_tile_colour_ram_flat.bin`, exportTileColourRamFlat(this.project))),
      button('Tile Colour RAM Separated', () => this.exportColourRamSeparated()),
      button('Oscar64 .h', () => downloadBlob(`${this.filePrefix()}_oscar64.h`, exportOscar64Header(this.project), 'text/plain')),
      button('Undo', () => this.undo()),
      button('Redo', () => this.redo()),
    );
    return toolbar;
  }

  private renderTabs(): HTMLElement {
    const tabs = document.createElement('nav');
    tabs.className = 'editor-tabs';
    const tileset = button('Characters & Tiles', () => {
      this.activePanel = 'tileset';
      this.render();
    });
    const map = button('Map Editor', () => {
      this.activePanel = 'map';
      this.render();
    });
    tileset.classList.toggle('selected', this.activePanel === 'tileset');
    map.classList.toggle('selected', this.activePanel === 'map');
    tabs.append(tileset, map);
    return tabs;
  }

  private renderPalettePanel(): HTMLElement {
    const panel = document.createElement('section');
    panel.className = 'panel palette-panel';
    panel.append(this.globalColourSelect('D021 background', 'd021Background'));
    const selectedMode = this.project.characters[this.selectedCharacter].mode;
    panel.append(this.globalColourSelect('D022 multicolour 1', 'd022Multicolor1', selectedMode === 'hires'));
    panel.append(this.globalColourSelect('D023 multicolour 2', 'd023Multicolor2', selectedMode === 'hires'));

    const active = document.createElement('div');
    active.className = 'active-values';
    if (selectedMode === 'hires' && this.activeValue > 1) this.activeValue = 1;
    const labels = selectedMode === 'hires'
      ? ['0 / D021', '1 / per-cell', 'D022', 'D023']
      : ['00 / D021', '01 / D022', '10 / D023', '11 / per-cell'];
    labels.forEach((label, index) => {
      const control = button(label, () => {
        if (selectedMode === 'hires' && index > 1) return;
        this.activeValue = index as MulticolorPixel;
        this.render();
      });
      control.classList.toggle('selected', this.activeValue === index);
      control.disabled = selectedMode === 'hires' && index > 1;
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
    tileSide.append(this.heading('Tiles'), this.renderTileZoomControls(), this.tileGrid.canvas);
    this.tileEditor.render();
    main.append(characterSide, this.characterEditor.element, tileSide, this.tileEditor.element);
    return main;
  }

  private renderStatus(): HTMLElement {
    const status = document.createElement('footer');
    status.className = 'status';
    const usage = this.project.tiles.reduce((count, tile) => count + tile.characterIndexes.filter((index) => index === this.selectedCharacter).length, 0);
    const warnings = validateProject(this.project);
    status.textContent = `${this.project.projectName || 'Untitled Charset'} | Character ${this.selectedCharacter} | Tile ${this.selectedTile} | Tile size ${this.project.tileWidth}x${this.project.tileHeight} | Map ${this.project.map.width}x${this.project.map.height} x ${this.project.map.rooms.length} room(s) | Character usage ${usage} | ${warnings.length ? warnings[0] : 'Project valid'}`;
    return status;
  }

  private projectNameInput(): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'project-name-control';
    label.textContent = 'Project ';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.project.projectName || 'Untitled Charset';
    input.addEventListener('change', () => {
      const name = input.value.trim() || 'Untitled Charset';
      this.commit('set project name', (next) => {
        next.projectName = name;
      });
    });
    label.append(input);
    return label;
  }

  private renderTileZoomControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'tile-zoom-controls';
    controls.append('Preview ');
    ([1, 2, 4] as const).forEach((zoom) => {
      const control = button(`${zoom}x`, () => {
        this.tileGridZoom = zoom;
        this.render();
      });
      control.classList.toggle('selected', this.tileGridZoom === zoom);
      controls.append(control);
    });
    return controls;
  }

  private globalColourSelect(label: string, key: 'd021Background' | 'd022Multicolor1' | 'd023Multicolor2', disabled = false): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'colour-control';
    wrap.classList.toggle('disabled-control', disabled);
    wrap.textContent = `${label} `;
    wrap.append(createColorSelect(C64_PALETTE, this.project[key], (value) => {
      this.commit(`set ${label}`, (next) => {
        next[key] = value as ProjectData[typeof key];
      });
    }, disabled));
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
      imported.projectName = imported.projectName || 'Untitled Charset';
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
      downloadBlob(`${this.filePrefix()}_${file.filename}`, file.bytes);
    }
  }

  private exportColourRamSeparated(): void {
    for (const file of exportTileColourRamSeparated(this.project)) {
      downloadBlob(`${this.filePrefix()}_${file.filename}`, file.bytes);
    }
  }

  private filePrefix(): string {
    const safeName = (this.project.projectName || 'Untitled Charset')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return safeName || 'c64_project';
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
