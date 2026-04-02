# Use Cases (Application Layer)

<!-- TASK: Orchestrate entities through ports -->
<!-- TASK: No direct DB access in use cases -->

## TypeScript (Use Case)
```ts
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
```
