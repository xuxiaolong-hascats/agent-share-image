# Agent Share Image

Use the local `agent-share-image` CLI to export recent Q&A rounds as a shareable image.

## When To Use

- The user wants to export recent chat rounds as an image
- The user wants a polished share card for a short conversation
- The user can provide either a session file or the current runtime session context

## Command

```bash
agent-share-image (--input <session.json|session.jsonl> | --current) --round <n> [--output <file.svg|file.png>]
```

## Rules

- Prefer `--current` when the user clearly means the current session
- Do not guess across multiple archived sessions
- `round=n` means the latest `n` Q&A rounds inside one session
- The export-trigger round should not be treated as the latest round to render
- If no output path is specified, the CLI defaults to `output/share.svg`

## Examples

```bash
agent-share-image --current --round 1
agent-share-image --input ./session.json --round 2 --output ./share.png
```
