import satori, { type SatoriOptions } from "satori";
import { Resvg } from "@resvg/resvg-js";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { loadFonts } from "./fonts.js";
import type { AssistantBlock, SharePayload, ShareRound } from "./types.js";

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
  } satisfies CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
  } satisfies CSSProperties,
  title: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  } satisfies CSSProperties,
  titleMain: {
    fontSize: "32px",
    fontWeight: 700,
    lineHeight: 1.2,
  } satisfies CSSProperties,
  titleSub: {
    fontSize: "16px",
    color: colors.assistantMeta,
  } satisfies CSSProperties,
  badge: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: "999px",
    background: colors.glass,
    border: `1px solid ${colors.glassBorder}`,
    fontSize: "14px",
    color: colors.assistantMeta,
  } satisfies CSSProperties,
  round: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    marginBottom: "24px",
  } satisfies CSSProperties,
  rightRow: {
    display: "flex",
    justifyContent: "flex-end",
  } satisfies CSSProperties,
  leftRow: {
    display: "flex",
    justifyContent: "flex-start",
  } satisfies CSSProperties,
  userBubble: {
    maxWidth: "74%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    background: colors.userBg,
    color: colors.userText,
    borderRadius: "24px 24px 10px 24px",
    padding: "18px 20px",
  } satisfies CSSProperties,
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
  } satisfies CSSProperties,
  codeCard: {
    maxWidth: "82%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: colors.codeBg,
    border: `1px solid ${colors.codeBorder}`,
    borderRadius: "20px",
    padding: "18px 20px",
  } satisfies CSSProperties,
  label: {
    fontSize: "13px",
    fontWeight: 700,
  } satisfies CSSProperties,
  meta: {
    fontSize: "13px",
    color: colors.assistantMeta,
  } satisfies CSSProperties,
  text: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  } satisfies CSSProperties,
  paragraph: {
    display: "flex",
    flexWrap: "wrap",
    fontSize: "24px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  } satisfies CSSProperties,
  heading1: {
    display: "flex",
    flexWrap: "wrap",
    fontSize: "30px",
    lineHeight: 1.35,
    fontWeight: 700,
  } satisfies CSSProperties,
  heading2: {
    display: "flex",
    flexWrap: "wrap",
    fontSize: "27px",
    lineHeight: 1.4,
    fontWeight: 700,
  } satisfies CSSProperties,
  heading3: {
    display: "flex",
    flexWrap: "wrap",
    fontSize: "25px",
    lineHeight: 1.45,
    fontWeight: 700,
  } satisfies CSSProperties,
  listRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  } satisfies CSSProperties,
  listBullet: {
    fontSize: "24px",
    lineHeight: 1.6,
    color: colors.assistantMeta,
  } satisfies CSSProperties,
  quote: {
    display: "flex",
    paddingLeft: "14px",
    borderLeft: `3px solid ${colors.glassBorder}`,
    color: colors.assistantMeta,
  } satisfies CSSProperties,
  inlineCode: {
    display: "flex",
    fontFamily: '"JetBrains Mono"',
    fontSize: "20px",
    lineHeight: 1.45,
    background: "rgba(15,23,42,0.9)",
    border: `1px solid ${colors.codeBorder}`,
    borderRadius: "8px",
    padding: "2px 8px",
  } satisfies CSSProperties,
  mono: {
    fontFamily: '"JetBrains Mono"',
    fontSize: "19px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  } satisfies CSSProperties,
  footer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "16px",
    fontSize: "14px",
    color: colors.subText,
  } satisfies CSSProperties,
} as const;

function clampCode(code: string, maxLines = 18) {
  const lines = code.split("\n");
  if (lines.length <= maxLines) {
    return code;
  }
  return `${lines.slice(0, maxLines).join("\n")}\n...`;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <span key={`${keyPrefix}-code-${index}`} style={styles.inlineCode}>
          {part.slice(1, -1)}
        </span>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={`${keyPrefix}-bold-${index}`} style={{ fontWeight: 700 }}>
          {part.slice(2, -2)}
        </span>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <span
          key={`${keyPrefix}-link-${index}`}
          style={{ textDecoration: "underline", textDecorationColor: "rgba(147,197,253,0.85)" }}
        >
          {linkMatch[1]}
        </span>
      );
    }

    return <Fragment key={`${keyPrefix}-text-${index}`}>{part}</Fragment>;
  });
}

function renderMarkdownText(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    const content = paragraph.join("\n");
    const nodeIndex = nodes.length;
    nodes.push(
      <div key={`${keyPrefix}-p-${nodeIndex}`} style={styles.paragraph}>
        {renderInlineMarkdown(content, `${keyPrefix}-p-${nodeIndex}`)}
      </div>,
    );
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const headingStyle =
        level === 1 ? styles.heading1 : level === 2 ? styles.heading2 : styles.heading3;
      const nodeIndex = nodes.length;
      nodes.push(
        <div key={`${keyPrefix}-h-${nodeIndex}`} style={headingStyle}>
          {renderInlineMarkdown(headingMatch[2], `${keyPrefix}-h-${nodeIndex}`)}
        </div>,
      );
      return;
    }

    const quoteMatch = trimmed.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      const nodeIndex = nodes.length;
      nodes.push(
        <div key={`${keyPrefix}-q-${nodeIndex}`} style={styles.quote}>
          <div style={styles.paragraph}>
            {renderInlineMarkdown(quoteMatch[1], `${keyPrefix}-q-${nodeIndex}`)}
          </div>
        </div>,
      );
      return;
    }

    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const nodeIndex = nodes.length;
      nodes.push(
        <div key={`${keyPrefix}-li-${nodeIndex}`} style={styles.listRow}>
          <div style={styles.listBullet}>{listMatch[2]}</div>
          <div style={styles.paragraph}>
            {renderInlineMarkdown(listMatch[3], `${keyPrefix}-li-${nodeIndex}`)}
          </div>
        </div>,
      );
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  return nodes;
}

function renderAssistantBlock(block: AssistantBlock, index: number) {
  if (block.type === "text") {
    return (
      <div key={`text-${index}`} style={styles.leftRow}>
        <div style={styles.assistantBubble}>
          <div style={styles.meta}>ASSISTANT</div>
          <div style={styles.text}>{renderMarkdownText(block.text, `text-${index}`)}</div>
        </div>
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <div key={`code-${index}`} style={styles.leftRow}>
        <div style={styles.codeCard}>
          <div style={{ ...styles.label, color: colors.codeLabel }}>
            {block.language ? `CODE · ${block.language}` : "CODE"}
          </div>
          <div style={styles.mono}>{clampCode(block.code)}</div>
        </div>
      </div>
    );
  }

  return null;
}

function renderRound(round: ShareRound, index: number): ReactNode {
  return (
    <div key={`round-${index}`} style={styles.round}>
      <div style={styles.rightRow}>
        <div style={styles.userBubble}>
          <div style={{ ...styles.meta, color: "#64748B" }}>USER</div>
          <div style={{ ...styles.text, color: colors.userText }}>{round.user.text}</div>
        </div>
      </div>
      {round.assistant.map(renderAssistantBlock)}
    </div>
  );
}

async function renderSvg(payload: SharePayload) {
  const fonts = await loadFonts();
  const estimateHeight = estimatePayloadHeight(payload);
  const body = (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}>
          <div style={styles.titleMain}>AI 对话卡片</div>
          <div style={styles.titleSub}>
            {`round=${payload.roundCount} · ${new Date(payload.createdAt).toLocaleString("zh-CN", {
              hour12: false,
            })} · Agent Share`}
          </div>
        </div>
        <div style={styles.badge}>{`${payload.roundCount} Q&A`}</div>
      </div>
      {payload.rounds.map(renderRound)}
      <div style={styles.footer}>
        <div>只显示 user / assistant / code-tool 摘要</div>
        <div>不显示 commentary / 原始日志 / 来源明细</div>
      </div>
    </div>
  );

  const options: SatoriOptions = {
    width: WIDTH,
    height: estimateHeight,
    fonts,
  };

  const svg = trimSvgCanvas(await satori(body, options));
  return { svg, height: estimateHeight };
}

function estimateTextHeight(text: string, charsPerLine: number, lineHeight: number, base = 0) {
  const logicalLines = text.split("\n").flatMap((line) => {
    const width = Math.max(1, Math.ceil(line.length / charsPerLine));
    return new Array(width).fill(0);
  }).length;
  return base + logicalLines * lineHeight;
}

function estimatePayloadHeight(payload: SharePayload) {
  let total = 180;

  for (const round of payload.rounds) {
    total += estimateTextHeight(round.user.text, 26, 38, 92);
    for (const block of round.assistant) {
      if (block.type === "text") {
        total += estimateTextHeight(block.text, 30, 38, 98);
      } else if (block.type === "code") {
        total += estimateTextHeight(clampCode(block.code), 46, 30, 88);
      }
    }
    total += 18;
  }

  total += 64;
  return total;
}

function trimSvgCanvas(svg: string) {
  const svgTagMatch = svg.match(/<svg[^>]*height="([0-9.]+)"[^>]*viewBox="0 0 1200 ([0-9.]+)"/);
  const backgroundMatch = svg.match(
    /<rect x="0" y="0" width="1200" height="([0-9.]+)" fill="url\(#satori_pattern_id_0\)"\/>/,
  );

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

export async function renderPayloadToPng(payload: SharePayload) {
  const { svg } = await renderSvg(payload);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: WIDTH,
    },
  });
  return resvg.render().asPng();
}

export async function renderPayloadToSvg(payload: SharePayload) {
  const { svg } = await renderSvg(payload);
  return svg;
}
