# agent-share-image

Generate shareable SVG or PNG images from agent conversation rounds.

This CLI extracts the latest `n` Q&A rounds from one session and renders them as a single share card.

## Features

- Export recent Q&A rounds from one session
- Support simplified JSON input
- Support real Codex `rollout-*.jsonl` session files
- Support `--current` for the current Codex session
- Output SVG by default, PNG optional
- Render only `user`, `assistant`, and `code`

## Install

### npm

```bash
npm install -g @hascats/agent-share-image
```

### From source

```bash
pnpm install
pnpm build
npm link
```

After `npm link`, use the CLI directly:

```bash
agent-share-image --current --round 1
```

## Usage

### Export from a session file

```bash
agent-share-image --input examples/session.json --round 1 --output output/share.svg
```

### Export from the current Codex session

```bash
agent-share-image --current --round 2
```

### Export PNG

```bash
agent-share-image --current --round 1 --output output/share.png
```

### Run the bundled example

```bash
pnpm render:example
```

## Options

- `--input <path>`: session file path
- `--current`: resolve the current Codex session from runtime context
- `--round <n>`: export the latest `n` completed Q&A rounds from one session
- `--output <path>`: output file path, defaults to `output/share.svg`

## Semantics

- `round=n` means the latest `n` Q&A rounds inside one session, not `n` sessions
- In normal extraction, unfinished tail rounds are ignored
- With `--current`, the current export-trigger round is excluded by default
- Raw `commentary`, source details, and original tool logs are excluded from visual output
- The renderer currently shows `user`, `assistant`, and `code`; `tool_summary` is kept internally but not rendered

## Input Formats

Examples:

- [examples/session.json](examples/session.json)
- [examples/codex-session.jsonl](examples/codex-session.jsonl)

Supported simplified event types:

- `user_message`
- `assistant_text`
- `assistant_code`
- `tool_summary`
- `commentary` (filtered out)

Supported Codex mappings:

- `event_msg.user_message` -> `user_message`
- `response_item.message(role=assistant)` -> `assistant_text` / `assistant_code`
- `response_item.function_call` + `function_call_output` / `exec_command_end` -> `tool_summary`

## Output

- `.svg`: default, vector output
- `.png`: raster output

The output format is inferred from the output extension.

## Skills

This repo also includes thin skill adapters:

- [skills/codex/SKILL.md](skills/codex/SKILL.md)
- [skills/claude-code/SKILL.md](skills/claude-code/SKILL.md)

The CLI is the main product. Skills are adapter docs that tell agent CLIs when and how to call it.

## Release Checklist

```bash
pnpm check
pnpm build
npm pack --dry-run
npm publish --dry-run --access public
agent-share-image --input examples/session.json --round 1 --output /tmp/share.svg
```

Scoped public package publish:

```bash
npm publish --access public
```

## License

MIT
