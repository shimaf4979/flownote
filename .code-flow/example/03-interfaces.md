# Interface Adapters (Boundary Layer)

<!-- TASK: Implement ports in infrastructure -->
<!-- TASK: Map external data shape to domain shape -->

## TypeScript (Adapters)
```ts
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
```

## Adapter Notes
- infrastructure implementations satisfy these ports
- controllers/presenters adapt input-output models
- use cases depend only on interfaces
