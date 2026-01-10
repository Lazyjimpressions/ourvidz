# Codex Review Workflow

Use this as a lightweight checklist for using Codex to review recent changes.

## Scope First
- Pick a clear scope: last 1-3 commits, or a specific file/module.
- State the goal: TypeScript errors, risky logic changes, missing tests.

## Diff Review Pass
- Ask Codex to review `git show <sha>` or a file diff for risky changes.
- Focus on type boundaries, null/undefined handling, and API contracts.

## Type and Lint Pass
- Run `npm run build` (or add a `typecheck` script if needed).
- Run `npm run lint` for ESLint issues and unsafe patterns.
- Ask Codex to interpret output and suggest fixes.

## Targeted Tests
- Run the smallest relevant test script (ex: `npm run test:roleplay:chat`).
- If no tests exist for a change, ask Codex for a minimal test plan.

## Wrap-Up
- Confirm type errors are zero and lint is clean.
- Note any follow-up work (tests, refactors, docs).

## Copy/Paste Prompts
Use these as ready-to-run prompts in Codex for consistent reviews.

### Commit Review
```text
Review the last 3 commits for TypeScript issues, risky logic changes, and missing tests. Summarize findings by severity and reference file paths and line numbers.
```

```text
Review commit <sha> for error handling, null/undefined safety, and API contract changes. Flag potential regressions or missing tests.
```

### File or Module Review
```text
Review src/path/to/file.ts for TypeScript errors, unsafe patterns, and edge cases. List concrete fixes and any tests to add.
```

```text
Scan supabase/functions/roleplay-chat/index.ts for runtime risks, error handling gaps, and type safety issues. Provide a prioritized fix list.
```

### Lint/Typecheck Follow-Up
```text
I ran `npm run lint` and `npm run build`. Here is the output: <paste output>. Explain the root causes and suggest minimal fixes.
```

```text
I ran `npm run lint`. Here is the output: <paste output>. Propose fixes and show any safe autofix commands.
```

### Test Planning
```text
Given these changed files: <list files>, propose the smallest set of tests to run and any new tests to add. Keep it practical.
```

```text
We changed <feature>. Propose a minimal regression test plan and where to add tests in this repo.
```
