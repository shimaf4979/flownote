import * as vscode from "vscode";

const EXAMPLE_ROOT_DIR = ".code-flow/example";
const TRACE_EXAMPLE_PATH = ".code-flow/example/example.json";

export async function createExampleTodoFiles(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    void vscode.window.showWarningMessage("FlowNote: open a workspace first.");
    return;
  }

  const traceUri = vscode.Uri.joinPath(workspaceFolder.uri, TRACE_EXAMPLE_PATH);
  const exampleDirUri = vscode.Uri.joinPath(workspaceFolder.uri, EXAMPLE_ROOT_DIR);

  await vscode.workspace.fs.createDirectory(exampleDirUri);

  await vscode.workspace.fs.writeFile(traceUri, Buffer.from(buildTraceExampleJson(), "utf8"));
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(exampleDirUri, "01-entities.md"),
    Buffer.from(buildEntitiesMarkdown(), "utf8"),
  );
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(exampleDirUri, "02-use-cases.md"),
    Buffer.from(buildUseCasesMarkdown(), "utf8"),
  );
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(exampleDirUri, "03-interfaces.md"),
    Buffer.from(buildInterfacesMarkdown(), "utf8"),
  );

  void vscode.window.showInformationMessage(
    "FlowNote: created .code-flow/example/example.json and .code-flow/example/*.md files.",
  );
}

function buildTraceExampleJson(): string {
  const trace = {
    version: 1,
    name: "Todo Clean Architecture (Markdown TS Walkthrough)",
    description:
      "Line/column ranges match the generated markdown. Single-line calls use startColumn/endColumn (1-based, end is exclusive like VS Code).",
    entry: {
      file: ".code-flow/example/02-use-cases.md",
      line: 18,
    },
    steps: [
      {
        id: "step-1",
        file: ".code-flow/example/02-use-cases.md",
        line: 18,
        title: "Enter createTodoUseCase",
        summary: "Highlight only the async use case function (application layer).",
        depth: 0,
        kind: "enter",
        next: "step-2",
        range: {
          startLine: 18,
          endLine: 29,
        },
      },
      {
        id: "step-2",
        file: ".code-flow/example/02-use-cases.md",
        line: 26,
        title: "Call createTodo",
        summary: "Narrow highlight on the createTodo(...) invocation only.",
        depth: 0,
        kind: "call",
        next: "step-3",
        range: {
          startLine: 26,
          endLine: 26,
          startColumn: 16,
          endColumn: 48,
        },
      },
      {
        id: "step-3",
        file: ".code-flow/example/01-entities.md",
        line: 14,
        title: "Enter createTodo",
        summary: "Highlight the full domain factory function body.",
        depth: 1,
        kind: "enter",
        next: "step-4",
        range: {
          startLine: 14,
          endLine: 24,
        },
      },
      {
        id: "step-4",
        file: ".code-flow/example/01-entities.md",
        line: 16,
        title: "Call invariant guard",
        summary: "Highlight the if/throw guard inside createTodo.",
        depth: 1,
        kind: "call",
        next: "step-5",
        range: {
          startLine: 16,
          endLine: 18,
        },
      },
      {
        id: "step-5",
        file: ".code-flow/example/01-entities.md",
        line: 19,
        title: "Return new Todo",
        summary: "Highlight the return object literal from createTodo.",
        depth: 1,
        kind: "return",
        next: "step-6",
        range: {
          startLine: 19,
          endLine: 23,
        },
      },
      {
        id: "step-6",
        file: ".code-flow/example/02-use-cases.md",
        line: 26,
        title: "Resume after createTodo",
        summary: "Back to the parent call site on the same line.",
        depth: 0,
        kind: "resume",
        next: "step-7",
        range: {
          startLine: 26,
          endLine: 26,
          startColumn: 16,
          endColumn: 48,
        },
      },
      {
        id: "step-7",
        file: ".code-flow/example/02-use-cases.md",
        line: 27,
        title: "Call repository.save",
        summary: "Highlight only save(todo) on the repository port.",
        depth: 0,
        kind: "call",
        next: "step-8",
        range: {
          startLine: 27,
          endLine: 27,
          startColumn: 25,
          endColumn: 34,
        },
      },
      {
        id: "step-8",
        file: ".code-flow/example/03-interfaces.md",
        line: 14,
        title: "Enter InMemoryTodoRepository.save",
        summary: "Highlight the async save method implementation.",
        depth: 1,
        kind: "enter",
        next: "step-9",
        range: {
          startLine: 14,
          endLine: 17,
        },
      },
      {
        id: "step-9",
        file: ".code-flow/example/03-interfaces.md",
        line: 16,
        title: "Call Map.set",
        summary: "Highlight this.store.set(...) inside the adapter.",
        depth: 1,
        kind: "call",
        next: "step-10",
        range: {
          startLine: 16,
          endLine: 16,
          startColumn: 16,
          endColumn: 40,
        },
      },
      {
        id: "step-10",
        file: ".code-flow/example/03-interfaces.md",
        line: 17,
        title: "Return from save",
        summary: "Closing brace for the save method.",
        depth: 1,
        kind: "return",
        next: "step-11",
        range: {
          startLine: 17,
          endLine: 17,
        },
      },
      {
        id: "step-11",
        file: ".code-flow/example/02-use-cases.md",
        line: 27,
        title: "Resume after save",
        summary: "Back to the await line after the adapter returns.",
        depth: 0,
        kind: "resume",
        next: "step-12",
        range: {
          startLine: 27,
          endLine: 27,
          startColumn: 25,
          endColumn: 34,
        },
      },
      {
        id: "step-12",
        file: ".code-flow/example/02-use-cases.md",
        line: 28,
        title: "Call presenter.presentCreateResult",
        summary: "Highlight only the presenter call expression.",
        depth: 0,
        kind: "call",
        next: "step-13",
        range: {
          startLine: 28,
          endLine: 28,
          startColumn: 25,
          endColumn: 49,
        },
      },
      {
        id: "step-13",
        file: ".code-flow/example/03-interfaces.md",
        line: 21,
        title: "Enter presentCreateResult",
        summary: "Highlight the presenter method implementation.",
        depth: 1,
        kind: "enter",
        next: "step-14",
        range: {
          startLine: 21,
          endLine: 28,
        },
      },
      {
        id: "step-14",
        file: ".code-flow/example/03-interfaces.md",
        line: 23,
        title: "Return response object",
        summary: "Highlight the object literal returned to the use case.",
        depth: 1,
        kind: "call",
        next: "step-15",
        range: {
          startLine: 23,
          endLine: 27,
        },
      },
      {
        id: "step-15",
        file: ".code-flow/example/03-interfaces.md",
        line: 28,
        title: "Return from presenter method",
        summary: "Closing brace for presentCreateResult.",
        depth: 1,
        kind: "return",
        next: "step-16",
        range: {
          startLine: 28,
          endLine: 28,
        },
      },
      {
        id: "step-16",
        file: ".code-flow/example/02-use-cases.md",
        line: 28,
        title: "Resume use case return line",
        summary: "Back on the return line after the presenter finishes.",
        depth: 0,
        kind: "resume",
        range: {
          startLine: 28,
          endLine: 28,
          startColumn: 25,
          endColumn: 49,
        },
      },
    ],
  };

  return `${JSON.stringify(trace, null, 2)}\n`;
}

function buildEntitiesMarkdown(): string {
  return `# Entities (Domain Layer)

<!-- TASK: Define Todo as a pure domain model -->
<!-- TASK: Keep this layer independent from framework and DB -->

## TypeScript (Entity)
\`\`\`ts
export type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

export function createTodo(id: string, title: string): Todo {
  // TASK: enforce domain invariant
  if (!title.trim()) {
    throw new Error("title is required");
  }
  return {
    id,
    title: title.trim(),
    completed: false,
  };
}
\`\`\`

## Domain Rules
- title must not be empty
- completed can only be toggled by domain behavior
- no dependency on UI, API, or persistence details
`;
}

function buildUseCasesMarkdown(): string {
  return `# Use Cases (Application Layer)

<!-- TASK: Orchestrate entities through ports -->
<!-- TASK: No direct DB access in use cases -->

## TypeScript (Use Case)
\`\`\`ts
import { createTodo, type Todo } from "./entities";

export interface TodoRepository {
  save(todo: Todo): Promise<void>;
}

export interface TodoPresenter {
  presentCreateResult(todo: Todo): { id: string; title: string; completed: boolean };
}

export async function createTodoUseCase(
  input: { id: string; title: string },
  deps: { repository: TodoRepository; presenter: TodoPresenter },
) {
  // TASK: validate input in application layer
  if (!input.title?.trim()) {
    throw new Error("invalid input");
  }
  const todo = createTodo(input.id, input.title);
  await deps.repository.save(todo);
  return deps.presenter.presentCreateResult(todo);
}
\`\`\`
`;
}

function buildInterfacesMarkdown(): string {
  return `# Interface Adapters (Boundary Layer)

<!-- TASK: Implement ports in infrastructure -->
<!-- TASK: Map external data shape to domain shape -->

## TypeScript (Adapters)
\`\`\`ts
import type { Todo } from "./entities";
import type { TodoPresenter, TodoRepository } from "./use-cases";

export class InMemoryTodoRepository implements TodoRepository {
  private readonly store = new Map<string, Todo>();

  async save(todo: Todo): Promise<void> {
    // TASK: isolate persistence details in adapter
    this.store.set(todo.id, { ...todo });
  }
}

export class JsonTodoPresenter implements TodoPresenter {
  presentCreateResult(todo: Todo) {
    // TASK: shape response model for delivery layer
    return {
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
    };
  }
}
\`\`\`

## Adapter Notes
- infrastructure implementations satisfy these ports
- controllers/presenters adapt input-output models
- use cases depend only on interfaces
`;
}
