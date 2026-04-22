import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { homedir } from "node:os";
import type { SessionEvent } from "./types.js";

type SessionDocument = {
  sessionId?: string;
  events: SessionEvent[];
};

type CodexRecord = {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

type PendingToolCall = {
  name: string;
  args?: string;
  emitted: boolean;
};

function parseJsonDocument(raw: string): SessionDocument {
  const parsed = JSON.parse(raw) as SessionDocument;
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error("invalid session JSON: expected an object with an events array");
  }
  return parsed;
}

function summarizeArgs(rawArgs: string | undefined): string | undefined {
  if (!rawArgs) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawArgs) as Record<string, unknown>;
    if (typeof parsed.cmd === "string") {
      return parsed.cmd;
    }
    return JSON.stringify(parsed);
  } catch {
    return rawArgs.length > 220 ? `${rawArgs.slice(0, 217)}...` : rawArgs;
  }
}

function summarizeToolResult(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  const cleaned = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Chunk ID:"))
    .filter((line) => !line.startsWith("Wall time:"))
    .filter((line) => !line.startsWith("Original token count:"))
    .filter((line) => !line.startsWith("Output:"));

  const joined = cleaned.slice(0, 3).join(" | ");
  if (!joined) {
    return undefined;
  }
  return joined.length > 220 ? `${joined.slice(0, 217)}...` : joined;
}

function pushAssistantText(events: SessionEvent[], text: string, timestamp?: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const fencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;

  for (const match of trimmed.matchAll(fencePattern)) {
    const [fullMatch, languageRaw, codeRaw] = match;
    const start = match.index ?? 0;
    const before = trimmed.slice(lastIndex, start).trim();
    if (before) {
      events.push({ type: "assistant_text", text: before, timestamp });
    }

    events.push({
      type: "assistant_code",
      code: codeRaw.trimEnd(),
      language: languageRaw.trim() || undefined,
      timestamp,
    });

    lastIndex = start + fullMatch.length;
  }

  const tail = trimmed.slice(lastIndex).trim();
  if (tail) {
    events.push({ type: "assistant_text", text: tail, timestamp });
  }
}

function extractMessageText(content: unknown): string[] {
  if (!Array.isArray(content)) {
    return [];
  }

  const parts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const typedItem = item as Record<string, unknown>;
    const text = typedItem.text;
    if (typeof text === "string" && text.trim()) {
      parts.push(text);
    }
  }

  return parts;
}

function parseCodexJsonl(raw: string, fallbackSessionId: string): SessionDocument {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const records = lines.map((line) => JSON.parse(line) as CodexRecord);
  const events: SessionEvent[] = [];
  const pendingCalls = new Map<string, PendingToolCall>();
  let sessionId = fallbackSessionId;

  const emitToolSummary = (callId: string | undefined, fallbackName: string, result?: string) => {
    if (!callId) {
      events.push({
        type: "tool_summary",
        tool: fallbackName,
        result: summarizeToolResult(result),
      });
      return;
    }

    const pendingCall = pendingCalls.get(callId);
    if (pendingCall?.emitted) {
      return;
    }

    events.push({
      type: "tool_summary",
      tool: pendingCall?.name ?? fallbackName,
      args: pendingCall?.args,
      result: summarizeToolResult(result),
    });

    if (pendingCall) {
      pendingCall.emitted = true;
    }
  };

  for (const record of records) {
    const payload = record.payload ?? {};
    const timestamp = record.timestamp;

    if (record.type === "session_meta") {
      const payloadId = payload.id;
      if (typeof payloadId === "string" && payloadId) {
        sessionId = payloadId;
      }
      continue;
    }

    if (record.type === "event_msg") {
      const payloadType = payload.type;

      if (payloadType === "user_message") {
        const message = payload.message;
        if (typeof message === "string" && message.trim()) {
          events.push({ type: "user_message", text: message.trim(), timestamp });
        }
        continue;
      }

      if (payloadType === "exec_command_end") {
        emitToolSummary(
          typeof payload.call_id === "string" ? payload.call_id : undefined,
          "exec_command",
          typeof payload.aggregated_output === "string" ? payload.aggregated_output : undefined,
        );
      }

      continue;
    }

    if (record.type !== "response_item") {
      continue;
    }

    const payloadType = payload.type;

    if (payloadType === "message") {
      if (payload.role !== "assistant") {
        continue;
      }

      const texts = extractMessageText(payload.content);
      if (texts.length === 0) {
        continue;
      }

      const combined = texts.join("\n\n").trim();
      if (!combined) {
        continue;
      }

      if (payload.phase === "commentary") {
        events.push({ type: "commentary", text: combined, timestamp });
      } else {
        pushAssistantText(events, combined, timestamp);
      }
      continue;
    }

    if (payloadType === "function_call") {
      const callId = payload.call_id;
      const name = payload.name;
      if (typeof callId === "string" && typeof name === "string") {
        pendingCalls.set(callId, {
          name,
          args: summarizeArgs(typeof payload.arguments === "string" ? payload.arguments : undefined),
          emitted: false,
        });
      }
      continue;
    }

    if (payloadType === "function_call_output") {
      emitToolSummary(
        typeof payload.call_id === "string" ? payload.call_id : undefined,
        "tool",
        typeof payload.output === "string" ? payload.output : undefined,
      );
    }
  }

  if (events.length === 0) {
    throw new Error("unsupported Codex session format: no exportable events found");
  }

  return { sessionId, events };
}

export async function loadSessionDocument(inputPath: string): Promise<SessionDocument> {
  const raw = await readFile(inputPath, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("input file is empty");
  }

  const extension = extname(inputPath).toLowerCase();
  const fallbackSessionId = basename(inputPath, extension);

  if (extension === ".jsonl") {
    return parseCodexJsonl(raw, fallbackSessionId);
  }

  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  if (Array.isArray(parsed.events)) {
    return parseJsonDocument(trimmed);
  }

  if (typeof parsed.type === "string" && "payload" in parsed) {
    return parseCodexJsonl(raw, fallbackSessionId);
  }

  throw new Error("unsupported input format: expected session JSON or Codex session JSONL");
}

async function findSessionFileByThreadId(rootDir: string, threadId: string): Promise<string | null> {
  const { readdir } = await import("node:fs/promises");

  async function walk(dir: string): Promise<string | null> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await walk(fullPath);
        if (found) {
          return found;
        }
        continue;
      }

      if (entry.isFile() && entry.name.includes(threadId) && entry.name.endsWith(".jsonl")) {
        return fullPath;
      }
    }

    return null;
  }

  return walk(rootDir);
}

export async function resolveCurrentCodexSessionPath(): Promise<string> {
  const threadId = process.env.CODEX_THREAD_ID;
  if (!threadId) {
    throw new Error("current Codex session is unavailable: CODEX_THREAD_ID is not set");
  }

  const codexHome = join(homedir(), ".codex");
  const activeSessionsDir = join(codexHome, "sessions");
  const archivedSessionsDir = join(codexHome, "archived_sessions");

  const activeMatch = await findSessionFileByThreadId(activeSessionsDir, threadId);
  if (activeMatch) {
    return activeMatch;
  }

  const archivedMatch = await findSessionFileByThreadId(archivedSessionsDir, threadId);
  if (archivedMatch) {
    return archivedMatch;
  }

  throw new Error(`current Codex session file not found for thread ${threadId}`);
}
