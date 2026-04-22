function mergeAssistantText(blocks) {
    const merged = [];
    for (const block of blocks) {
        const previous = merged.at(-1);
        if (block.type === "text" && previous?.type === "text") {
            previous.text = `${previous.text}\n\n${block.text}`;
            continue;
        }
        merged.push({ ...block });
    }
    return merged;
}
function finalizeRound(round) {
    if (round === null) {
        return null;
    }
    const assistant = mergeAssistantText(round.assistant);
    if (assistant.length === 0) {
        return null;
    }
    return {
        user: round.user,
        assistant,
    };
}
export function dropLatestRound(events) {
    let lastUserIndex = -1;
    for (let index = 0; index < events.length; index += 1) {
        if (events[index]?.type === "user_message") {
            lastUserIndex = index;
        }
    }
    if (lastUserIndex <= 0) {
        return events;
    }
    return events.slice(0, lastUserIndex);
}
export function extractCompleteRounds(events) {
    const rounds = [];
    let currentRound = null;
    for (const event of events) {
        switch (event.type) {
            case "user_message":
                {
                    const finalized = finalizeRound(currentRound);
                    if (finalized !== null) {
                        rounds.push(finalized);
                    }
                }
                currentRound = {
                    user: { type: "user", text: event.text.trim() },
                    assistant: [],
                };
                break;
            case "assistant_text":
                currentRound?.assistant.push({ type: "text", text: event.text.trim() });
                break;
            case "assistant_code":
                currentRound?.assistant.push({
                    type: "code",
                    code: event.code,
                    language: event.language,
                });
                break;
            case "tool_summary":
                currentRound?.assistant.push({
                    type: "tool_summary",
                    tool: event.tool,
                    args: event.args,
                    result: event.result,
                });
                break;
            case "commentary":
                break;
            default:
                ((unreachable) => unreachable)(event);
        }
    }
    {
        const finalized = finalizeRound(currentRound);
        if (finalized !== null) {
            rounds.push(finalized);
        }
    }
    return rounds;
}
export function buildSharePayload(rounds, sessionId = "local-session") {
    if (rounds.length === 0) {
        throw new Error("no complete rounds available for export");
    }
    return {
        sessionId,
        createdAt: new Date().toISOString(),
        roundCount: rounds.length,
        rounds,
    };
}
export function extractSharePayload(events, roundCount, sessionId = "local-session") {
    if (!Number.isInteger(roundCount) || roundCount <= 0) {
        throw new Error("round must be a positive integer");
    }
    const rounds = extractCompleteRounds(events);
    const selectedRounds = rounds.slice(-roundCount);
    return buildSharePayload(selectedRounds, sessionId);
}
