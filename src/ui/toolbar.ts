export interface ToolbarActions {
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onExportCharset: () => void;
  onExportCharacterColors: () => void;
  onExportTilesFlat: () => void;
  onExportTilesSeparated: () => void;
  onExportOscar64: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

export function createToolbar(actions: ToolbarActions): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  toolbar.append(
    button('New Project', actions.onNewProject),
    button('Load Project JSON', actions.onLoadProject),
    button('Save Project JSON', actions.onSaveProject),
    button('Export Charset .bin', actions.onExportCharset),
    button('Export Character Colours', actions.onExportCharacterColors),
    button('Export Tiles Flat', actions.onExportTilesFlat),
    button('Export Tiles Separated', actions.onExportTilesSeparated),
    button('Export C/Oscar64', actions.onExportOscar64),
    button('Undo', actions.onUndo),
    button('Redo', actions.onRedo),
  );

  return toolbar;
}
