import * as vscode from "vscode";

import type { ParsedTraceFile } from "./schema";
import { validateTraceDocument } from "./validation";

export async function parseTraceFile(traceUri: vscode.Uri): Promise<ParsedTraceFile> {
  const bytes = await vscode.workspace.fs.readFile(traceUri);
  const rawText = Buffer.from(bytes).toString("utf8");
  const parsed = JSON.parse(rawText);
  const document = validateTraceDocument(parsed);

  return {
    uri: traceUri.toString(),
    document,
  };
}

export async function pickTraceFile(): Promise<vscode.Uri | undefined> {
  const workspaceMatches = await listTraceFiles();
  if (workspaceMatches.length === 1) {
    return workspaceMatches[0];
  }

  if (workspaceMatches.length > 1) {
    const selected = await vscode.window.showQuickPick(
      workspaceMatches.map((uri) => ({
        label: vscode.workspace.asRelativePath(uri),
        description: uri.fsPath,
        uri,
      })),
      {
        placeHolder: "Select a trace file to open",
      },
    );

    return selected?.uri;
  }

  const selectedFiles = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: {
      FlowNote: ["json"],
    },
    openLabel: "Open trace",
  });

  return selectedFiles?.[0];
}

export async function listTraceFiles(): Promise<vscode.Uri[]> {
  const roots = vscode.workspace.workspaceFolders;
  if (!roots?.length) {
    return [];
  }

  const uris: vscode.Uri[] = [];
  for (const folder of roots) {
    const codeFlowRoot = vscode.Uri.joinPath(folder.uri, ".code-flow");
    try {
      await collectJsonFilesUnderDirectory(uris, codeFlowRoot);
    } catch {
      // Missing or unreadable .code-flow — skip this workspace folder.
    }
  }

  uris.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
  return uris;
}

async function collectJsonFilesUnderDirectory(acc: vscode.Uri[], dir: vscode.Uri): Promise<void> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dir);
  } catch {
    return;
  }

  for (const [name, type] of entries) {
    const child = vscode.Uri.joinPath(dir, name);
    if (type === vscode.FileType.Directory) {
      await collectJsonFilesUnderDirectory(acc, child);
    } else if (type === vscode.FileType.File && name.endsWith(".json")) {
      acc.push(child);
    }
  }
}
