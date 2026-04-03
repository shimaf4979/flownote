# FlowNote

FlowNote is a VS Code extension for viewing AI-generated `.code-flow/*.json` traces in a debugger-like workflow.

## Demo

**Step through a trace** — Use **Flow Controls** (Prev / Next, Parent Call / Parent Resume) while the editor highlights the current step.

![Step through a code flow with Flow Controls](trace003.gif)

**Copy Prompt for AI** — Generate a trace from your entrypoint, then step the resulting flow in the list and editor.


## MVP features

- Open a trace file from `.code-flow/*.json`
- Inspect steps in the **Flow Controls** view (activity bar) and switch traces from the in-panel selector
- Move with **Next** / **Previous**, and jump parent call / resume with **Previous Parent Call** / **Next Parent Resume**
- Highlight the current line or range in the editor
- Copy an AI prompt template for generating new JSON trace files (**Copy Structure Explain Prompt** / **Copy Prompt for AI**)
- Copy a prompt for AI to explain **another AI’s** plan or changes (**Copy Plan Explain Prompt** — includes the same trace Requirements / schema / entrypoint as the structure prompt, then paste the other AI’s output at the end)
- Optional: scaffold a Todo clean-architecture markdown example via **Create Todo Example Files**

## Trace schema v1

```json
{
  "version": 1,
  "name": "OCR job flow",
  "entry": {
    "file": "src/jobs/run-ocr.ts",
    "line": 12
  },
  "steps": [
    {
      "id": "step-1",
      "file": "src/jobs/run-ocr.ts",
      "line": 12,
      "title": "Run OCR job",
      "summary": "Enter runOcrJob() and prepare the job context.",
      "depth": 0,
      "kind": "enter",
      "next": "step-2"
    },
    {
      "id": "step-2",
      "parentStepId": "step-1",
      "file": "src/jobs/run-ocr.ts",
      "line": 18,
      "title": "Call buildExecutor from runOcrJob",
      "summary": "Show the concrete buildExecutor() call site before stepping into the child function.",
      "depth": 0,
      "kind": "call",
      "next": "step-3",
      "range": {
        "startLine": 18,
        "endLine": 18,
        "startColumn": 5,
        "endColumn": 17
      }
    },
    {
      "id": "step-3",
      "parentStepId": "step-1",
      "file": "src/ocr/executor.ts",
      "line": 44,
      "title": "Build executor",
      "summary": "Enter buildExecutor() and construct the OCR executor with dependencies.",
      "depth": 1,
      "kind": "enter",
      "next": "step-4"
    },
    {
      "id": "step-4",
      "parentStepId": "step-1",
      "file": "src/ocr/executor.ts",
      "line": 44,
      "title": "Return from buildExecutor",
      "summary": "Record that buildExecutor() exits here, even if the parent will handle the returned value later.",
      "depth": 1,
      "kind": "return",
      "next": "step-5"
    },
    {
      "id": "step-5",
      "parentStepId": "step-1",
      "file": "src/jobs/run-ocr.ts",
      "line": 18,
      "title": "Resume runOcrJob at the same call site",
      "summary": "After buildExecutor() returns, the flow comes back to the same buildExecutor() call line in runOcrJob().",
      "depth": 0,
      "kind": "resume",
      "next": "step-6"
    },
    {
      "id": "step-6",
      "parentStepId": "step-1",
      "file": "src/jobs/run-ocr.ts",
      "line": 19,
      "title": "Call execute from runOcrJob",
      "summary": "After returning to the parent function, trace the next child call from the same runOcrJob() flow.",
      "depth": 0,
      "kind": "call"
    }
  ]
}
```

Recommended writing rules:

- A `call` / `enter` / `return` / `resume` step should describe the function you are actually in at that moment.
- Do not mix "what this function does" and "what it will call next" in the same step title.
- If you want to show a downstream function call from the current function, add a separate `kind: call` step right after it.
- For `kind: enter`, prefer a range that covers the whole function body through its final return line, or the function end for void functions.
- When a step enters a deeper function, keep tracing until that child function returns, then continue with the next meaningful step in the parent function.
- Each `kind: call` should be paired with a child `kind: return` step, even when the child returns `void`.
- After that child `return`, add a `kind: resume` step on the same parent call site, and only then move to the next line below.
- The default shape is `call -> enter -> return -> resume -> next parent step`, and if the next parent step is another child call then it becomes `call -> enter -> return -> resume -> call`.
- Use `kind: call` for concrete call sites such as `Call AddTodoUseCase.execute` or `Call todoRepository.save`.
- When you want to highlight only a call site like `save()` or `execute()`, use `range.startColumn` and `range.endColumn` on the same line.
- If you include a `code:` snippet with explanatory comments, write the comment on the line above the code you are describing, not as a trailing inline comment.

UI note:

- `kind` is color-coded in the sidebar, detail panel, and code highlight so `enter`, `call`, `return`, and `resume` are easier to distinguish while stepping.

## Commands

- `FlowNote: Open Trace`
- `FlowNote: Next Step`
- `FlowNote: Previous Step`
- `FlowNote: Previous Parent Call`
- `FlowNote: Next Parent Resume`
- `FlowNote: Copy Prompt for AI`
- `FlowNote: Copy Prompt to Explain AI Plan / Changes`
- `FlowNote: Create Todo Example Files`

With the Flow Controls webview focused, arrow keys move steps: Up/Down for previous/next step, Left/Right for parent call / parent resume.

## Workflow

1. Open a source file and place the cursor on the entrypoint.
2. Run `FlowNote: Copy Prompt for AI`.
3. Ask your preferred AI to generate `.code-flow/generated-trace.json`.
4. Run `FlowNote: Open Trace`.
5. Move through the trace in the Flow Controls tab and inspect highlighted code.

Optional: run `FlowNote: Create Todo Example Files` to scaffold `.code-flow/example/` markdown and a sample trace for trying the UI.

## Development

```bash
pnpm install
pnpm check
pnpm build
```

Optional: `pnpm lint`, `pnpm format` (see `package.json` scripts).

Press `F5` in VS Code to launch the extension development host.