import * as vscode from "vscode";

import { createExampleTodoFiles } from "./commands/createExampleTodoFiles";
import { copyPromptForAi } from "./commands/copyPromptForAi";
import { TraceEditorDecorations } from "./editor/decorations";
import { TraceHoverProvider } from "./editor/hoverProvider";
import { StepCodeLensProvider } from "./editor/stepCodeLensProvider";
import { CodeFlowPanel } from "./panel/codeFlowPanel";
import { listTraceFiles, parseTraceFile, pickTraceFile } from "./trace/parser";
import type { ParsedTraceFile } from "./trace/schema";
import { FlowNoteControlsViewProvider } from "./views/controlsView";

interface ExtensionState {
  traceFile?: ParsedTraceFile;
  currentStepIndex: number;
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("FlowNote");
  context.subscriptions.push(output);
  output.appendLine("activate: start");

  let decorations: TraceEditorDecorations | undefined;
  let hoverProvider: TraceHoverProvider | undefined;
  let stepCodeLensProvider: StepCodeLensProvider | undefined;
  let controlsViewProvider: FlowNoteControlsViewProvider | undefined;
  const state: ExtensionState = {
    currentStepIndex: 0,
  };

  let panel: CodeFlowPanel | undefined;
  let codeLensRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  let hasAdjustedEditorLayout = false;

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

  const updateUi = async (options?: { scrollEditor?: boolean }): Promise<void> => {
    if (!state.traceFile) {
      return;
    }
    if (!decorations || !hoverProvider || !stepCodeLensProvider) {
      void vscode.window.showErrorMessage(
        "FlowNote: internal services are not initialized. Reload window and retry.",
      );
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

    const scrollEditor = options?.scrollEditor !== false;
    const fileUri = await decorations.revealStep(currentStep, vscode.Uri.parse(state.traceFile.uri), {
      scrollEditor,
    });
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
            void updateUi({ scrollEditor: false });
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
      if (!hasAdjustedEditorLayout) {
        hasAdjustedEditorLayout = true;
        setTimeout(() => {
          void vscode.commands.executeCommand("workbench.action.evenEditorWidths");
        }, 30);
      }
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

  // Register commands first so command IDs are always available even if view registration fails.
  context.subscriptions.push(
    vscode.commands.registerCommand("flownote.openTrace", openTrace),
    vscode.commands.registerCommand("flownote.nextStep", nextStep),
    vscode.commands.registerCommand("flownote.previousStep", previousStep),
    vscode.commands.registerCommand("flownote.previousCallStep", previousCallStep),
    vscode.commands.registerCommand("flownote.nextResumeStep", nextResumeStep),
    vscode.commands.registerCommand("flownote.copyPromptForAi", copyPromptForAi),
    vscode.commands.registerCommand("flownote.createExampleTodoFiles", createExampleTodoFiles),
    vscode.commands.registerCommand("flownote.noop", () => {}),
  );

  try {
    decorations = new TraceEditorDecorations();
    hoverProvider = new TraceHoverProvider();
    stepCodeLensProvider = new StepCodeLensProvider();
    controlsViewProvider = new FlowNoteControlsViewProvider();

    context.subscriptions.push(decorations, hoverProvider, stepCodeLensProvider);
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ scheme: "file" }, stepCodeLensProvider),
    );
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        refreshCodeLenses();
      }),
    );

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        FlowNoteControlsViewProvider.viewType,
        controlsViewProvider,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    output.appendLine(`activate: service initialization failed: ${message}`);
    void vscode.window.showErrorMessage(
      "FlowNote: failed to initialize extension services. Open Output > FlowNote for details.",
    );
  }

  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (codeLensRefreshTimer) {
        clearTimeout(codeLensRefreshTimer);
      }
    }),
  );
  output.appendLine("activate: done");
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
