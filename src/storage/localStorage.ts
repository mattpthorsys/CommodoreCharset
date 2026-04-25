import type { ProjectData } from '../c64/projectModel';
import { importProjectJson } from '../c64/exports';

const STORAGE_KEY = 'c64-multicolour-charset-project-v1';

export function saveProjectToLocalStorage(project: ProjectData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadProjectFromLocalStorage(): ProjectData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return importProjectJson(raw);
  } catch {
    return null;
  }
}
