import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { loadFonts } from "./fonts.js";
const WIDTH = 1200;
const PADDING = 48;
const colors = {
    bg0: "#0B1020",
    bg1: "#1D2340",
    glass: "rgba(255,255,255,0.10)",
    glassBorder: "rgba(255,255,255,0.12)",
    userBg: "#F8FAFC",
    userText: "#111827",
    assistantText: "#FFFFFF",
    assistantMeta: "rgba(255,255,255,0.72)",
    codeBg: "#0F172A",
    codeBorder: "rgba(255,255,255,0.10)",
    codeLabel: "#93C5FD",
    toolLabel: "#FDE68A",
    subText: "rgba(255,255,255,0.58)",
};
const styles = {
    root: {
        width: `${WIDTH}px`,
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(160deg, ${colors.bg1} 0%, ${colors.bg0} 65%)`,
        padding: `${PADDING}px`,
        color: "#FFFFFF",
        fontFamily: '"Noto Sans SC"',
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "28px",
    },
    title: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    titleMain: {
        fontSize: "32px",
        fontWeight: 700,
        lineHeight: 1.2,
    },
    titleSub: {
        fontSize: "16px",
        color: colors.assistantMeta,
    },
    badge: {
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: "999px",
        background: colors.glass,
        border: `1px solid ${colors.glassBorder}`,
        fontSize: "14px",
        color: colors.assistantMeta,
    },
    round: {
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        marginBottom: "24px",
    },
    rightRow: {
        display: "flex",
        justifyContent: "flex-end",
    },
    leftRow: {
        display: "flex",
        justifyContent: "flex-start",
    },
    userBubble: {
        maxWidth: "74%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: colors.userBg,
        color: colors.userText,
        borderRadius: "24px 24px 10px 24px",
        padding: "18px 20px",
    },
    assistantBubble: {
        maxWidth: "82%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: colors.glass,
        border: `1px solid ${colors.glassBorder}`,
        color: colors.assistantText,
        borderRadius: "24px 24px 24px 10px",
        padding: "18px 20px",
    },
    codeCard: {
        maxWidth: "82%",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: colors.codeBg,
        border: `1px solid ${colors.codeBorder}`,
        borderRadius: "20px",
        padding: "18px 20px",
    },
    label: {
        fontSize: "13px",
        fontWeight: 700,
    },
    meta: {
        fontSize: "13px",
        color: colors.assistantMeta,
    },
    text: {
        fontSize: "24px",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
    },
    mono: {
        fontFamily: '"JetBrains Mono"',
        fontSize: "19px",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
    },
    footer: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "16px",
        fontSize: "14px",
        color: colors.subText,
    },
};
function clampCode(code, maxLines = 18) {
    const lines = code.split("\n");
    if (lines.length <= maxLines) {
        return code;
    }
    return `${lines.slice(0, maxLines).join("\n")}\n...`;
}
function renderAssistantBlock(block, index) {
    if (block.type === "text") {
        return (_jsx("div", { style: styles.leftRow, children: _jsxs("div", { style: styles.assistantBubble, children: [_jsx("div", { style: styles.meta, children: "ASSISTANT" }), _jsx("div", { style: styles.text, children: block.text })] }) }, `text-${index}`));
    }
    if (block.type === "code") {
        return (_jsx("div", { style: styles.leftRow, children: _jsxs("div", { style: styles.codeCard, children: [_jsx("div", { style: { ...styles.label, color: colors.codeLabel }, children: block.language ? `CODE · ${block.language}` : "CODE" }), _jsx("div", { style: styles.mono, children: clampCode(block.code) })] }) }, `code-${index}`));
    }
    return null;
}
function renderRound(round, index) {
    return (_jsxs("div", { style: styles.round, children: [_jsx("div", { style: styles.rightRow, children: _jsxs("div", { style: styles.userBubble, children: [_jsx("div", { style: { ...styles.meta, color: "#64748B" }, children: "USER" }), _jsx("div", { style: { ...styles.text, color: colors.userText }, children: round.user.text })] }) }), round.assistant.map(renderAssistantBlock)] }, `round-${index}`));
}
async function renderSvg(payload) {
    const fonts = await loadFonts();
    const estimateHeight = estimatePayloadHeight(payload);
    const body = (_jsxs("div", { style: styles.root, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.title, children: [_jsx("div", { style: styles.titleMain, children: "AI \u5BF9\u8BDD\u5361\u7247" }), _jsx("div", { style: styles.titleSub, children: `round=${payload.roundCount} · ${new Date(payload.createdAt).toLocaleString("zh-CN", {
                                    hour12: false,
                                })} · Agent Share` })] }), _jsx("div", { style: styles.badge, children: `${payload.roundCount} Q&A` })] }), payload.rounds.map(renderRound), _jsxs("div", { style: styles.footer, children: [_jsx("div", { children: "\u53EA\u663E\u793A user / assistant / code-tool \u6458\u8981" }), _jsx("div", { children: "\u4E0D\u663E\u793A commentary / \u539F\u59CB\u65E5\u5FD7 / \u6765\u6E90\u660E\u7EC6" })] })] }));
    const options = {
        width: WIDTH,
        height: estimateHeight,
        fonts,
    };
    const svg = trimSvgCanvas(await satori(body, options));
    return { svg, height: estimateHeight };
}
function estimateTextHeight(text, charsPerLine, lineHeight, base = 0) {
    const logicalLines = text.split("\n").flatMap((line) => {
        const width = Math.max(1, Math.ceil(line.length / charsPerLine));
        return new Array(width).fill(0);
    }).length;
    return base + logicalLines * lineHeight;
}
function estimatePayloadHeight(payload) {
    let total = 180;
    for (const round of payload.rounds) {
        total += estimateTextHeight(round.user.text, 26, 38, 92);
        for (const block of round.assistant) {
            if (block.type === "text") {
                total += estimateTextHeight(block.text, 30, 38, 98);
            }
            else if (block.type === "code") {
                total += estimateTextHeight(clampCode(block.code), 46, 30, 88);
            }
        }
        total += 18;
    }
    total += 64;
    return total;
}
function trimSvgCanvas(svg) {
    const svgTagMatch = svg.match(/<svg[^>]*height="([0-9.]+)"[^>]*viewBox="0 0 1200 ([0-9.]+)"/);
    const backgroundMatch = svg.match(/<rect x="0" y="0" width="1200" height="([0-9.]+)" fill="url\(#satori_pattern_id_0\)"\/>/);
    if (!svgTagMatch || !backgroundMatch) {
        return svg;
    }
    const [, svgHeight, viewBoxHeight] = svgTagMatch;
    const [, contentHeight] = backgroundMatch;
    if (Number(contentHeight) >= Number(svgHeight)) {
        return svg;
    }
    return svg
        .replace(`height="${svgHeight}"`, `height="${contentHeight}"`)
        .replace(`viewBox="0 0 1200 ${viewBoxHeight}"`, `viewBox="0 0 1200 ${contentHeight}"`);
}
export async function renderPayloadToPng(payload) {
    const { svg } = await renderSvg(payload);
    const resvg = new Resvg(svg, {
        fitTo: {
            mode: "width",
            value: WIDTH,
        },
    });
    return resvg.render().asPng();
}
export async function renderPayloadToSvg(payload) {
    const { svg } = await renderSvg(payload);
    return svg;
}
