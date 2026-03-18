import type { DesignState } from '../types';
import { importDesignState, serializeDesignSnapshot } from './designPersistence';

const PROJECT_EXPORT_FILE_BASENAME = 'hardware-codesign-project';

function sanitizeFileStem(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || PROJECT_EXPORT_FILE_BASENAME;
}

export function buildProjectExportFilename(state: DesignState): string {
  const selectedModuleName = state.packageContentByModuleId[state.selectedModuleId]?.identity?.name;
  const stem = sanitizeFileStem(selectedModuleName ?? state.selectedModuleId ?? PROJECT_EXPORT_FILE_BASENAME);
  return `${PROJECT_EXPORT_FILE_BASENAME}-${stem}.json`;
}

export function exportProjectSnapshot(state: DesignState): { filename: string; json: string } {
  return {
    filename: buildProjectExportFilename(state),
    json: serializeDesignSnapshot(state)
  };
}

export function triggerProjectDownload(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importProjectSnapshot(raw: string): ReturnType<typeof importDesignState> {
  return importDesignState(raw);
}

export function getProjectImportErrorMessage(reason: 'invalid_json' | 'invalid_shape' | 'unsupported_schema_version' | 'invalid_restore_state'): string {
  switch (reason) {
    case 'invalid_json':
      return 'Import failed: the selected file is not valid JSON.';
    case 'unsupported_schema_version':
      return 'Import failed: this project file version is not supported by the MVP.';
    case 'invalid_shape':
      return 'Import failed: the project file does not match the expected snapshot format.';
    case 'invalid_restore_state':
      return 'Import failed: the project file could not be restored safely.';
  }

  throw new Error(`Unhandled import error reason: ${reason}`);
}

