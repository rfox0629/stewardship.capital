import { chromium } from "playwright-core";
import fs from "node:fs";
const [, , out, query = "", w = "2400", h = "1600"] = process.argv; // run from design/tentmaiker with the http server up
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-proxy-server"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
p.on("pageerror", (e) => console.log("pageerror:", e.message));
await p.goto(`http://127.0.0.1:8765/scene/index.html?w=${w}&h=${h}&${query}`);
await p.waitForFunction(() => window.__done === true, null, { timeout: 300000 });
await p.screenshot({ path: out });
fs.writeFileSync(out.replace(/\.png$/, ".json"), JSON.stringify(await p.evaluate(() => window.__anchors), null, 1));
await b.close();
