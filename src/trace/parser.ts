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
  return vscode.workspace.findFiles(".code-flow/*.json");
}
