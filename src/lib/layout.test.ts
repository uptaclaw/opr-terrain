import { createDefaultLayout } from '../data/terrainCatalog';
import {
  decodeLayoutHash,
  encodeLayoutHash,
  loadSavedLayouts,
  loadWorkingLayout,
  persistSavedLayouts,
  persistWorkingLayout,
  SAVED_LAYOUTS_STORAGE_KEY,
  WORKING_LAYOUT_STORAGE_KEY,
} from './layout';

describe('layout helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(window.history.state, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the standard 4×6 table as the default layout size', () => {
    const layout = createDefaultLayout();

    expect(layout.table.widthInches).toBe(48);
    expect(layout.table.heightInches).toBe(72);
    expect(layout.table.deploymentDepthInches).toBe(12);
  });

  it('round-trips a layout through the share hash serializer', () => {
    const layout = createDefaultLayout();
    layout.table.title = 'Hash Test';
    layout.pieces[0].x = 31.5;
    layout.pieces[0].traits[0].active = false;

    const decoded = decodeLayoutHash(encodeLayoutHash(layout));

    expect(decoded).not.toBeNull();
    expect(decoded?.table.title).toBe('Hash Test');
    expect(decoded?.pieces[0].x).toBe(31.5);
    expect(decoded?.pieces[0].traits[0].active).toBe(false);
  });

  it('persists and reloads the working draft layout from localStorage', () => {
    const layout = createDefaultLayout();
    layout.pieces[1].y = 22;

    expect(persistWorkingLayout(layout)).toBe(true);

    expect(window.localStorage.getItem(WORKING_LAYOUT_STORAGE_KEY)).toBeTruthy();
    expect(loadWorkingLayout()?.pieces[1].y).toBe(22);
  });

  it('persists saved layouts and returns them sorted by latest update', () => {
    const first = createDefaultLayout();
    first.table.title = 'Alpha';
    const second = createDefaultLayout();
    second.table.title = 'Bravo';

    expect(
      persistSavedLayouts([
        {
          id: 'a',
          name: 'Alpha',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
          layout: first,
        },
        {
          id: 'b',
          name: 'Bravo',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
          layout: second,
        },
      ]),
    ).toBe(true);

    expect(window.localStorage.getItem(SAVED_LAYOUTS_STORAGE_KEY)).toBeTruthy();
    expect(loadSavedLayouts().map((savedLayout) => savedLayout.name)).toEqual(['Bravo', 'Alpha']);
  });

  it('migrates old 48×48 layouts to 48×72 when loading from storage', () => {
    // Simulate old layout with 48×48 dimensions
    const oldLayout = {
      version: 1,
      table: {
        widthInches: 48,
        heightInches: 48, // Old dimension
        deploymentDepthInches: 12,
        title: 'Old 48x48 Layout',
      },
      pieces: [],
    };

    window.localStorage.setItem(WORKING_LAYOUT_STORAGE_KEY, JSON.stringify(oldLayout));

    const loaded = loadWorkingLayout();

    expect(loaded).not.toBeNull();
    expect(loaded?.table.widthInches).toBe(48);
    expect(loaded?.table.heightInches).toBe(72); // Migrated to 72
    expect(loaded?.table.title).toBe('Old 48x48 Layout');
  });

  it('preserves non-48×48 custom table dimensions', () => {
    const customLayout = {
      version: 1,
      table: {
        widthInches: 36,
        heightInches: 48,
        deploymentDepthInches: 12,
        title: 'Custom Size',
      },
      pieces: [],
    };

    window.localStorage.setItem(WORKING_LAYOUT_STORAGE_KEY, JSON.stringify(customLayout));

    const loaded = loadWorkingLayout();

    expect(loaded).not.toBeNull();
    expect(loaded?.table.widthInches).toBe(36);
    expect(loaded?.table.heightInches).toBe(48); // Not migrated, different from 48×48
  });

  it('fails gracefully when the working draft cannot be persisted', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    expect(persistWorkingLayout(createDefaultLayout())).toBe(false);
    expect(loadWorkingLayout()).toBeNull();
  });

  it('fails gracefully when named layouts cannot be persisted', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const layout = createDefaultLayout();
    layout.table.title = 'Unavailable storage';

    expect(
      persistSavedLayouts([
        {
          id: 'blocked',
          name: 'Unavailable storage',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
          layout,
        },
      ]),
    ).toBe(false);
    expect(loadSavedLayouts()).toEqual([]);
  });
});
