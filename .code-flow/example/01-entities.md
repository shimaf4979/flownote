# Entities (Domain Layer)

<!-- TASK: Define Todo as a pure domain model -->
<!-- TASK: Keep this layer independent from framework and DB -->

## TypeScript (Entity)
```ts
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
```

## Domain Rules
- title must not be empty
- completed can only be toggled by domain behavior
- no dependency on UI, API, or persistence details
