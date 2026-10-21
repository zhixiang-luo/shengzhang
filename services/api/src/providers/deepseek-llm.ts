import { z } from 'zod';

import type { VoiceCategory, VoiceProviderEntry, VoiceProviderInput } from './voice.js';
import { normalizeVoiceOccurredAt } from './voiceTime.js';

const llmEntrySchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
  amountMinor: z.number().int().positive().nullable().optional(),
  categoryPath: z.array(z.string().min(1)).min(1).max(4).optional(),
  occurredAt: z.string().nullable().optional(),
  note: z.string().max(40).optional(),
});

const llmResponseSchema = z.object({
  entries: z.array(llmEntrySchema).min(1).max(5),
});

export interface StructuredParser {
  parse(input: {
    transcript: string;
    timezone: string;
    categories: VoiceCategory[];
  }): Promise<{ entries: VoiceProviderEntry[]; unresolvedFields: string[] }>;
}

function categoryPrompt(categories: VoiceCategory[]): string {
  return categories
    .map(
      (category) =>
        `${category.type === 'expense' ? '支出' : '收入'} / ${category.name} / ${
          category.children.length ? category.children.join('、') : '无二级分类'
        }`,
    )
    .join('\n');
}

export class DeepSeekStructuredParser implements StructuredParser {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async parse(input: {
    transcript: string;
    timezone: string;
    categories: VoiceCategory[];
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const nowIso = new Date().toISOString();
    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.1,
            max_tokens: 800,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: [
                  '你是“声账”的记账结构化解析器，只输出 JSON。',
                  '根据用户语音转写生成 1–5 笔账单。',
                  '字段：type(expense|income)、amountMinor(整数分)、categoryPath(数组)、occurredAt(ISO 8601)、note。',
                  'categoryPath 只能包含一级/二级分类名称，不要包含“支出”或“收入”。',
                  '不能猜测缺失金额；缺失时 amountMinor 输出 null，并把条目索引写入 unresolvedFields。',
                  '优先使用给定分类；不确定收支类型时默认 expense。',
                  '只有用户明确说出日期或时间时才填写 occurredAt；没有明确时间信息时必须输出 null，不能按分类、收支类型或生活常识补时刻。',
                  `时区：${input.timezone}`,
                  `当前时间：${nowIso}`,
                  '可用分类：',
                  categoryPrompt(input.categories),
                  '输出格式：{"entries":[...],"unresolvedFields":["entries[0].amountMinor"]}',
                ].join('\n'),
              },
              { role: 'user', content: input.transcript },
            ],
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`LLM_REQUEST_FAILED_${response.status}`);

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('LLM_EMPTY_RESPONSE');

      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('LLM_INVALID_JSON');
      const parsed = llmResponseSchema.parse(JSON.parse(content.slice(jsonStart, jsonEnd + 1)));
      const unresolvedFields: string[] = [];

      const entries = parsed.entries.map((entry, index) => {
        if (entry.amountMinor == null) unresolvedFields.push(`entries[${index}].amountMinor`);
        const rawPath =
          entry.categoryPath?.[0] === '支出' || entry.categoryPath?.[0] === '收入'
            ? entry.categoryPath.slice(1)
            : entry.categoryPath;
        const categoryPath = rawPath
          ? rawPath[1]
            ? [rawPath[0], rawPath[1]]
            : [rawPath[0]]
          : undefined;
        return {
          type: entry.type,
          amountMinor: entry.amountMinor ?? undefined,
          categoryPath: categoryPath as [string] | [string, string] | undefined,
          occurredAt: normalizeVoiceOccurredAt({
            transcript: input.transcript,
            occurredAt: entry.occurredAt,
            nowIso,
            timezone: input.timezone,
          }),
          note: entry.note,
        };
      });

      return { entries, unresolvedFields };
    } finally {
      clearTimeout(timeout);
    }
  }
}
