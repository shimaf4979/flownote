import * as vscode from "vscode";

export class FlowNoteControlsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "flownote.controls";
  private view?: vscode.WebviewView;
  private initialized = false;

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    if (!this.initialized) {
      this.initialized = true;
      webviewView.webview.html = this.getHtml(webviewView.webview);
    }
    webviewView.webview.onDidReceiveMessage((message: { type: "run"; command: string }) => {
      if (message.type !== "run") {
        return;
      }
      void vscode.commands.executeCommand(message.command);
    });
    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
      this.initialized = false;
    });
  }

  private getHtml(_webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowNote Controls</title>
  <style>
    body {
      margin: 0;
      padding: 12px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    button {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 6px;
      background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 12px;
      text-align: center;
    }
    button:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground));
    }
  </style>
</head>
<body>
  <div class="stack">
    <button data-command="flownote.createExampleTodoFiles">Create Example</button>
    <button data-command="flownote.openTrace">Trace from JSON</button>
    <button data-command="flownote.copyExplainPlanPrompt">Copy Plan Explain Prompt</button>
    <button data-command="flownote.copyPromptForAi">Copy Structure Explain Prompt</button>
    <button data-command="flownote.previousStep">👆 Prev</button>
    <button data-command="flownote.nextStep">👇 Next</button>
    <button data-command="flownote.previousCallStep">👈 Parent Call</button>
    <button data-command="flownote.nextResumeStep">👉 Parent Resume</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("click", () => {
        const command = button.getAttribute("data-command");
        if (!command) {
          return;
        }
        vscode.postMessage({ type: "run", command });
      });
    });
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
