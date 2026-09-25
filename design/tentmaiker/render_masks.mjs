// Render each figure part to its own 2400x1600 alpha mask.
import { chromium } from "playwright-core";
import fs from "node:fs";
const parts = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = process.argv[3];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 2400, height: 1600 } });
for (const [name, d] of parts) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600"><path d="${d}" fill="#fff"/></svg>`;
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.screenshot({ path: `${out}/${name}.png`, omitBackground: true });
}
await b.close();
