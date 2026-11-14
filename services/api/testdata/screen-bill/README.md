# 快捷记账合成评测

这里所有图片和文字都是虚构测试数据，不来自真实用户，不构成微信/支付宝/银行模板覆盖率。

- 6 张 700×1100 PNG：decimal、discount、bank-balance、missing-amount、failed、merchant-only，均标记“非真实账单”。
- synthetic-eval.json：8B/32B首轮对比，保留32B的两次超时。
- endpoint-smoke.json：编译后API→真实供应商的本地合成链路。
- time-evidence-diagnostic.json：公网出现时间安全降级后的原始时间字段诊断，仅合成数据。
- public-endpoint-smoke.json：公网完整链路，保留初次时间未验证的降级，不以重试替换失败记录。

运行脚本需服务端Key，仅记录合成结果，禁止加入真实账单、Key或Token。新增匿名化真实模板前需要用户明确授权及遮盖无关信息。
