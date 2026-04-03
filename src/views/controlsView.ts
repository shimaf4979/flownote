import * as vscode from "vscode";

/** Activity Bar → FlowNote → Flow Controls（ネイティブ TreeView。Webview は使わない） */
export class FlowNoteControlsTreeDataProvider implements vscode.TreeDataProvider<FlowNoteCommandItem> {
  public static readonly viewId = "flownote.controls";

  public getTreeItem(element: FlowNoteCommandItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: FlowNoteCommandItem): Thenable<FlowNoteCommandItem[]> {
    if (element) {
      return Promise.resolve([]);
    }
    return Promise.resolve([
      new FlowNoteCommandItem("Create Example", "flownote.createExampleTodoFiles"),
      new FlowNoteCommandItem("Trace from JSON", "flownote.openTrace"),
      new FlowNoteCommandItem("Copy Plan Explain Prompt", "flownote.copyExplainPlanPrompt"),
      new FlowNoteCommandItem("Copy Structure Explain Prompt", "flownote.copyPromptForAi"),
      new FlowNoteCommandItem("Prev Step", "flownote.previousStep"),
      new FlowNoteCommandItem("Next Step", "flownote.nextStep"),
      new FlowNoteCommandItem("Parent Call", "flownote.previousCallStep"),
      new FlowNoteCommandItem("Parent Resume", "flownote.nextResumeStep"),
    ]);
  }
}

class FlowNoteCommandItem extends vscode.TreeItem {
  public constructor(label: string, commandId: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = commandId;
    this.command = { command: commandId, title: label };
    this.tooltip = label;
  }
}
