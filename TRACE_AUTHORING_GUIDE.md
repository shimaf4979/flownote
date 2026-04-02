# Trace Authoring Guide

`FlowNote` 用の `.code-flow/*.json` を作るときの指針です。

このガイドの目的は、AI が生成した trace を人が読みやすくし、ステップ移動時の意味を揃えることです。

## 基本方針

- 1ステップには 1つの意味だけを書く
- 「今いる関数」と「次に呼ぶ関数」は同じステップに混ぜない
- `return` は独立したステップとして書く
- `resume` は親の call site に復帰したことを示す独立したステップとして書く
- 深く入った関数は、その関数の `return` まで追い、その後は親の同じ関数に戻ってフローを継続する
- `call` を書いたら、その子関数の `return` と、親の同じ call site に戻る `resume` を必ず書く
- ハイライトしたい対象に合わせて `range` を細かく指定する
- 人が追って理解しやすい主経路を優先する

## ステップの分け方

次の3つは、できるだけ別ステップに分けます。

1. 関数に入る
2. その関数から別の関数を呼ぶ
3. 関数から return する
4. 親関数の call site に戻る
5. 親関数に戻ったあと、その続きの処理を追う

つまり、デフォルトでは以下を別フローとして扱います。

- 関数呼び出し
- 関数の説明
- return

## 推奨パターン

### 1. 関数そのものを説明するステップ

- `kind: enter` を使う
- 「いま入った関数で何をするか」を書く
- ここで「次に save() を呼ぶ」などの downstream call は書かない
- `range` は、その関数の最終 `return` 行まで、または `void` 関数なら関数末尾まで含める

例:

```json
{
  "id": "step-5",
  "file": "src/usecases/AddTodoUseCase.ts",
  "line": 11,
  "title": "Enter AddTodoUseCase.execute",
  "summary": "Enter execute() and validate input before creating the Todo entity.",
  "depth": 2,
  "kind": "enter",
  "next": "step-6",
  "range": {
    "startLine": 11,
    "endLine": 24
  }
}
```

### 2. その関数から呼ぶ先を示すステップ

- `kind: call` を使う
- `Call ...` というタイトルにすると分かりやすい
- 呼び出し先の関数名だけをハイライトしたいなら `startColumn` / `endColumn` を入れる

例:

```json
{
  "id": "step-6",
  "file": "src/usecases/AddTodoUseCase.ts",
  "line": 23,
  "title": "Call todoRepository.save",
  "summary": "execute() calls todoRepository.save(todo) at this line before stepping into the repository.",
  "depth": 2,
  "kind": "call",
  "next": "step-7",
  "range": {
    "startLine": 23,
    "endLine": 23,
    "startColumn": 31,
    "endColumn": 34
  }
}
```

このステップは「save を呼ぶ場所」を見せるためのものです。  
関数本体の説明とは分け、`call` にします。

### 3. 呼ばれた関数に入るステップ

- `kind: enter` を使う
- 実際に遷移した先の関数を別ステップで書く

例:

```json
{
  "id": "step-7",
  "file": "src/infrastructure/InMemoryTodoRepository.ts",
  "line": 7,
  "title": "Enter InMemoryTodoRepository.save",
  "summary": "Enter save() and append the Todo to the in-memory list.",
  "depth": 3,
  "kind": "enter",
  "next": "step-8",
  "range": {
    "startLine": 7,
    "endLine": 9
  }
}
```

### 4. return を示すステップ

- `kind: return` を使う
- `return` 文そのもの、または関数終了位置をハイライトする
- `void` を返す関数でも、親へ制御を返すため `return` は必ず書く
- 「子関数の終わり」と「親の call site に戻る」は分ける

例:

```json
{
  "id": "step-8",
  "file": "src/infrastructure/InMemoryTodoRepository.ts",
  "line": 7,
  "title": "Return from InMemoryTodoRepository.save",
  "summary": "save() finishes and returns control to its caller, even though the return type is void.",
  "depth": 3,
  "kind": "return",
  "next": "step-9",
  "range": {
    "startLine": 7,
    "endLine": 9
  }
}
```

### 5. 親の call site に戻る `resume` ステップ

- `kind: resume` を使う
- 子関数の `return` のあとに、親関数の同じ call site に戻ったことを書く
- そのあとで初めて親関数の次の行へ進む

例:

```json
{
  "id": "step-9",
  "file": "src/usecases/AddTodoUseCase.ts",
  "line": 23,
  "title": "Resume at the same save call site",
  "summary": "After save() returns, the flow comes back to the same await this.todoRepository.save(todo); line in execute().",
  "depth": 2,
  "kind": "resume",
  "next": "step-10",
  "range": {
    "startLine": 23,
    "endLine": 23,
    "startColumn": 16,
    "endColumn": 40
  }
}
```

## 何を同じステップに書かないか

次のような書き方は避けます。

```json
{
  "title": "AddTodoUseCase.execute",
  "summary": "Validate input, create a todo, call save(), and return the created entity."
}
```

これは1ステップに意味が多すぎます。

代わりに、次のように分けます。

- `enter`: execute() に入る
- `call`: save() を呼ぶ
- `enter`: save() に入る
- `return`: save() が終わる
- `resume`: 親の save call site に戻る
- `return`: execute() から戻る

## 親関数へ戻るところまで書く

関数を深くたどった場合は、子関数の中だけで終わらせません。

たとえば `createTodoController()` から `AddTodoUseCase.execute()` に入り、さらに `todoRepository.save()` に入ったなら、基本は次の順で戻します。

1. `enter`: `createTodoController()`
2. `call`: `AddTodoUseCase.execute()` を呼ぶ
3. `enter`: `AddTodoUseCase.execute()`
4. `call`: `todoRepository.save()` を呼ぶ
5. `enter`: `todoRepository.save()`
6. `return`: `todoRepository.save()` が終わる
7. `resume`: `await this.todoRepository.save(todo);` の同じ場所へ戻る
8. `return`: `AddTodoUseCase.execute()` が終わる
9. `resume`: `await addTodoUseCase.execute(...)` の同じ場所へ戻る
10. 親関数に戻った後の次の意味ある `call` または `return` を書く

つまり、深く入ったら「子関数が終わる」と「親の call site に戻る」を分けて書くのがデフォルトです。

基本の並びはこれです。

1. `call`
2. `enter`
3. `return`
4. `resume`
5. 親関数の次の処理

もし親関数の次の処理がさらに別の関数呼び出しなら、自然に次の形になります。

1. `call`
2. `enter`
3. `return`
4. `resume`
5. `call`

つまり、`call -> enter -> return -> resume -> call` の並びは、いったん同じ親の call site に戻ってから次の子呼び出しへ進んでいることを表します。

避けたいパターン:

- 子関数の `enter` だけ書いて終わる
- 一番深い関数の `return` で trace が終わる
- 親関数へ戻った後の処理が抜ける
- `call` はあるのに、それに対応する `return` がない
- `return` のあとに対応する `resume` がない
- `resume` があっても、どの親関数のどの call site に戻ったのか分からない
- `call -> enter -> return` のあとに `resume` を書かずに次の `call` へ飛ぶ

## `return` の書き方

`return` は「子関数が終わった」という事実を書きます。  
親のどの call site に戻ったかは `resume` に書きます。

良い例:

- `save() finishes and returns control to its caller.`
- `execute() finishes and returns the created Todo.`

避けたい例:

- `save() finishes.`
- `Return from child function.`

このような短すぎる表現だと、子関数がどう終わったのかが分かりません。

## `resume` の書き方

`resume` は「親のどの call site に戻ったか」を書きます。

良い例:

- `After todoRepository.save() returns, the flow comes back to the same await this.todoRepository.save(todo); line in execute().`
- `After AddTodoUseCase.execute() returns, the flow comes back to the same await addTodoUseCase.execute(...) line in createTodoController().`

## range の使い分け

### 関数全体を見せたいとき

- `startLine` と `endLine` だけを使う

### 呼び出し箇所だけ見せたいとき

- 同じ行に対して `startColumn` と `endColumn` も使う
- `save()` や `execute()` の関数名だけを狙う

### return だけ見せたいとき

- `return` 文そのものに列範囲を付ける
- 返却オブジェクト全体を見せたい場合だけ複数行にする

## title の書き方

おすすめの型は以下です。

- `Enter createTodoController`
- `Call AddTodoUseCase.execute`
- `Enter AddTodoUseCase.execute`
- `Call todoRepository.save`
- `Return created todo`

避けたい書き方:

- `Controller stuff`
- `Process todo`
- `Various logic`

## summary の書き方

- 1文か2文で短く書く
- 実際にそのステップで起きていることだけを書く
- 先の処理や別の関数の話を混ぜない

良い例:

- `Enter createTodoController() and map the request into the use case input.`
- `createTodoController() calls AddTodoUseCase.execute() with the request title.`
- `Return from AddTodoUseCase.execute() with the created Todo.`
- `After AddTodoUseCase.execute() returns, createTodoController() resumes in the same parent function.`

悪い例:

- `This function does many things like validation, persistence, response shaping, and then eventually returns.`

## code スニペットのコメント規則

`code:` を使う場合は、説明コメントをコード行の末尾に付けず、上の行に置きます。

良い例:

```json
{
  "code": "// Persist the Todo through the repository abstraction.\nawait this.todoRepository.save(todo);"
}
```

悪い例:

```json
{
  "code": "await this.todoRepository.save(todo); // Persist the Todo through the repository abstraction."
}
```

## 最小チェックリスト

JSON を作るときは、最低限これを確認します。

- 各ステップは 1つの意味に絞られているか
- `enter` と `call` と `return` と `resume` が混ざっていないか
- 呼び出し先の関数名を見せたい箇所に列範囲が付いているか
- `return` ステップが独立しているか
- `call` のあとに対応する `return` と `resume` があるか
- `next` と `parentStepId` が読みやすい流れになっているか

## おすすめのデフォルト分割

迷ったら、基本は次の順に分けるのがおすすめです。

1. `enter` で今いる関数を説明
2. `call` でそこから呼ぶ関数を示す
3. 呼ばれた先を `enter` で説明
4. `return` で子関数が終わることを書く
5. `resume` で親の call site に戻ることを書く
6. 親関数に戻った後の次の処理を書く
7. 最後に親関数自身の `return` を書く

親関数で次に別の関数を呼ぶなら、`6` はそのまま次の `call` になります。

この分け方にしておくと、AI が生成しても人が後で直しても、trace 全体の読み方が揃います。
