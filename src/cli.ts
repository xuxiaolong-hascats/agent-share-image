#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { loadSessionDocument, resolveCurrentCodexSessionPath } from "./input.js";
import {
  buildSharePayload,
  dropLatestRound,
  extractCompleteRounds,
  extractSharePayload,
} from "./session.js";
import { renderPayloadToPng, renderPayloadToSvg } from "./renderer.js";
import type { AssistantBlock, ShareRound } from "./types.js";

type CliArgs = {
  input?: string;
  output: string;
  round: number;
  current: boolean;
  list: boolean;
  select?: string;
  limit?: number;
};

function printUsage() {
  console.log(
    "Usage: agent-share-image (--input <session.json|session.jsonl> | --current) [--round <n> | --select <expr> | --list] [--limit <n>] [--output <file.png|file.svg>]",
  );
}

function parseArgs(argv: string[]): CliArgs {
  let input = "";
  let output = "output/share.svg";
  let round = 1;
  let current = false;
  let list = false;
  let select = "";
  let limit: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input" && next) {
      input = next;
      index += 1;
      continue;
    }
    if (arg === "--output" && next) {
      output = next;
      index += 1;
      continue;
    }
    if (arg === "--round" && next) {
      round = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === "--select" && next) {
      select = next;
      index += 1;
      continue;
    }
    if (arg === "--limit" && next) {
      limit = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === "--list") {
      list = true;
      continue;
    }
    if (arg === "--current") {
      current = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!input && !current) {
    throw new Error("missing required input: use --input <file> or --current");
  }
  if (input && current) {
    throw new Error("use either --input or --current, not both");
  }
  if (!Number.isInteger(round) || round <= 0) {
    throw new Error("round must be a positive integer");
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("limit must be a positive integer");
  }
  if (list && select) {
    throw new Error("use either --list or --select, not both");
  }
  if (select && argv.includes("--round")) {
    throw new Error("use either --round or --select, not both");
  }
  if (list && argv.includes("--round")) {
    throw new Error("use either --round or --list, not both");
  }

  return { input: input || undefined, output, round, current, list, select: select || undefined, limit };
}

function truncatePreview(text: string, maxChars = 14) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}...`;
}

function getAssistantPreview(blocks: AssistantBlock[]) {
  const visible = blocks.find((block) => block.type === "text" || block.type === "code");
  if (!visible) {
    return "[tool]";
  }

  if (visible.type === "text") {
    return visible.text;
  }

  const firstLine = visible.code.split("\n")[0] ?? "";
  return firstLine ? `[code] ${firstLine}` : "[code]";
}

function printRoundList(rounds: ShareRound[], startIndex = 0) {
  rounds.forEach((round, index) => {
    const userPreview = truncatePreview(round.user.text);
    const assistantPreview = truncatePreview(getAssistantPreview(round.assistant));
    console.log(`${startIndex + index + 1}. U: ${userPreview} | A: ${assistantPreview}`);
  });
}

function parseSelectExpression(expression: string, maxIndex: number) {
  const normalized = expression.trim().toLowerCase();
  if (normalized === "all") {
    return Array.from({ length: maxIndex }, (_, index) => index);
  }

  const selected = new Set<number>();
  for (const part of normalized.split(",")) {
    const token = part.trim();
    if (!token) {
      continue;
    }

    const rangeMatch = token.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1] ?? "", 10);
      const end = Number.parseInt(rangeMatch[2] ?? "", 10);
      if (start <= 0 || end <= 0 || start > end) {
        throw new Error(`invalid select range: ${token}`);
      }
      if (end > maxIndex) {
        throw new Error(`select range out of bounds: ${token}; max round is ${maxIndex}`);
      }
      for (let index = start; index <= end; index += 1) {
        selected.add(index - 1);
      }
      continue;
    }

    const single = Number.parseInt(token, 10);
    if (!Number.isInteger(single) || single <= 0) {
      throw new Error(`invalid select token: ${token}`);
    }
    if (single > maxIndex) {
      throw new Error(`select token out of bounds: ${token}; max round is ${maxIndex}`);
    }
    selected.add(single - 1);
  }

  if (selected.size === 0) {
    throw new Error("select expression resolved to no rounds");
  }

  return [...selected].sort((left, right) => left - right);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.current
    ? await resolveCurrentCodexSessionPath()
    : resolve(args.input!);
  const outputPath = resolve(args.output);
  const parsed = await loadSessionDocument(inputPath);
  const events = args.current ? dropLatestRound(parsed.events) : parsed.events;
  const rounds = extractCompleteRounds(events);

  if (args.list) {
    const listRounds = args.limit !== undefined ? rounds.slice(-args.limit) : rounds;
    if (listRounds.length === 0) {
      throw new Error("no complete rounds available");
    }
    printRoundList(listRounds, rounds.length - listRounds.length);
    return;
  }

  const payload = args.select
    ? buildSharePayload(
        parseSelectExpression(args.select, rounds.length).map((index) => rounds[index]!),
        parsed.sessionId,
      )
    : extractSharePayload(events, args.round, parsed.sessionId);
  const extension = extname(outputPath).toLowerCase();
  let content: string | Uint8Array;

  if (extension === ".svg") {
    content = await renderPayloadToSvg(payload);
  } else if (extension === ".png" || extension === "") {
    content = await renderPayloadToPng(payload);
  } else {
    throw new Error(`unsupported output format: ${extension || "(none)"}; use .png or .svg`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);

  console.log(`Exported ${payload.roundCount} round(s) from ${inputPath} to ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  printUsage();
  process.exit(1);
});
