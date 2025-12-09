export type GridLineStyle = 'solid' | 'dotted' | 'dashed';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface GridSettings {
  showGridLines: boolean;
  gridLineStyle: GridLineStyle;
  gridLineColor: string;
  gridLineThickness: number; // 1-3
  cellZoom: number; // 50-200 (percentage)
  snapToGrid: boolean;
}

export interface DisplaySettings {
  showElementLabels: boolean;
  theme: ThemeMode;
}

export interface EditorSettings {
  undoHistoryDepth: number; // 5-50
  autoSaveInterval: number; // 0 = off, or minutes
  confirmBeforeDelete: boolean;
  externalSvgEditor: string; // Path to external SVG editor
}

export interface FileSettings {
  autoOpenLastFile: boolean;
  defaultSaveLocation: string;
  vcpResourcesFolder: string; // Path to vcp root folder containing Buttons, Images, and skins
}

export interface AppSettings {
  grid: GridSettings;
  display: DisplaySettings;
  editor: EditorSettings;
  files: FileSettings;
  attributions?: string[]; // Developer-editable list of attributions shown in About box
}

export const defaultSettings: AppSettings = {
  grid: {
    showGridLines: true,
    gridLineStyle: 'solid',
    gridLineColor: 'rgba(0, 0, 0, 0.1)',
    gridLineThickness: 1,
    cellZoom: 100,
    snapToGrid: true,
  },
  display: {
    showElementLabels: true,
    theme: 'system',
  },
  editor: {
    undoHistoryDepth: 5,
    autoSaveInterval: 0,
    confirmBeforeDelete: false,
    externalSvgEditor: '',
  },
  files: {
    autoOpenLastFile: true,
    defaultSaveLocation: '',
    vcpResourcesFolder: '',
  },
  attributions: [],
};
