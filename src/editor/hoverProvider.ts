import * as vscode from "vscode";

import type { CodeFlowTraceStep } from "../trace/schema";

export class TraceHoverProvider implements vscode.HoverProvider, vscode.Disposable {
  private currentStep: CodeFlowTraceStep | undefined;
  private currentFileUri: vscode.Uri | undefined;

  public setCurrentStep(fileUri: vscode.Uri, step: CodeFlowTraceStep): void {
    this.currentFileUri = fileUri;
    this.currentStep = step;
  }

  public clear(): void {
    this.currentFileUri = undefined;
    this.currentStep = undefined;
  }

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    if (
      !this.currentStep ||
      !this.currentFileUri ||
      document.uri.toString() !== this.currentFileUri.toString()
    ) {
      return undefined;
    }

    const startLine = (this.currentStep.range?.startLine ?? this.currentStep.line) - 1;
    const endLine = (this.currentStep.range?.endLine ?? this.currentStep.line) - 1;

    if (position.line < startLine || position.line > endLine) {
      return undefined;
    }

    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.appendMarkdown(`**${this.currentStep.title}**\n\n`);
    markdown.appendMarkdown(`${this.currentStep.summary}\n\n`);
    markdown.appendMarkdown(`- Step ID: \`${this.currentStep.id}\`\n`);
    markdown.appendMarkdown(`- Depth: \`${this.currentStep.depth}\`\n`);
    markdown.appendMarkdown(`- Kind: \`${this.currentStep.kind ?? "call"}\``);

    if (this.currentStep.code) {
      markdown.appendCodeblock(this.currentStep.code);
    }

    markdown.isTrusted = false;
    return new vscode.Hover(markdown);
  }

  public dispose(): void {
    this.clear();
  }
}
