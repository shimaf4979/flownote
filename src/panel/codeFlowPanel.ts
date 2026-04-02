import * as vscode from "vscode";

import type { CodeFlowTraceDocument } from "../trace/schema";

export interface CodeFlowPanelState {
  traceUri: string;
  trace: CodeFlowTraceDocument;
  currentStepIndex: number;
  traceOptions: Array<{
    uri: string;
    label: string;
  }>;
}

type PanelMessage =
  | { type: "ready" }
  | { type: "select-trace"; traceUri: string }
  | { type: "select-step"; stepIndex: number }
  | { type: "next-step" }
  | { type: "previous-step" }
  | { type: "previous-call-step" }
  | { type: "next-resume-step" };

export class CodeFlowPanel implements vscode.Disposable {
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private isDisposed = false;

  public constructor(
    extensionUri: vscode.Uri,
    private state: CodeFlowPanelState,
    private readonly handlers: {
      onSelectTrace: (traceUri: string) => void;
      onSelectStep: (stepIndex: number) => void;
      onNextStep: () => void;
      onPreviousStep: () => void;
      onPreviousCallStep: () => void;
      onNextResumeStep: () => void;
      onDispose: () => void;
    },
  ) {
    this.panel = vscode.window.createWebviewPanel(
      "codeFlowTracer",
      `FlowNote: ${state.trace.name}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    this.panel.webview.html = this.render(extensionUri, this.panel.webview);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: PanelMessage) => this.onMessage(message),
      null,
      this.disposables,
    );
  }

  public reveal(preserveFocus = true): void {
    this.panel.reveal(vscode.ViewColumn.Beside, preserveFocus);
    void this.postState();
  }

  public updateState(nextState: CodeFlowPanelState): void {
    this.state = nextState;
    this.panel.title = `FlowNote: ${nextState.trace.name}`;
    void this.postState();
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    this.handlers.onDispose();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  private async postState(): Promise<void> {
    await this.panel.webview.postMessage({
      type: "state",
      payload: this.state,
    });
  }

  private onMessage(message: PanelMessage): void {
    switch (message.type) {
      case "ready":
        void this.postState();
        break;
      case "select-step":
        this.handlers.onSelectStep(message.stepIndex);
        break;
      case "select-trace":
        this.handlers.onSelectTrace(message.traceUri);
        break;
      case "next-step":
        this.handlers.onNextStep();
        break;
      case "previous-step":
        this.handlers.onPreviousStep();
        break;
      case "previous-call-step":
        this.handlers.onPreviousCallStep();
        break;
      case "next-resume-step":
        this.handlers.onNextResumeStep();
        break;
      default:
        break;
    }
  }

  private render(_extensionUri: vscode.Uri, _webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <title>FlowNote</title>
    <style>
      :root {
        color-scheme: light dark;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        height: 100vh;
        overflow: hidden;
      }

      .layout {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        height: 100vh;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
      }

      .sidebar {
        flex: 0 0 var(--sidebar-width, 320px);
        width: var(--sidebar-width, 320px);
        border-right: 1px solid var(--vscode-panel-border);
        padding: 12px 0 12px 8px;
        overflow-x: hidden;
        overflow-y: auto;
        box-sizing: border-box;
      }

      .resizer {
        flex: 0 0 8px;
        width: 8px;
        min-width: 8px;
        position: relative;
        cursor: col-resize;
        background: transparent;
      }

      .resizer::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 1px;
        background: var(--vscode-panel-border);
        transform: translateX(-50%);
      }

      .resizer:hover::before,
      .resizer.isDragging::before {
        width: 3px;
        background: var(--vscode-focusBorder);
      }

      .content {
        flex: 1 1 0%;
        min-width: 0;
        max-width: 100%;
        padding: 8px 10px 10px;
        overflow: auto;
        box-sizing: border-box;
      }

      .header {
        margin: 0 12px 12px 0;
        min-width: 0;
      }

      .title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .description {
        margin: 8px 0 0;
        color: var(--vscode-descriptionForeground);
        line-height: 1.5;
      }

      .tracePicker {
        width: calc(100% - 12px);
        margin-top: 12px;
        border: 1px solid var(--vscode-dropdown-border, var(--vscode-panel-border));
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        padding: 6px 8px;
        border-radius: 6px;
      }

      .toolbar {
        display: flex;
        gap: 8px;
        margin: 4px 0 8px;
        flex-wrap: wrap;
      }

      button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
      }

      button.secondary {
        background: transparent;
        color: var(--vscode-editor-foreground);
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .steps {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-right: 0;
      }

      .stepButton {
        text-align: left;
        width: calc(100% + 8px);
        background: transparent;
        color: inherit;
        padding: 0;
        margin: 0;
        border: none;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        align-items: stretch;
        border-radius: 0;
        margin-left: -8px;
        padding-left: 12px;
      }

      .stepButton.active {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
      }

      .stepButton.kind-enter {
        --kind-color: #2ecc71;
      }

      .stepButton.kind-return {
        --kind-color: #007aff;
      }

      .stepButton.kind-resume {
        --kind-color: #af52de;
      }

      .stepButton.kind-call {
        --kind-color: #ff3b30;
      }

      .stepTree {
        position: relative;
        width: calc((var(--depth, 0) + 1) * 14px);
        min-width: 14px;
        height: 100%;
        min-height: 36px;
        --tree-anchor-y: 18px;
      }

      .treeLane {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 1px;
        border-radius: 0;
      }

      .treeNode {
        position: absolute;
        top: var(--tree-anchor-y);
        width: 16px;
        height: 16px;
        border-radius: 999px;
        box-shadow: 0 0 0 2px var(--vscode-editor-background);
        transform: translate(-50%, -50%);
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--vscode-editor-background);
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        text-shadow: 0 0 1px currentColor;
      }

      .stepBody {
        min-width: 0;
        padding: 10px 16px 10px 0;
      }

      .stepTitleRow {
        display: flex;
        align-items: center;
        min-width: 0;
      }

      .stepTitle {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .stepMeta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        opacity: 0.75;
        margin-top: 6px;
        min-width: 0;
      }

      .stepMetaFile {
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .stepMetaKind {
        flex: 0 0 auto;
        margin-left: auto;
      }

      .kindBadge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        line-height: 1.4;
        border: 1px solid color-mix(in srgb, var(--kind-color, var(--vscode-focusBorder)) 50%, transparent);
        color: var(--kind-color, var(--vscode-focusBorder));
        background: color-mix(in srgb, var(--kind-color, var(--vscode-focusBorder)) 14%, transparent);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .stepDetail {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .card {
        border: none;
        border-top: 1px solid var(--vscode-panel-border);
        border-radius: 0;
        padding: 8px 0;
        background: transparent;
        width: 100%;
        min-width: 0;
        overflow: hidden;
      }

      .eyebrow {
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--vscode-descriptionForeground);
        margin: 0 0 10px;
      }

      .code {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
        line-height: 1.5;
      }

      .stepHeading {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 0;
        margin-bottom: 8px;
        flex-wrap: wrap;
        min-width: 0;
      }

      .breadcrumb + .stepHeading {
        margin-top: 0;
      }

      .stepHeading h2 {
        margin: 0;
        min-width: 0;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .card p {
        margin: 0;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .card p.eyebrow {
        margin: 0 0 14px;
      }

      .breadcrumb {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        margin: 10px 0 8px;
        color: var(--vscode-descriptionForeground);
        font-size: 12px;
        line-height: 1.5;
      }

      .breadcrumbItem {
        display: inline-flex;
        align-items: flex-start;
        min-width: 0;
        width: min(var(--stack-width, 196px), 100%);
        max-width: 100%;
        padding: 6px 10px;
        border-radius: 8px;
        border: none;
        background: var(--stack-background, color-mix(in srgb, var(--vscode-editor-background) 88%, var(--vscode-panel-border)));
        color: var(--stack-foreground, var(--vscode-editor-foreground));
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
        font-size: 11px;
        line-height: 1.3;
      }

      .breadcrumbItem.current {
        width: min(var(--stack-width, 240px), 100%);
        max-width: 100%;
        color: var(--vscode-editor-foreground);
        font-weight: 700;
      }

      .breadcrumbSeparator {
        display: none;
      }

    </style>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const app = document.getElementById("app");
      let viewState = vscode.getState() || {};
      let state;

      function captureScrollState() {
        const sidebar = document.querySelector(".sidebar");
        const content = document.querySelector(".content");
        viewState = {
          ...viewState,
          sidebarScrollTop: sidebar?.scrollTop ?? viewState.sidebarScrollTop ?? 0,
          contentScrollTop: content?.scrollTop ?? viewState.contentScrollTop ?? 0,
        };
        vscode.setState(viewState);
      }

      function restoreScrollState() {
        const sidebar = document.querySelector(".sidebar");
        const content = document.querySelector(".content");
        if (sidebar && typeof viewState.sidebarScrollTop === "number") {
          sidebar.scrollTop = viewState.sidebarScrollTop;
        }
        if (content && typeof viewState.contentScrollTop === "number") {
          content.scrollTop = viewState.contentScrollTop;
        }
      }

      function render() {
        if (!state) {
          app.innerHTML = "<div style='padding: 16px;'>Loading trace...</div>";
          return;
        }

        captureScrollState();

        const currentStep = state.trace.steps[state.currentStepIndex];
        const stackBreadcrumbMarkup = renderStackBreadcrumb(
          state.trace.steps,
          state.currentStepIndex,
        );
        const traceOptionsMarkup = state.traceOptions
          .map((option) => {
            const selected = option.uri === state.traceUri ? "selected" : "";
            return \`<option value="\${escapeHtml(option.uri)}" \${selected}>\${escapeHtml(option.label)}</option>\`;
          })
          .join("");
        const stepsMarkup = state.trace.steps
          .map((step, index) => {
            const isActive = index === state.currentStepIndex;
            const kind = normalizeKind(step.kind);
            const treeMarkup = renderTree(state.trace.steps, index, step.depth, kind);
            return \`
              <button class="stepButton kind-\${kind} \${isActive ? "active" : ""}" data-step-index="\${index}" style="--depth: \${step.depth};">
                <span class="stepTree" aria-hidden="true">\${treeMarkup}</span>
                <span class="stepBody">
                  <span class="stepTitleRow">
                    <strong class="stepTitle">\${escapeHtml(step.title)}</strong>
                  </span>
                  <span class="stepMeta">
                    <span class="stepMetaFile">\${escapeHtml(getFileName(step.file))}</span>
                    <span class="stepMetaKind kindBadge">\${escapeHtml(kind)}</span>
                  </span>
                </span>
              </button>
            \`;
          })
          .join("");

        app.innerHTML = \`
          <div class="layout" style="--sidebar-width: \${getSidebarWidth()}px;">
            <aside class="sidebar">
              <div class="header">
                <h1 class="title">\${escapeHtml(state.trace.name)}</h1>
                <p class="description">\${escapeHtml(state.trace.description || "AI-generated code flow trace")}</p>
                <select id="trace-picker" class="tracePicker">
                  \${traceOptionsMarkup}
                </select>
              </div>
              <div class="steps">\${stepsMarkup}</div>
            </aside>
            <div class="resizer" id="resizer" role="separator" aria-orientation="vertical" aria-label="Resize panels"></div>
            <main class="content">
              <div class="toolbar">
                <button id="previous" class="secondary" \${state.currentStepIndex === 0 ? "disabled" : ""}>Previous</button>
                <button id="next" \${state.currentStepIndex === state.trace.steps.length - 1 ? "disabled" : ""}>Next</button>
              </div>
              <section class="stepDetail">
                <div class="card">
                  <p class="eyebrow">Current Step</p>
                  \${stackBreadcrumbMarkup}
                  <div class="stepHeading">
                    <h2>\${escapeHtml(currentStep.title)}</h2>
                    <span class="kindBadge" style="--kind-color: \${getKindColor(normalizeKind(currentStep.kind))};">\${escapeHtml(normalizeKind(currentStep.kind))}</span>
                  </div>
                  <p>\${escapeHtml(currentStep.summary)}</p>
                </div>
                <div class="card">
                  <p class="eyebrow">Location</p>
                  <div>Line: \${currentStep.line}</div>
                  <div>Depth: \${currentStep.depth}</div>
                  <div>Kind: \${escapeHtml(currentStep.kind || "call")}</div>
                  <div>Step ID: \${escapeHtml(currentStep.id)}</div>
                </div>
                \${currentStep.code ? \`
                  <div class="card">
                    <p class="eyebrow">Code Snippet</p>
                    <div class="code">\${escapeHtml(currentStep.code)}</div>
                  </div>
                \` : ""}
              </section>
            </main>
          </div>
        \`;

        document.querySelectorAll("[data-step-index]").forEach((button) => {
          button.addEventListener("mousedown", (event) => {
            event.preventDefault();
          });
          button.addEventListener("click", () => {
            const stepIndex = Number(button.getAttribute("data-step-index"));
            vscode.postMessage({ type: "select-step", stepIndex });
          });
        });
        document.getElementById("trace-picker")?.addEventListener("change", (event) => {
          const traceUri = event.target?.value;
          if (traceUri) {
            vscode.postMessage({ type: "select-trace", traceUri });
          }
        });

        document.getElementById("next")?.addEventListener("click", () => vscode.postMessage({ type: "next-step" }));
        document
          .getElementById("previous")
          ?.addEventListener("click", () => vscode.postMessage({ type: "previous-step" }));
        document.querySelector(".sidebar")?.addEventListener("scroll", captureScrollState, { passive: true });
        document.querySelector(".content")?.addEventListener("scroll", captureScrollState, { passive: true });
        window.onkeydown = (event) => {
          const target = event.target;
          const tagName = target?.tagName?.toLowerCase?.();
          if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) {
            return;
          }

          switch (event.key) {
            case "ArrowUp":
              event.preventDefault();
              vscode.postMessage({ type: "previous-step" });
              break;
            case "ArrowDown":
              event.preventDefault();
              vscode.postMessage({ type: "next-step" });
              break;
            case "ArrowLeft":
              event.preventDefault();
              vscode.postMessage({ type: "previous-call-step" });
              break;
            case "ArrowRight":
              event.preventDefault();
              vscode.postMessage({ type: "next-resume-step" });
              break;
            default:
              break;
          }
        };
        initializeResizer();
        restoreScrollState();
        requestAnimationFrame(() => {
          const sidebar = document.querySelector(".sidebar");
          const active = sidebar?.querySelector(".stepButton.active");
          active?.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      }

      function initializeResizer() {
        const layout = document.querySelector(".layout");
        const resizer = document.getElementById("resizer");
        if (!layout || !resizer) {
          return;
        }

        let isDragging = false;

        const updateSidebarWidth = (clientX) => {
          const bounds = layout.getBoundingClientRect();
          if (bounds.width < 280) {
            return;
          }
          const minMain = 200;
          const maxSidebar = Math.max(bounds.width - 8 - minMain, 180);
          const fromPointer = clientX - bounds.left;
          const clamped = Math.max(180, Math.min(fromPointer, maxSidebar));
          layout.style.setProperty("--sidebar-width", \`\${clamped}px\`);
          viewState = { ...viewState, sidebarWidth: clamped };
          vscode.setState(viewState);
        };

        resizer.addEventListener("pointerdown", (event) => {
          isDragging = true;
          resizer.classList.add("isDragging");
          resizer.setPointerCapture(event.pointerId);
          requestAnimationFrame(() => updateSidebarWidth(event.clientX));
        });

        resizer.addEventListener("pointermove", (event) => {
          if (!isDragging) {
            return;
          }
          updateSidebarWidth(event.clientX);
        });

        const stopDragging = (event) => {
          if (!isDragging) {
            return;
          }
          isDragging = false;
          resizer.classList.remove("isDragging");
          if (event.pointerId !== undefined) {
            resizer.releasePointerCapture(event.pointerId);
          }
        };

        resizer.addEventListener("pointerup", stopDragging);
        resizer.addEventListener("pointercancel", stopDragging);
      }

      function renderTree(steps, index, depth, kind) {
        const laneMarkup = Array.from({ length: depth + 1 }, (_, level) => {
          const color = getTreeLaneColor();
          const nodeColor = getKindColor(kind);
          const left = level * 14 + 5;
          if (level !== depth) {
            return \`<span class="treeLane" style="left: \${left}px; background: \${color};"></span>\`;
          }
          return [
            \`<span class="treeLane" style="left: \${left}px; background: \${color};"></span>\`,
            \`<span class="treeNode" style="left: \${left + 0.5}px; background: \${nodeColor};">\${getKindNodeSymbol(kind)}</span>\`,
          ].join("");
        }).join("");
        return laneMarkup;
      }

      function getTreeLaneColor() {
        return "#2ecc71";
      }

      function normalizeKind(kind) {
        return kind || "call";
      }

      function getKindColor(kind) {
        switch (kind) {
          case "enter":
            return "#2ecc71";
          case "return":
            return "#007aff";
          case "resume":
            return "#af52de";
          case "call":
          default:
            return "#ff3b30";
        }
      }

      function getKindNodeSymbol(kind) {
        switch (kind) {
          case "call":
            return "➡";
          case "return":
            return "⬅";
          default:
            return "";
        }
      }

      function getFileName(filePath) {
        const normalized = filePath.replaceAll("\\\\", "/");
        const segments = normalized.split("/");
        return segments[segments.length - 1] || filePath;
      }

      function getSidebarWidth() {
        const raw =
          typeof viewState.sidebarWidth === "number" && Number.isFinite(viewState.sidebarWidth)
            ? viewState.sidebarWidth
            : 320;
        return Math.max(180, Math.min(raw, 900));
      }

      function renderStackBreadcrumb(steps, currentStepIndex) {
        const breadcrumbSteps = [];

        for (let index = 0; index <= currentStepIndex; index += 1) {
          const step = steps[index];
          const kind = normalizeKind(step?.kind);
          if (!step) {
            continue;
          }

          if (kind === "call") {
            breadcrumbSteps.push(step);
            continue;
          }

          if (kind === "resume") {
            const matchingCallIndex = findLastMatchingCallIndex(breadcrumbSteps, step.depth);
            if (matchingCallIndex >= 0) {
              breadcrumbSteps.splice(matchingCallIndex, 1);
            }
          }
        }

        const items = breadcrumbSteps
          .map((step, index) => {
            const isCurrent = index === breadcrumbSteps.length - 1;
            const stackStyle = getStackBlockStyle(step, index, breadcrumbSteps.length);
            return (
              \`<span class="breadcrumbItem \${isCurrent ? "current" : ""}" style="\${stackStyle}">\${escapeHtml(getBreadcrumbLabel(step))}</span>\`
            );
          })
          .join("");

        return items ? \`<div class="breadcrumb">\${items}</div>\` : "";
      }

      function findLastMatchingCallIndex(callStack, depth) {
        for (let index = callStack.length - 1; index >= 0; index -= 1) {
          if ((callStack[index]?.depth ?? -1) === depth) {
            return index;
          }
        }

        return -1;
      }

      function getStackBlockStyle(step, index, total) {
        const kind = normalizeKind(step.kind);
        const ratio = total <= 1 ? 1 : index / (total - 1);
        const palette = getStackPalette(kind, ratio);
        const width = 240;
        return [
          \`--stack-width: \${width}px\`,
          \`--stack-background: \${palette.background}\`,
          \`--stack-border: \${palette.border}\`,
          \`--stack-foreground: \${palette.foreground}\`,
        ].join("; ");
      }

      function getStackPalette(kind, ratio) {
        switch (kind) {
          case "enter":
            return {
              background: \`hsla(338, 64%, \${Math.round(78 - ratio * 8)}%, 0.58)\`,
              border: "transparent",
              foreground: "#6f2343",
            };
          case "return":
            return {
              background: \`hsla(320, 58%, \${Math.round(80 - ratio * 8)}%, 0.56)\`,
              border: "transparent",
              foreground: "#6a2a56",
            };
          case "resume":
            return {
              background: \`hsla(292, 52%, \${Math.round(82 - ratio * 8)}%, 0.56)\`,
              border: "transparent",
              foreground: "#6a2d79",
            };
          case "call":
          default:
            return {
              background: \`hsla(345, 78%, \${Math.round(78 - ratio * 10)}%, 0.62)\`,
              border: "transparent",
              foreground: "#7a1f45",
            };
        }
      }

      function getBreadcrumbLabel(step) {
        const title = step.title || "";
        return (
          title
            .replace(/^(Enter|Call|Return from|Resume at the same)\\s+/i, "")
            .replace(/\\s+call site$/i, "")
            .trim() || title
        );
      }

      function escapeHtml(value) {
        return value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      window.addEventListener("message", (event) => {
        if (event.data?.type === "state") {
          state = event.data.payload;
          render();
        }
      });

      vscode.postMessage({ type: "ready" });
    </script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return value;
}
