import { chromium } from "playwright-core";
const [, , src, out] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 2400, height: 1600 } });
await p.goto(`file://${src}`);
await p.screenshot({ path: out, omitBackground: true });
await b.close();
