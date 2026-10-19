import fs from "node:fs/promises";
import path from "node:path";

const endpoint = "http://127.0.0.1:9333/json/list";
const targets = await (await fetch(endpoint)).json();
const target = targets.find((item) => item.type === "page" && item.url.includes("index.html"));
if (!target) throw new Error("No prototype page target found.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(JSON.stringify(message.error)));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Evaluation failed");
  return result.result.value;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = "file:///Users/luozhixiang/Desktop/Codex/声账/prototype/index.html";
const outputDir = "/Users/luozhixiang/Desktop/Codex/声账/prototype/screenshots";
const scenarios = [
  ["onboarding", ""],
  ["home", "?scenario=home&capture=1"],
  ["voice-result", "?scenario=voice-auto&capture=1"],
  ["stats", "?scenario=stats&capture=1"],
  ["manual-entry", "?scenario=manual-entry&capture=1"],
  ["category-management", "?scenario=categories&capture=1"],
  ["settings", "?scenario=settings&capture=1"],
  ["cloud-backup", "?scenario=backup&capture=1"],
  ["restore-conflict", "?scenario=conflict&capture=1"],
  ["wechat-login", "?scenario=login&capture=1"],
  ["export-options", "?scenario=export&capture=1"],
  ["voice-network-error", "?scenario=error-network&capture=1"]
];

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});

const audit = [];
for (const [name, query] of scenarios) {
  await send("Page.navigate", { url: `${base}${query}` });
  await wait(name === "voice-result" ? 2700 : 900);
  const metrics = await evaluate(`(() => {
    const screen = document.querySelector('.screen, .onboarding');
    const interactive = [...document.querySelectorAll('button, input, select')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          action: element.dataset.action || element.dataset.scenario || '',
          text: (element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 24),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
    return {
      screenOverflowX: screen ? screen.scrollWidth - screen.clientWidth : 0,
      bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      interactive,
      viewport: [innerWidth, innerHeight],
      title: (document.querySelector('.app-header h1, .subpage-header h1, .onboarding-copy h1, .voice-title, .entry-header')?.textContent || '').trim().slice(0, 60)
    };
  })()`);
  const small = metrics.interactive.filter((item) => {
    if (item.action === "open-day" || item.action === "voice-orb") return false;
    return item.width < 44 || item.height < 44;
  });
  audit.push({ name, title: metrics.title, screenOverflowX: metrics.screenOverflowX, bodyOverflowX: metrics.bodyOverflowX, small });
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(outputDir, `${name}.png`), Buffer.from(shot.data, "base64"));
}

await fs.writeFile(
  path.join(outputDir, "layout-audit.json"),
  JSON.stringify({ checkedAt: new Date().toISOString(), scenarios: audit }, null, 2)
);
console.log(JSON.stringify(audit, null, 2));
socket.close();
