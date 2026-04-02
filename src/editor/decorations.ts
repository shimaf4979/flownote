import * as vscode from "vscode";
import * as path from "node:path";

import type { CodeFlowTraceStep } from "../trace/schema";

export class TraceEditorDecorations implements vscode.Disposable {
  private readonly activeStepDecorations = new Map<string, vscode.TextEditorDecorationType>(
    Object.entries({
      enter: createStepDecoration("rgba(46, 204, 113, 0.30)"),
      call: createStepDecoration("rgba(255, 59, 48, 0.30)"),
      return: createStepDecoration("rgba(0, 122, 255, 0.28)"),
      resume: createStepDecoration("rgba(175, 82, 222, 0.28)"),
    }),
  );

  public dispose(): void {
    this.clear();
    for (const decoration of this.activeStepDecorations.values()) {
      decoration.dispose();
    }
  }

  public clear(editor?: vscode.TextEditor): void {
    const targetEditor = editor ?? vscode.window.activeTextEditor;
    if (!targetEditor) {
      return;
    }

    for (const decoration of this.activeStepDecorations.values()) {
      targetEditor.setDecorations(decoration, []);
    }
  }

  public async revealStep(
    step: CodeFlowTraceStep,
    traceFileUri?: vscode.Uri,
    options?: { scrollEditor?: boolean },
  ): Promise<vscode.Uri | undefined> {
    const scrollEditor = options?.scrollEditor !== false;
    const editorResult = await openEditorForStep(step, traceFileUri);
    if (!editorResult) {
      return undefined;
    }

    const { editor, fileUri } = editorResult;
    const targetRange = toRange(step);
    const stepKind = normalizeKind(step.kind);
    const activeStepDecoration =
      this.activeStepDecorations.get(stepKind) ?? this.activeStepDecorations.get("call");
    if (scrollEditor) {
      editor.selection = new vscode.Selection(targetRange.start, targetRange.start);
      editor.revealRange(
        new vscode.Range(targetRange.start, targetRange.start),
        vscode.TextEditorRevealType.AtTop,
      );
    }

    if (!activeStepDecoration) {
      return fileUri;
    }

    this.clear(editor);
    editor.setDecorations(activeStepDecoration, [{ range: targetRange }]);

    return fileUri;
  }
}

async function openEditorForStep(
  step: CodeFlowTraceStep,
  traceFileUri?: vscode.Uri,
): Promise<{ editor: vscode.TextEditor; fileUri: vscode.Uri } | undefined> {
  const candidateUris = resolveFileCandidates(step.file, traceFileUri);

  for (const fileUri of candidateUris) {
    try {
      const document = await vscode.workspace.openTextDocument(fileUri);
      const alreadyVisible = vscode.window.visibleTextEditors.find(
        (editor) => editor.document.uri.toString() === document.uri.toString(),
      );
      if (alreadyVisible) {
        return { editor: alreadyVisible, fileUri };
      }

      const existingEditor =
        vscode.window.visibleTextEditors.find((editor) => editor.document.uri.scheme === "file") ??
        vscode.window.activeTextEditor;
      const targetViewColumn = existingEditor?.viewColumn ?? vscode.ViewColumn.One;
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn: targetViewColumn,
        preview: true,
        preserveFocus: true,
      });
      return { editor, fileUri };
    } catch {
      // Try next candidate URI.
    }
  }

  void vscode.window.showWarningMessage(`FlowNote: could not open "${step.file}".`);
  return undefined;
}

function resolveFileCandidates(stepFile: string, traceFileUri?: vscode.Uri): vscode.Uri[] {
  if (path.isAbsolute(stepFile)) {
    return [vscode.Uri.file(stepFile)];
  }

  const candidates: vscode.Uri[] = [];
  const seen = new Set<string>();
  const pushUnique = (uri: vscode.Uri): void => {
    const key = uri.toString();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push(uri);
  };

  if (traceFileUri?.scheme === "file") {
    const traceDir = path.dirname(traceFileUri.fsPath);
    pushUnique(vscode.Uri.file(path.resolve(traceDir, stepFile)));
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    pushUnique(vscode.Uri.joinPath(workspaceFolder.uri, stepFile));
  }

  if (candidates.length === 0) {
    pushUnique(vscode.Uri.file(path.resolve(stepFile)));
  }

  return candidates;
}

function toRange(step: CodeFlowTraceStep): vscode.Range {
  const startLine = (step.range?.startLine ?? step.line) - 1;
  const endLine = (step.range?.endLine ?? step.line) - 1;
  const hasColumnHint =
    step.range?.startColumn !== undefined || step.range?.endColumn !== undefined;

  if (hasColumnHint) {
    const startCharacter = (step.range?.startColumn ?? 1) - 1;
    const endCharacter =
      step.range?.endColumn !== undefined
        ? step.range.endColumn
        : Number.MAX_SAFE_INTEGER;
    return new vscode.Range(startLine, startCharacter, endLine, endCharacter);
  }

  const stepKind = normalizeKind(step.kind);
  if (stepKind === "call" || stepKind === "resume") {
    return new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
  }

  const startCharacter = 0;
  const endCharacter = Number.MAX_SAFE_INTEGER;

  return new vscode.Range(startLine, startCharacter, endLine, endCharacter);
}

function normalizeKind(kind: CodeFlowTraceStep["kind"]): string {
  return kind ?? "call";
}

function createStepDecoration(backgroundColor: string) {
  return vscode.window.createTextEditorDecorationType({
    backgroundColor,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}
