import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const endpoint = "http://127.0.0.1:9333/json/list";
const targets = await (await fetch(endpoint)).json();
const target = targets.find((item) => item.type === "page" && item.url.includes("index.html"));

if (!target) {
  throw new Error("No prototype page target found.");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const runtimeErrors = [];
let messageId = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails?.text || "Unknown exception");
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    runtimeErrors.push(message.params.args.map((arg) => arg.value || arg.description).join(" "));
  }
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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result.value;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function click(selector) {
  const clicked = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Missing click target: ${selector}`);
  await wait(120);
}

async function scenario(id) {
  await click(`[data-scenario="${id}"]`);
  await wait(220);
}

await send("Runtime.enable");
await send("Page.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await send("Page.navigate", {
  url: "file:///Users/luozhixiang/Desktop/Codex/声账/prototype/index.html?scenario=home&capture=1"
});
await wait(900);

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

let snapshot = await evaluate(`({
  nav: !!document.querySelector('.bottom-nav'),
  overview: !!document.querySelector('.overview-card'),
  rows: document.querySelectorAll('.transaction-row').length,
  overflow: document.querySelector('.screen')?.scrollWidth - document.querySelector('.screen')?.clientWidth || 0
})`);
check("首页加载与演示数据", snapshot.nav && snapshot.overview && snapshot.rows >= 8, JSON.stringify(snapshot));
check("首页无横向溢出", snapshot.overflow <= 1, `overflow=${snapshot.overflow}`);

const beforeVoice = await evaluate(`document.querySelectorAll('.transaction-row').length`);
await click('[data-action="open-voice"]');
snapshot = await evaluate(`({
  recording: !!document.querySelector('.voice-orb.recording'),
  modal: !!document.querySelector('.voice-panel'),
  extraStartButton: !!document.querySelector('[data-action="voice-sample"]')
})`);
check("底部记账一步进入录音", snapshot.recording && snapshot.modal && !snapshot.extraStartButton, JSON.stringify(snapshot));

await wait(2400);
snapshot = await evaluate(`({
  result: !!document.querySelector('.voice-result'),
  entries: document.querySelectorAll('.voice-entry').length,
  undo: !!document.querySelector('.undo-bar'),
  text: document.querySelector('.voice-result-head h2')?.textContent || ''
})`);
check("一句话生成两笔账单", snapshot.result && snapshot.entries === 2 && snapshot.undo && snapshot.text.includes("2"), JSON.stringify(snapshot));

await click('.voice-entry[data-index="0"]');
snapshot = await evaluate(`({
  editor: !!document.querySelector('.entry-page'),
  amount: document.querySelector('.amount-display')?.textContent.trim() || '',
  note: document.querySelector('[data-editor-note]')?.value || ''
})`);
check("语音结果逐笔编辑", snapshot.editor && snapshot.amount.includes("25") && snapshot.note.includes("午饭"), JSON.stringify(snapshot));
await click('[data-action="close-modal"]');

await click('[data-action="undo-voice"]');
snapshot = await evaluate(`({ undoGone: !document.querySelector('.undo-bar'), modalClosed: !document.querySelector('.voice-panel') })`);
check("语音撤销", snapshot.undoGone && snapshot.modalClosed, JSON.stringify(snapshot));
check("撤销后账单数恢复", beforeVoice === (await evaluate(`document.querySelectorAll('.transaction-row').length`)), `before=${beforeVoice}`);

await scenario("manual-entry");
await click('[data-action="editor-key"][data-key="2"]');
await click('[data-action="editor-key"][data-key="5"]');
await click('[data-action="save-editor"]');
snapshot = await evaluate(`({ editorClosed: !document.querySelector('.editor-page'), amount: document.querySelector('.amount-display')?.textContent || '', toast: !!document.querySelector('.toast') })`);
check("手动记账金额键盘与保存", snapshot.editorClosed, JSON.stringify(snapshot));

await scenario("stats");
snapshot = await evaluate(`({
  bars: document.querySelectorAll('.chart-bar-wrap').length,
  donut: !!document.querySelector('.donut'),
  totals: document.querySelectorAll('.mini-total').length,
  overflow: document.querySelector('.screen')?.scrollWidth - document.querySelector('.screen')?.clientWidth || 0
})`);
check("月度统计图表", snapshot.bars >= 28 && snapshot.donut && snapshot.totals >= 4, JSON.stringify(snapshot));
check("统计页无横向溢出", snapshot.overflow <= 1, `overflow=${snapshot.overflow}`);

await scenario("login");
await click('[data-action="allow-login"]');
snapshot = await evaluate(`({ success: document.body.innerText.includes('登录成功'), rows: document.querySelectorAll('.permission-row').length })`);
check("微信登录授权流程", snapshot.success && snapshot.rows >= 3, JSON.stringify(snapshot));

await scenario("conflict");
snapshot = await evaluate(`({ compare: document.querySelectorAll('.conflict-card').length, choices: document.querySelectorAll('.choice-button').length })`);
check("换机恢复冲突选择", snapshot.compare === 2 && snapshot.choices >= 3, JSON.stringify(snapshot));
await click('[data-action="merge-backup"]');
snapshot = await evaluate(`({ closed: !document.querySelector('.conflict-compare'), toast: document.body.innerText.includes('已合并') })`);
check("合并云端备份", snapshot.closed, JSON.stringify(snapshot));

await scenario("categories");
await click('[data-action="edit-subcategory"][data-id="food"][data-index="0"]');
await evaluate(`(() => {
  const input = document.querySelector('#subcategoryName');
  input.value = '元气早餐';
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await click('[data-action="save-subcategory"]');
snapshot = await evaluate(`({ visible: document.body.innerText.includes('元气早餐'), closed: !document.querySelector('#subcategoryName') })`);
check("二级分类管理", snapshot.visible && snapshot.closed, JSON.stringify(snapshot));
await click('[data-action="add-category"]');
await evaluate(`(() => {
  const input = document.querySelector('[data-category-name]');
  input.value = '夜宵';
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await click('[data-action="save-category"]');
await wait(100);
snapshot = await evaluate(`({ visible: document.body.innerText.includes('夜宵'), formClosed: !document.querySelector('.category-form') })`);
check("新增分类", snapshot.visible && snapshot.formClosed, JSON.stringify(snapshot));

await scenario("error-network");
snapshot = await evaluate(`({ title: document.querySelector('.voice-error h3')?.textContent || '', retry: !!document.querySelector('[data-action="voice-retry"]') })`);
check("网络失败恢复路径", snapshot.title.includes("网络") && snapshot.retry, JSON.stringify(snapshot));

await scenario("backup");
snapshot = await evaluate(`({ backupHero: !!document.querySelector('.backup-hero'), actions: document.querySelectorAll('.backup-actions .btn').length, overflow: document.querySelector('.screen')?.scrollWidth - document.querySelector('.screen')?.clientWidth || 0 })`);
check("云备份页面", snapshot.backupHero && snapshot.actions >= 2, JSON.stringify(snapshot));
check("云备份页无横向溢出", snapshot.overflow <= 1, `overflow=${snapshot.overflow}`);

await scenario("export");
await wait(200);
const documentNode = await send("DOM.getDocument", { depth: 1 });
const fileInput = await send("DOM.querySelector", {
  nodeId: documentNode.root.nodeId,
  selector: "#importBackupInput"
});
await send("DOM.setFileInputFiles", {
  nodeId: fileInput.nodeId,
  files: [fileURLToPath(new URL("./fixtures/backup-sample.json", import.meta.url))]
});
await wait(600);
snapshot = await evaluate(`({ imported: document.body.innerText.includes('导入测试'), restoredScreen: !!document.querySelector('.bottom-nav'), toast: !!document.querySelector('.toast') })`);
check("JSON 备份恢复", snapshot.imported && snapshot.restoredScreen, JSON.stringify(snapshot));

const domSummary = await evaluate(`({
  buttons: document.querySelectorAll('button').length,
  text: document.querySelector('#app')?.innerText.slice(0, 100) || ''
})`);

console.log(JSON.stringify({ results, runtimeErrors, domSummary }, null, 2));

await fs.writeFile(
  new URL("./screenshots/qa-report.json", import.meta.url),
  JSON.stringify({ results, runtimeErrors, domSummary, checkedAt: new Date().toISOString() }, null, 2)
);

socket.close();
