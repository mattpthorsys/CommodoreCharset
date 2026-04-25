import { createNewProject, type ProjectData } from '../c64/projectModel';
import { importProjectJson, exportProjectJson } from '../c64/exports';
import { validateProject } from '../c64/validation';

const STORAGE_KEY = 'commodoreCharset.project.v1';

export function loadStoredProject(): ProjectData {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return createNewProject();
  try {
    const project = importProjectJson(stored);
    return validateProject(project).length === 0 ? project : createNewProject();
  } catch {
    return createNewProject();
  }
}

export function saveStoredProject(project: ProjectData): void {
  window.localStorage.setItem(STORAGE_KEY, exportProjectJson(project));
}
