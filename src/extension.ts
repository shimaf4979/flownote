import * as vscode from "vscode";

import { copyPromptForAi } from "./commands/copyPromptForAi";
import { TraceEditorDecorations } from "./editor/decorations";
import { TraceHoverProvider } from "./editor/hoverProvider";
import { StepCodeLensProvider } from "./editor/stepCodeLensProvider";
import { CodeFlowPanel } from "./panel/codeFlowPanel";
import { listTraceFiles, parseTraceFile, pickTraceFile } from "./trace/parser";
import type { ParsedTraceFile } from "./trace/schema";

interface ExtensionState {
  traceFile?: ParsedTraceFile;
  currentStepIndex: number;
}

export function activate(context: vscode.ExtensionContext): void {
  const decorations = new TraceEditorDecorations();
  const hoverProvider = new TraceHoverProvider();
  const stepCodeLensProvider = new StepCodeLensProvider();
  const state: ExtensionState = {
    currentStepIndex: 0,
  };

  let panel: CodeFlowPanel | undefined;
  let codeLensRefreshTimer: ReturnType<typeof setTimeout> | undefined;

  const refreshCodeLenses = (): void => {
    void vscode.commands.executeCommand("editor.action.codelens.refresh");
    if (codeLensRefreshTimer) {
      clearTimeout(codeLensRefreshTimer);
    }
    codeLensRefreshTimer = setTimeout(() => {
      void vscode.commands.executeCommand("editor.action.codelens.refresh");
    }, 10);
  };

  const getTraceOptions = async (): Promise<Array<{ uri: string; label: string }>> => {
    const traceUris = await listTraceFiles();
    return traceUris.map((uri) => ({
      uri: uri.toString(),
      label: vscode.workspace.asRelativePath(uri, false),
    }));
  };

  const updateUi = async (): Promise<void> => {
    if (!state.traceFile) {
      return;
    }

    const boundedIndex = Math.min(
      Math.max(state.currentStepIndex, 0),
      Math.max(state.traceFile.document.steps.length - 1, 0),
    );
    state.currentStepIndex = boundedIndex;

    const currentStep = state.traceFile.document.steps[boundedIndex];
    if (!currentStep) {
      return;
    }

    const fileUri = await decorations.revealStep(currentStep);
    if (fileUri) {
      hoverProvider.setCurrentStep(fileUri, currentStep);
      stepCodeLensProvider.setCurrentStep(
        fileUri,
        currentStep,
        boundedIndex,
        state.traceFile.document.steps.length,
      );
      refreshCodeLenses();
    } else {
      stepCodeLensProvider.clear();
      refreshCodeLenses();
    }

    if (panel) {
      panel.updateState({
        traceUri: state.traceFile.uri,
        trace: state.traceFile.document,
        currentStepIndex: boundedIndex,
        traceOptions: await getTraceOptions(),
      });
      panel.reveal(true);
    } else {
      panel = new CodeFlowPanel(
        context.extensionUri,
        {
          traceUri: state.traceFile.uri,
          trace: state.traceFile.document,
          currentStepIndex: boundedIndex,
          traceOptions: await getTraceOptions(),
        },
        {
          onSelectTrace: (traceUri) => {
            void openTrace(vscode.Uri.parse(traceUri));
          },
          onSelectStep: (stepIndex) => {
            state.currentStepIndex = stepIndex;
            void updateUi();
          },
          onNextStep: () => {
            state.currentStepIndex += 1;
            void updateUi();
          },
          onPreviousStep: () => {
            state.currentStepIndex -= 1;
            void updateUi();
          },
          onPreviousCallStep: () => {
            void previousCallStep();
          },
          onNextResumeStep: () => {
            void nextResumeStep();
          },
          onDispose: () => {
            panel = undefined;
          },
        },
      );
      context.subscriptions.push(panel);
      panel.reveal(true);
    }
  };

  const openTrace = async (traceUriArg?: vscode.Uri): Promise<void> => {
    const traceUri = traceUriArg ?? (await pickTraceFile());
    if (!traceUri) {
      return;
    }

    try {
      state.traceFile = await parseTraceFile(traceUri);
      state.currentStepIndex = 0;
      await updateUi();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      void vscode.window.showErrorMessage(`FlowNote: failed to open trace.\n${message}`);
    }
  };

  const nextStep = async (): Promise<void> => {
    if (!state.traceFile) {
      return openTrace();
    }

    if (state.currentStepIndex >= state.traceFile.document.steps.length - 1) {
      return;
    }

    state.currentStepIndex += 1;
    await updateUi();
  };

  const previousStep = async (): Promise<void> => {
    if (!state.traceFile) {
      return openTrace();
    }

    if (state.currentStepIndex <= 0) {
      return;
    }

    state.currentStepIndex -= 1;
    await updateUi();
  };

  const previousCallStep = async (): Promise<void> => {
    if (!state.traceFile) {
      return openTrace();
    }

    const targetIndex = findParentCallStepIndex(
      state.traceFile.document.steps,
      state.currentStepIndex,
    );
    if (targetIndex < 0) {
      return;
    }

    state.currentStepIndex = targetIndex;
    await updateUi();
  };

  const nextResumeStep = async (): Promise<void> => {
    if (!state.traceFile) {
      return openTrace();
    }

    const targetIndex = findParentResumeStepIndex(
      state.traceFile.document.steps,
      state.currentStepIndex,
    );
    if (targetIndex < 0) {
      return;
    }

    state.currentStepIndex = targetIndex;
    await updateUi();
  };

  context.subscriptions.push(
    decorations,
    hoverProvider,
    stepCodeLensProvider,
    vscode.languages.registerCodeLensProvider({ scheme: "file" }, stepCodeLensProvider),
    vscode.window.onDidChangeActiveTextEditor(() => {
      refreshCodeLenses();
    }),
    vscode.commands.registerCommand("flownote.openTrace", openTrace),
    vscode.commands.registerCommand("flownote.nextStep", nextStep),
    vscode.commands.registerCommand("flownote.previousStep", previousStep),
    vscode.commands.registerCommand("flownote.previousCallStep", previousCallStep),
    vscode.commands.registerCommand("flownote.nextResumeStep", nextResumeStep),
    vscode.commands.registerCommand("flownote.copyPromptForAi", copyPromptForAi),
    vscode.commands.registerCommand("flownote.noop", () => {}),
    new vscode.Disposable(() => {
      if (codeLensRefreshTimer) {
        clearTimeout(codeLensRefreshTimer);
      }
    }),
  );
}

export function deactivate(): void {
  // No-op: disposables are cleaned up by VS Code.
}

function findParentCallStepIndex(
  steps: ParsedTraceFile["document"]["steps"],
  currentStepIndex: number,
): number {
  const currentStep = steps[currentStepIndex];
  if (!currentStep) {
    return -1;
  }

  const targetDepth = Math.max(currentStep.depth - 1, 0);
  const openCalls = buildOpenCallStack(steps, currentStepIndex);
  for (let index = openCalls.length - 1; index >= 0; index -= 1) {
    const openCall = openCalls[index];
    if (openCall && openCall.depth === targetDepth) {
      return openCall.index;
    }
  }

  return -1;
}

function findParentResumeStepIndex(
  steps: ParsedTraceFile["document"]["steps"],
  currentStepIndex: number,
): number {
  const parentCallIndex = findParentCallStepIndex(steps, currentStepIndex);
  if (parentCallIndex < 0) {
    return -1;
  }

  const parentCall = steps[parentCallIndex];
  if (!parentCall) {
    return -1;
  }

  for (let index = parentCallIndex + 1; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step) {
      continue;
    }

    if (normalizeKind(step.kind) === "resume" && step.depth === parentCall.depth) {
      return index;
    }
  }

  return -1;
}

function buildOpenCallStack(
  steps: ParsedTraceFile["document"]["steps"],
  currentStepIndex: number,
): Array<{ index: number; depth: number }> {
  const openCalls: Array<{ index: number; depth: number }> = [];

  for (let index = 0; index <= currentStepIndex; index += 1) {
    const step = steps[index];
    if (!step) {
      continue;
    }

    const kind = normalizeKind(step.kind);
    if (kind === "call") {
      openCalls.push({ index, depth: step.depth });
      continue;
    }

    if (kind === "resume") {
      for (let openIndex = openCalls.length - 1; openIndex >= 0; openIndex -= 1) {
        if (openCalls[openIndex]?.depth === step.depth) {
          openCalls.splice(openIndex, 1);
          break;
        }
      }
    }
  }

  return openCalls;
}

function normalizeKind(kind?: string): string {
  return kind ?? "call";
}
