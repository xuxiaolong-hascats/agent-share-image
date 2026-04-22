---
name: agent-share-image
description: Generate a shareable SVG or PNG from recent rounds in the current or specified Codex session by calling the local `agent-share-image` CLI.
---

# Agent Share Image

Use the local CLI:

```bash
agent-share-image
```

## When To Use

- The user wants to export recent conversation rounds as an image
- The user wants a share card for a short Codex Q&A
- The user points to a specific session file, or means the current Codex session

## Command

```bash
agent-share-image (--input <session.json|session.jsonl> | --current) [--round <n> | --select <expr> | --list] [--limit <n>] [--output <file.svg|file.png>]
```

## Rules

- If the user means the current Codex conversation, use `--current`
- Do not scan archived sessions to guess the intended session
- Use `--input` only when the user explicitly points to a file
- `round=n` means the latest `n` Q&A rounds inside one session, not `n` sessions
- If the user says “上面的会话 / 前面那几段 / 这些对话”, run `--list` first and let the user choose indices
- Prefer `--select` over guessing a `round=n` when the user refers to a non-latest subset
- With `--current`, the export-trigger round is excluded by default
- If no output path is specified, the CLI defaults to `output/share.svg`

## Examples

Current Codex session:

```bash
agent-share-image --current --round 1
```

List selectable rounds in the current session:

```bash
agent-share-image --current --list
```

Export explicitly selected rounds:

```bash
agent-share-image --current --select 3-5 --output output/share.svg
```

Specific session file:

```bash
agent-share-image \
  --input ~/.codex/archived_sessions/rollout-xxxx.jsonl \
  --round 2 \
  --output output/share.svg
```
