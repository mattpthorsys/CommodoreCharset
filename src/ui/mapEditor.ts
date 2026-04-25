import {
  exportMapFlat,
  exportMapJson,
  exportMapRoomsSeparated,
  importMapJson,
} from '../c64/exports';
import { normalizeMapDimensions, type ProjectData } from '../c64/projectModel';
import { drawCharacterC64, setupCanvas } from './canvasHelpers';
import { button, downloadBlob, filePicker } from './toolbar';

export class MapEditor {
  readonly element = document.createElement('section');
  private readonly selectorCanvas = document.createElement('canvas');
  private readonly mapCanvas = document.createElement('canvas');
  private selectedTile = 0;
  private selectedRoom = 0;
  private zoom: 1 | 2 | 4 = 2;
  private isPainting = false;

  constructor(
    private getProject: () => ProjectData,
    private commit: (label: string, mutator: (project: ProjectData) => void) => void,
    private filePrefix: () => string,
  ) {
    this.element.className = 'map-editor-panel';
    this.selectorCanvas.className = 'map-tile-selector';
    this.mapCanvas.className = 'map-canvas';
    this.selectorCanvas.addEventListener('click', (event) => this.handleSelectorClick(event));
    this.mapCanvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.mapCanvas.addEventListener('pointerdown', (event) => this.handleMapPointer(event));
    this.mapCanvas.addEventListener('pointermove', (event) => {
      if (this.isPainting) this.handleMapPointer(event);
    });
    window.addEventListener('pointerup', () => {
      this.isPainting = false;
    });
  }

  render(): void {
    const project = this.getProject();
    if (this.selectedRoom >= project.map.rooms.length) this.selectedRoom = 0;
    this.element.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<h2>Map Editor</h2>';

    const dimensions = document.createElement('div');
    dimensions.className = 'tool-row';
    const widthInput = this.numberInput(project.map.width, 1, 255);
    const heightInput = this.numberInput(project.map.height, 1, 255);
    const roomsInput = this.numberInput(project.map.rooms.length, 1, 255);
    dimensions.append(
      'Width', widthInput,
      'Height', heightInput,
      'Rooms', roomsInput,
      button('Apply map size', () => this.setMapSize(Number(widthInput.value), Number(heightInput.value), Number(roomsInput.value))),
    );

    const roomTools = document.createElement('div');
    roomTools.className = 'tool-row';
    roomTools.append('Room');
    project.map.rooms.forEach((_room, index) => {
      const control = button(String(index), () => {
        this.selectedRoom = index;
        this.render();
      });
      control.classList.toggle('selected', this.selectedRoom === index);
      roomTools.append(control);
    });
    roomTools.append(
      button('Clear Room', () => this.commit('clear map room', (next) => {
        next.map.rooms[this.selectedRoom].tileIndexes.fill(0);
      })),
    );

    const zoomTools = document.createElement('div');
    zoomTools.className = 'tool-row';
    zoomTools.append('Zoom');
    ([1, 2, 4] as const).forEach((zoom) => {
      const control = button(`${zoom}x`, () => {
        this.zoom = zoom;
        this.render();
      });
      control.classList.toggle('selected', this.zoom === zoom);
      zoomTools.append(control);
    });

    const fileTools = document.createElement('div');
    fileTools.className = 'tool-row';
    fileTools.append(
      button('Load Map JSON', () => this.loadMapJson()),
      button('Save Map JSON', () => downloadBlob(`${this.filePrefix()}_map.json`, exportMapJson(project.map), 'application/json')),
      button('Export Map Flat', () => downloadBlob(`${this.filePrefix()}_map_flat.bin`, exportMapFlat(project.map))),
      button('Export Rooms', () => this.exportRooms()),
    );

    const selectorPanel = document.createElement('section');
    selectorPanel.className = 'grid-panel map-selector-panel';
    selectorPanel.append(this.label(`Tile selector: ${this.selectedTile}`), this.selectorCanvas);

    const mapPanel = document.createElement('section');
    mapPanel.className = 'grid-panel map-room-panel';
    const scroll = document.createElement('div');
    scroll.className = 'map-scroll';
    scroll.append(this.mapCanvas);
    mapPanel.append(this.label(`Room ${this.selectedRoom}: ${project.map.width}x${project.map.height}`), scroll);

    const body = document.createElement('div');
    body.className = 'map-editor-layout';
    body.append(selectorPanel, mapPanel);

    this.element.append(header, dimensions, roomTools, zoomTools, fileTools, body);
    this.drawSelector();
    this.drawMap();
  }

  private drawSelector(): void {
    const project = this.getProject();
    const tilePixelWidth = project.tileWidth * 8 * 2;
    const tilePixelHeight = project.tileHeight * 8 * 2;
    const cell = Math.max(24, tilePixelWidth, tilePixelHeight) + 8;
    const size = cell * 16;
    const ctx = setupCanvas(this.selectorCanvas, size, size);
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, size, size);
    project.tiles.forEach((_tile, tileIndex) => {
      const x = (tileIndex % 16) * cell;
      const y = Math.floor(tileIndex / 16) * cell;
      this.drawTile(ctx, tileIndex, x + 4, y + 4, 2);
      ctx.strokeStyle = tileIndex === this.selectedTile ? '#ffffff' : '#3a3a3a';
      ctx.lineWidth = tileIndex === this.selectedTile ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    });
  }

  private drawMap(): void {
    const project = this.getProject();
    const cellWidth = project.tileWidth * 8 * this.zoom;
    const cellHeight = project.tileHeight * 8 * this.zoom;
    const width = project.map.width * cellWidth;
    const height = project.map.height * cellHeight;
    const ctx = setupCanvas(this.mapCanvas, width, height);
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);
    const room = project.map.rooms[this.selectedRoom];
    room.tileIndexes.forEach((tileIndex, cellIndex) => {
      const x = cellIndex % project.map.width;
      const y = Math.floor(cellIndex / project.map.width);
      this.drawTile(ctx, tileIndex, x * cellWidth, y * cellHeight, this.zoom);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(x * cellWidth + 0.5, y * cellHeight + 0.5, cellWidth, cellHeight);
    });
  }

  private drawTile(ctx: CanvasRenderingContext2D, tileIndex: number, x: number, y: number, scale: number): void {
    const project = this.getProject();
    const tile = project.tiles[tileIndex] ?? project.tiles[0];
    tile.characterIndexes.forEach((characterIndex, cellIndex) => {
      const cx = cellIndex % project.tileWidth;
      const cy = Math.floor(cellIndex / project.tileWidth);
      const character = project.characters[characterIndex] ?? project.characters[0];
      drawCharacterC64(ctx, character, project, x + cx * 8 * scale, y + cy * 8 * scale, scale, tile.cellModes[cellIndex] ?? character.mode);
    });
  }

  private handleSelectorClick(event: MouseEvent): void {
    const rect = this.selectorCanvas.getBoundingClientRect();
    const cell = rect.width / 16;
    const x = Math.floor((event.clientX - rect.left) / cell);
    const y = Math.floor((event.clientY - rect.top) / cell);
    const tileIndex = y * 16 + x;
    if (tileIndex < 0 || tileIndex > 255) return;
    this.selectedTile = tileIndex;
    this.render();
  }

  private handleMapPointer(event: PointerEvent): void {
    const project = this.getProject();
    const rect = this.mapCanvas.getBoundingClientRect();
    const cellWidth = project.tileWidth * 8 * this.zoom;
    const cellHeight = project.tileHeight * 8 * this.zoom;
    const x = Math.floor((event.clientX - rect.left) / cellWidth);
    const y = Math.floor((event.clientY - rect.top) / cellHeight);
    if (x < 0 || y < 0 || x >= project.map.width || y >= project.map.height) return;
    const cellIndex = y * project.map.width + x;
    if (event.button === 2) {
      this.selectedTile = project.map.rooms[this.selectedRoom].tileIndexes[cellIndex] ?? 0;
      this.render();
      return;
    }
    if (event.button !== 0 && event.buttons !== 1) return;
    this.isPainting = true;
    if (project.map.rooms[this.selectedRoom].tileIndexes[cellIndex] === this.selectedTile) return;
    this.commit('paint map tile', (next) => {
      next.map.rooms[this.selectedRoom].tileIndexes[cellIndex] = this.selectedTile;
    });
  }

  private setMapSize(width: number, height: number, rooms: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || !Number.isInteger(rooms) || width < 1 || height < 1 || rooms < 1 || width > 255 || height > 255 || rooms > 255) {
      window.alert('Map width, height, and rooms must be integers from 1 to 255.');
      return;
    }
    this.commit('set map size', (next) => {
      const resized = normalizeMapDimensions(next, width, height, rooms);
      Object.assign(next, resized);
    });
  }

  private loadMapJson(): void {
    filePicker('.json,application/json', (text) => {
      const map = importMapJson(text);
      this.selectedRoom = 0;
      this.commit('load map json', (next) => {
        next.map = map;
      });
    });
  }

  private exportRooms(): void {
    for (const file of exportMapRoomsSeparated(this.getProject().map)) {
      downloadBlob(`${this.filePrefix()}_${file.filename}`, file.bytes);
    }
  }

  private numberInput(value: number, min: number, max: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    return input;
  }

  private label(text: string): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'canvas-label';
    label.textContent = text;
    return label;
  }
}
