# 语音评测集

`cases.json` 固定包含 200 条中文生活口语，覆盖：

- 单笔支出与收入
- 中文/阿拉伯数字和块角分
- 2–3 笔一句话
- 今天、昨天、前天、具体日期
- 缺少金额
- 预设分类的二级类目

重新生成固定数据集：

```bash
node services/api/scripts/generate-voice-eval.mjs
```

运行前 20 条：

```bash
pnpm --filter @shengzhang/api exec tsx scripts/evaluate-voice.ts --limit=20
```

运行全部 200 条：

```bash
pnpm --filter @shengzhang/api exec tsx scripts/evaluate-voice.ts --limit=200
```

只重跑指定失败样例：

```bash
pnpm --filter @shengzhang/api exec tsx scripts/evaluate-voice.ts --ids=single-025,multi-001
```

脚本使用 macOS `say` 生成测试音频，通过本地火山 WebSocket 网关转写，再调用 DeepSeek 结构化。报告写入 `last-report.json`，不会提交音频文件。
