import * as vscode from "vscode";

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

  public async revealStep(step: CodeFlowTraceStep): Promise<vscode.Uri | undefined> {
    const editorResult = await openEditorForStep(step);
    if (!editorResult) {
      return undefined;
    }

    const { editor, fileUri } = editorResult;
    const targetRange = toRange(step);
    const stepKind = normalizeKind(step.kind);
    const activeStepDecoration =
      this.activeStepDecorations.get(stepKind) ?? this.activeStepDecorations.get("call");
    editor.selection = new vscode.Selection(targetRange.start, targetRange.start);
    editor.revealRange(
      new vscode.Range(targetRange.start, targetRange.start),
      vscode.TextEditorRevealType.AtTop,
    );

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
): Promise<{ editor: vscode.TextEditor; fileUri: vscode.Uri } | undefined> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const fileUri = workspaceFolder
    ? vscode.Uri.joinPath(workspaceFolder.uri, step.file)
    : vscode.Uri.file(step.file);

  try {
    const document = await vscode.workspace.openTextDocument(fileUri);
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
    void vscode.window.showWarningMessage(`FlowNote: could not open "${step.file}".`);
    return undefined;
  }
}

function toRange(step: CodeFlowTraceStep): vscode.Range {
  const startLine = (step.range?.startLine ?? step.line) - 1;
  const endLine = (step.range?.endLine ?? step.line) - 1;
  const stepKind = normalizeKind(step.kind);
  if (stepKind === "call" || stepKind === "resume") {
    return new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
  }

  const startCharacter = step.range?.startColumn ? step.range.startColumn - 1 : 0;
  const endCharacter =
    step.range?.endColumn !== undefined
      ? step.range.endColumn
      : endLine === startLine
        ? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;

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
