import type { HandoffArtifact } from './handoffTypes';

export function buildPromptExportFilename(moduleName: string): string {
  return `${moduleName || 'module'}-hdl-prompt.txt`;
}

export function buildArtifactExportFilename(moduleName: string): string {
  return `${moduleName || 'module'}-handoff-artifact.json`;
}

export function serializePromptExport(promptText: string): string {
  return promptText;
}

export function serializeHandoffArtifact(artifact: HandoffArtifact): string {
  return JSON.stringify(artifact, null, 2);
}

type ClipboardLike = Pick<Clipboard, 'writeText'>;

export async function copyTextToClipboard(text: string, clipboard: ClipboardLike = navigator.clipboard): Promise<void> {
  await clipboard.writeText(text);
}

export function triggerTextDownload(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
