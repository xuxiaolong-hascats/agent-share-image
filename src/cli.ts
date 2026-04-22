#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { loadSessionDocument, resolveCurrentCodexSessionPath } from "./input.js";
import { dropLatestRound, extractSharePayload } from "./session.js";
import { renderPayloadToPng, renderPayloadToSvg } from "./renderer.js";

type CliArgs = {
  input?: string;
  output: string;
  round: number;
  current: boolean;
};

function printUsage() {
  console.log("Usage: agent-share-image (--input <session.json|session.jsonl> | --current) [--round <n>] [--output <file.png|file.svg>]");
}

function parseArgs(argv: string[]): CliArgs {
  let input = "";
  let output = "output/share.svg";
  let round = 1;
  let current = false;

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

  return { input: input || undefined, output, round, current };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.current
    ? await resolveCurrentCodexSessionPath()
    : resolve(args.input!);
  const outputPath = resolve(args.output);
  const parsed = await loadSessionDocument(inputPath);
  const events = args.current ? dropLatestRound(parsed.events) : parsed.events;
  const payload = extractSharePayload(events, args.round, parsed.sessionId);
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
