# Changelog

## 0.2.1

- Render common Markdown formatting in assistant text blocks for share cards
- Preserve readable styling for headings, lists, quotes, bold text, inline code, and link text

## 0.2.0

- Add `--list` to preview selectable complete Q&A rounds
- Add `--select` to export explicit rounds by index, range, list, or `all`
- Add `--limit` for bounded round listing while keeping global numbering
- Keep `--round` as a shortcut for latest-round export
- Update Codex and Claude Code skill guidance to use list-then-select for ambiguous requests

## 0.1.0

- Initial public release of the `agent-share-image` CLI
- Support simplified JSON session input
- Support Codex `rollout-*.jsonl` session input
- Support `--current` for the active Codex session
- Output SVG by default, PNG optional
- Exclude the current export-trigger round when using `--current`
- Hide `tool_summary` from rendered output while preserving internal parsing
