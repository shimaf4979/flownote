import * as vscode from "vscode";

import type { CodeFlowTraceStep } from "../trace/schema";

export class StepCodeLensProvider implements vscode.CodeLensProvider, vscode.Disposable {
  private readonly onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

  private currentFileUri?: string;
  private currentStep?: CodeFlowTraceStep;
  private currentStepIndex = 0;
  private totalSteps = 0;

  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  public dispose(): void {
    this.onDidChangeCodeLensesEmitter.dispose();
  }

  public setCurrentStep(fileUri: vscode.Uri, step: CodeFlowTraceStep, stepIndex: number, totalSteps: number): void {
    this.currentFileUri = fileUri.toString();
    this.currentStep = step;
    this.currentStepIndex = stepIndex;
    this.totalSteps = totalSteps;
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public clear(): void {
    this.currentFileUri = undefined;
    this.currentStep = undefined;
    this.currentStepIndex = 0;
    this.totalSteps = 0;
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!this.currentStep || this.currentFileUri !== document.uri.toString()) {
      return [];
    }

    const startLine = Math.max((this.currentStep.range?.startLine ?? this.currentStep.line) - 1, 0);
    const range = new vscode.Range(startLine, 0, startLine, 0);
    const codeLenses: vscode.CodeLens[] = [];

    if (this.currentStepIndex > 0) {
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "Prev",
          command: "flownote.previousStep",
          arguments: [],
        }),
      );
    } else {
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "Prev",
          command: "flownote.noop",
          arguments: [],
        }),
      );
    }

    if (this.currentStepIndex < this.totalSteps - 1) {
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "Next",
          command: "flownote.nextStep",
          arguments: [],
        }),
      );
    } else {
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: "Next",
          command: "flownote.noop",
          arguments: [],
        }),
      );
    }

    codeLenses.push(
      new vscode.CodeLens(range, {
        title: `FlowNote: ${this.currentStep.title}  ${this.currentStep.summary}`,
        command: "flownote.noop",
        arguments: [],
      }),
    );

    return codeLenses;
  }
}
