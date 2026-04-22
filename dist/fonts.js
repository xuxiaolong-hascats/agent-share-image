import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const FONT_FILES = {
    notoSansScRegular: "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff",
    notoSansScBold: "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff",
    jetbrainsMonoRegular: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff",
    jetbrainsMonoBold: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff",
};
export async function loadFonts() {
    const [regular, bold, monoRegular, monoBold] = await Promise.all([
        readFile(fileURLToPath(import.meta.resolve(FONT_FILES.notoSansScRegular))),
        readFile(fileURLToPath(import.meta.resolve(FONT_FILES.notoSansScBold))),
        readFile(fileURLToPath(import.meta.resolve(FONT_FILES.jetbrainsMonoRegular))),
        readFile(fileURLToPath(import.meta.resolve(FONT_FILES.jetbrainsMonoBold))),
    ]);
    return [
        {
            name: "Noto Sans SC",
            data: regular,
            weight: 400,
            style: "normal",
        },
        {
            name: "Noto Sans SC",
            data: bold,
            weight: 700,
            style: "normal",
        },
        {
            name: "JetBrains Mono",
            data: monoRegular,
            weight: 400,
            style: "normal",
        },
        {
            name: "JetBrains Mono",
            data: monoBold,
            weight: 700,
            style: "normal",
        },
    ];
}
