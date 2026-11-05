# 本地数据备份与恢复

日期：2026-11-05
状态：`0.1.7` 已实现，自动化验证通过
入口：设置 → 数据安全

## 1. 用户承诺

> 账本默认只保存在本机，你可以随时带走。

`0.1.7` 不依赖登录、云服务或支付主体。用户可以：

- 导出完整 JSON 备份；
- 导出便于 Excel/WPS 查看的 CSV；
- 从 JSON 覆盖恢复账本；
- 清空本机账本并恢复内置分类。

## 2. JSON 备份格式

顶层格式：

```json
{
  "format": "shengzhang-backup",
  "schemaVersion": 1,
  "exportedAt": "2026-11-05T08:00:00.000Z",
  "appVersion": "0.1.7",
  "counts": {
    "transactions": 42,
    "categories": 72,
    "voiceBatches": 9
  },
  "checksum": "fnv1a32:12ab34cd",
  "data": {
    "categories": [],
    "transactions": [],
    "voiceBatches": [],
    "appSettings": []
  }
}
```

`data` 是恢复的唯一数据来源。`checksum` 由规范化后的 `data` 计算，用于发现文件损坏或截断，不作为加密或对抗恶意篡改的安全签名。

不包含：

- API Key、Token、模型配置；
- 原始录音；
- 匿名安装 ID；
- 服务器日志或用户敏感资料。

## 3. 恢复规则

第一版只做完整覆盖恢复：

1. 读取并校验文件结构、版本、数量和引用关系；
2. 展示导出时间、App 版本、账单数和分类数；
3. 当前账本非空时再要求一次不可撤销确认；
4. 在 SQLite exclusive transaction 中替换所有可携带表；
5. 失败时回滚，保持当前账本不变。

顺序必须先分类、再语音批次、再账单，确保外键有效。父分类必须早于二级分类插入。

明确不做：

- 合并两份账本；
- 自动解决 ID 冲突；
- 静默上传到云备份；
- 从 CSV 恢复。

## 4. CSV 规则

CSV 只用于查看和二次处理，不用于恢复。

- 使用 UTF-8 BOM，避免中文在 Excel/WPS 中乱码；
- 字段为日期、时间、类型、金额、一级分类、二级分类、备注、来源；
- 只导出未删除账单；
- 以 `=`, `+`, `-`, `@`, Tab 或换行开头的单元格前加单引号，防止电子表格执行公式；
- 包含逗号、引号或换行的字段按 RFC 4180 规则转义。

## 5. 清空数据

清空操作必须二次确认，并明确当前没有云备份、删除不可从服务器找回。

事务内删除：

- 账单；
- 语音批次；
- 用户分类；
- 应用设置。

随后重新写入版本内置分类。任一步失败则整体回滚。

## 6. 实现位置

| 能力 | 文件 |
| --- | --- |
| 格式、校验、CSV | `packages/domain/src/data-portability.ts` |
| SQL 替换与清空 | `apps/mobile/src/features/dataSafety/portableDatabase.ts` |
| 本机快照与事务包装 | `apps/mobile/src/db/dataSafetyRepository.ts` |
| 文件选择与分享 | `apps/mobile/src/services/dataSafetyFiles.ts` |
| 数据安全页面 | `apps/mobile/src/app/data-safety.tsx` |
| 用户提示与确认文案 | `apps/mobile/src/features/dataSafety/dataSafetyMessages.ts` |

## 7. 验证基线

自动化已验证：

- 格式、计数、校验和与非法引用拒绝；
- CSV 中文 BOM、分隔符与公式注入处理；
- 真实 SQLite 覆盖替换；
- 写入失败整体回滚；
- 清空后恢复全部内置分类；
- TypeScript、ESLint、全仓测试和 Android/iOS bundle 导出。

仍需真机验收：

- Android/iOS 系统文件选择器；
- 系统分享面板保存文件；
- 从官网安装包执行“导出 → 清空 → 恢复”完整闭环；
- 大账本和中低端设备上的耗时与 UI 表现。
