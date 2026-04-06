import type { TerrainLayout } from '../terrain/types';

const STORAGE_KEY_PREFIX = 'opr-terrain-layout-';
const LAYOUTS_INDEX_KEY = 'opr-terrain-layouts-index';

export interface SavedLayout {
  name: string;
  layout: TerrainLayout;
  savedAt: number;
}

export function saveLayout(name: string, layout: TerrainLayout): void {
  const saved: SavedLayout = {
    name,
    layout,
    savedAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY_PREFIX + name, JSON.stringify(saved));

  const index = getLayoutsIndex();
  if (!index.includes(name)) {
    index.push(name);
    localStorage.setItem(LAYOUTS_INDEX_KEY, JSON.stringify(index));
  }
}

export function loadLayout(name: string): SavedLayout | null {
  const data = localStorage.getItem(STORAGE_KEY_PREFIX + name);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function deleteLayout(name: string): void {
  localStorage.removeItem(STORAGE_KEY_PREFIX + name);

  const index = getLayoutsIndex();
  const filtered = index.filter((n) => n !== name);
  localStorage.setItem(LAYOUTS_INDEX_KEY, JSON.stringify(filtered));
}

export function renameLayout(oldName: string, newName: string): boolean {
  const saved = loadLayout(oldName);
  if (!saved) return false;

  saved.name = newName;
  saveLayout(newName, saved.layout);
  deleteLayout(oldName);

  return true;
}

export function getLayoutsIndex(): string[] {
  const data = localStorage.getItem(LAYOUTS_INDEX_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getAllLayouts(): SavedLayout[] {
  const index = getLayoutsIndex();
  return index.map(loadLayout).filter((l): l is SavedLayout => l !== null);
}
