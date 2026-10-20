import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeepSeekStructuredParser } from './deepseek-llm.js';

const parser = new DeepSeekStructuredParser('test-key', 'https://api.deepseek.com', 'deepseek-chat');

describe('DeepSeekStructuredParser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses structured entries and reports missing amounts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    entries: [
                      {
                        type: 'expense',
                        amountMinor: 2500,
                        categoryPath: ['支出', '餐饮', '午餐'],
                        note: '午饭',
                      },
                      {
                        type: 'expense',
                        categoryPath: ['交通', '打车'],
                        note: '打车',
                      },
                    ],
                    unresolvedFields: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = await parser.parse({
      transcript: '午饭25，打车',
      timezone: 'Asia/Shanghai',
      categories: [
        { name: '餐饮', type: 'expense', children: ['午餐'] },
        { name: '交通', type: 'expense', children: ['打车'] },
      ],
    });

    expect(result.entries).toHaveLength(2);
    expect(result.unresolvedFields).toEqual(['entries[1].amountMinor']);
  });

  it('rejects non-json model output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'not-json' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      parser.parse({ transcript: '午饭', timezone: 'Asia/Shanghai', categories: [] }),
    ).rejects.toThrow('LLM_INVALID_JSON');
  });
});
