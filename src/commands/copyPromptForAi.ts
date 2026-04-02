import * as vscode from "vscode";

export async function copyPromptForAi(): Promise<void> {
  const activeEditor = vscode.window.activeTextEditor;
  const workspaceFolder = activeEditor
    ? vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
    : vscode.workspace.workspaceFolders?.[0];

  const relativeFilePath =
    activeEditor && workspaceFolder
      ? vscode.workspace.asRelativePath(activeEditor.document.uri, false)
      : "src/path/to/entry.ts";

  const entryLine = activeEditor ? activeEditor.selection.active.line + 1 : 1;

  const prompt = `Trace the code flow from the entrypoint below and generate a .code-flow JSON file.

Requirements:
- Follow the trace schema exactly.
- Focus on the main execution path.
- Use concise titles and accurate summaries.
- Do not invent runtime values that are not visible in code.
- Prefer important function calls over trivial statements.
- For call / enter / return / resume steps, describe the function actually being entered, exited, or resumed.
- For \`enter\` steps, make the highlighted range cover the whole function body through its final return line, or through the function end when it returns void.
- When the flow steps into a deeper function, continue tracing until that function returns, then resume the parent function and keep tracing there.
- Every \`call\` step should have a matching child \`return\` step, even when the child function returns \`void\`.
- After that child \`return\`, add a separate \`resume\` step on the same parent call site before moving to the next line below it.
- Prefer the sequence \`call -> enter -> return -> resume -> next parent step\`. If the parent immediately makes another child call, keep the order as \`call -> enter -> return -> resume -> call\`.
- If you need to show the exact function call made from the current step, write it as a separate call step right after the current step.
- If you want to highlight only a called symbol like save() or execute(), include range.startColumn and range.endColumn.
- If you add explanatory comments in a code snippet, put the comment on the line above the code. Do not append trailing comments at the end of the code line.

Output path:
.code-flow/generated-trace.json

Trace schema v1:
\`\`\`json
{
  "version": 1,
  "name": "Example trace",
  "description": "Optional short description",
  "entry": {
    "file": "${relativeFilePath}",
    "line": ${entryLine}
  },
  "steps": [
    {
      "id": "step-1",
      "file": "${relativeFilePath}",
      "line": ${entryLine},
      "title": "Step title",
      "summary": "Enter the current function and explain what happens here.",
      "depth": 0,
      "kind": "enter",
      "next": "step-2",
      "range": {
        "startLine": ${entryLine},
        "endLine": ${entryLine}
      }
    },
    {
      "id": "step-2",
      "file": "${relativeFilePath}",
      "line": ${entryLine},
      "title": "Call from current function",
      "summary": "Show the exact downstream call site here instead of mixing it into the enter step.",
      "depth": 0,
      "kind": "call",
      "next": "step-3",
      "range": {
        "startLine": ${entryLine},
        "endLine": ${entryLine},
        "startColumn": 1,
        "endColumn": 10
      }
    },
    {
      "id": "step-3",
      "file": "${relativeFilePath}",
      "line": ${entryLine},
      "title": "Return from child function",
      "summary": "Record that the child function exits here, even if it returns void.",
      "depth": 1,
      "kind": "return",
      "next": "step-4",
      "range": {
        "startLine": ${entryLine},
        "endLine": ${entryLine}
      }
    },
    {
      "id": "step-4",
      "file": "${relativeFilePath}",
      "line": ${entryLine},
      "title": "Resume at the same parent call site",
      "summary": "After the child return, explicitly record that the flow resumes on the same parent call line before tracing the next line below it.",
      "depth": 0,
      "kind": "resume",
      "range": {
        "startLine": ${entryLine},
        "endLine": ${entryLine}
      }
    }
  ]
}
\`\`\`

Entrypoint:
- file: ${relativeFilePath}
- line: ${entryLine}

What I am to explore >>
`;

  await vscode.env.clipboard.writeText(prompt);
  void vscode.window.showInformationMessage("FlowNote: copied prompt template for AI.");
}
