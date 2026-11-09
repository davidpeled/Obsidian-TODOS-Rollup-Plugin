# Architecture

Domain-driven, with ports and adapters. Dependencies point inward:

```
infrastructure ─┐
presentation ───┼─▶ application ─▶ domain
main.ts ────────┘
```

| Layer | Holds | May import |
|---|---|---|
| `src/domain` | Entities and rules: `Task`, `NoteMeta`, parsing, toggling, calendar buckets, settings validation, and the **ports** (`NoteRepository`, `NoteOpener`, `Notifier`, `Clock`). | itself |
| `src/application` | `TodoBoard`: the use cases (refresh, filter, search, toggle) and the state they need. No DOM. | domain |
| `src/presentation` | Framework-free DOM components that render a `TodoBoard`. | domain, application |
| `src/infrastructure/obsidian` | Adapters: `VaultNoteRepository`, `WorkspaceNoteOpener`, `TodoView`, settings tab. The only code that imports `obsidian`. | everything inward |
| `src/main.ts` | Plugin entry and composition root. | everything |
| `demo/` | A second set of adapters (`InMemoryNoteRepository`, a mock Obsidian shell). | `src/` except `infrastructure/obsidian` |

## Rules (enforced by `src/architecture.test.ts`)
- Layers only import inward, and only `infrastructure/` and `main.ts` import `obsidian`.
- `domain` and `application` never touch the DOM.
- `src/` never imports `demo/`, and `demo/` never imports the Obsidian adapters.
- No `innerHTML`, `outerHTML` or `insertAdjacentHTML`.

## Linting
`npm run lint` runs [Oxlint](https://oxc.rs) with `.oxlintrc.json`. It is used instead of ESLint because typescript-eslint does not support TypeScript 7. It checks correctness, `eqeqeq`/`prefer-const`, `import/no-cycle`, consistent type imports and no `any`. It also enforces the layer boundaries with per-folder `no-restricted-imports`, which duplicates `src/architecture.test.ts` on purpose so violations show up in the editor as you type. `unicorn/no-array-sort` is off because `toSorted()` is ES2023 and the bundle targets ES2018.

## Behaviour worth knowing
- **Writes:** the only write is `NoteRepository.toggleTask`. The Obsidian adapter uses atomic `vault.process` after `toggleTaskInContent` verifies the line. Identical lines are told apart by order and refused if their count changed.
- **Scaling limit:** a relevant note change rescans every note that has tasks (reads and parses are cached). Edits to notes without tasks are ignored.
- **Optimistic UI:** `TodoBoard.toggle` sets the optimistic state before its first `await`, so the row updates instantly; the view animates the row away in the `settle` callback after the write succeeds.

## Tests
Tests are colocated with the code (`*.test.ts`) and run with `npm test`. `tsconfig.build.json` excludes them from the production type-check, and esbuild only bundles what `src/main.ts` imports, so they never ship. The `TodoPage` tests run on happy-dom; `demo/in-memory-note-repository.test.ts` is the `NoteRepository` contract test.
