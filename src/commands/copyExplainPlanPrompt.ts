import * as vscode from "vscode";

/**
 * Builds the clipboard text for **Copy Prompt to Explain AI Plan / Changes**.
 * Same block layout as **Copy Prompt for AI**, plus workspace context and a final paste area
 * for the other AI’s output to explain.
 */
export async function copyExplainPlanPrompt(): Promise<void> {
  const activeEditor = vscode.window.activeTextEditor;
  const workspaceFolder =
    activeEditor != null
      ? vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
      : vscode.workspace.workspaceFolders?.[0];

  const relativeFilePath =
    activeEditor && workspaceFolder
      ? vscode.workspace.asRelativePath(activeEditor.document.uri, false)
      : "src/path/to/entry.ts";

  const entryLine = activeEditor ? activeEditor.selection.active.line + 1 : 1;

  const workspaceLabel = workspaceFolder
    ? `${workspaceFolder.name} — ${workspaceFolder.uri.fsPath}`
    : "(no folder open)";

  const prompt = `Prompt structure (for humans — skim so you know what each block is):
1. Assistant task — explain **another AI’s output** pasted at the end; use the trace spec below when the paste is FlowNote trace JSON
2. Requirements — rules for valid trace JSON (same as “Copy Prompt for AI”)
3. Output path — where generated traces are saved
4. Trace schema v1 — JSON shape example (entry + steps)
5. Entrypoint — current file/line (filled by FlowNote)
6. Context — workspace folder (reference)
7. After the final "---" — paste the **real** other-AI output you want explained

プロンプトの構成: 1.説明タスク 2.要件 3.出力パス 4.スキーマ例 5.エントリ 6.文脈 7.---のあとに貼り付け

---
You are the assistant. Follow every instruction below exactly when responding. The user will paste **another AI’s output** after the final "---". Explain that material: intent, concrete proposals, risks, and what to verify. Base your explanation only on that paste. Do not invent changes not present there.

When the paste is (or includes) FlowNote trace JSON, judge it using the Requirements, schema, and entrypoint below.

（最後の---以降に貼られた別AIの出力を説明してください。trace JSON のときは下記の要件・スキーマ・エントリに照らして評価してください。）

You are helping a developer understand material produced by another AI (plan, diff, code, trace JSON, etc.).

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

Entrypoint (use this as trace entry and as the starting step context):
- file: ${relativeFilePath}
- line: ${entryLine}

Context (workspace — reference when interpreting the paste):
- Workspace folder: ${workspaceLabel}

---
（利用者が追記）Paste the **real** other-AI output to explain (then send the full message):

`;

  await vscode.env.clipboard.writeText(prompt);
  void vscode.window.showInformationMessage(
    "FlowNote: copied explain prompt. Paste the other AI’s output at the end, then send.",
  );
}
