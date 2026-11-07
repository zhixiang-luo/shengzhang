const DATE_PATTERNS = [
  /今天|今日|昨天|昨日|前天|明天|后天|当天|当日|刚刚|刚才|今晚|昨晚|明早/,
  /(?:周|星期)[一二三四五六日天]/,
  /[上下本这]周/,
  /(?:\d{1,2}|[一二三四五六七八九十]{1,3})月(?:\d{1,2}|[一二三四五六七八九十]{1,3})[日号]/,
  /月底|月初/,
];

const TIME_PATTERNS = [
  /凌晨|早上|上午|中午|下午|傍晚|晚上|半夜|今晚|昨晚|明早/,
  /刚刚|刚才/,
  /\d{1,2}[:：]\d{1,2}/,
  /[零一二三四五六七八九十百两\d]{1,4}点(?:半|整|[零一二三四五六七八九十百两\d]|$)/,
];

const RELATIVE_DATE_RULES = [
  { pattern: /前天/, offset: -2 },
  { pattern: /昨天|昨日|昨晚/, offset: -1 },
  { pattern: /今天|今日|今晚|当天|当日/, offset: 0 },
] as const;

const EXACT_CLOCK_PATTERNS = [
  /\d{1,2}[:：]\d{1,2}/,
  /[零一二三四五六七八九十百两\d]{1,4}点(?:半|整|[零一二三四五六七八九十百两\d]|$)/,
];

const PERIOD_TIME_RULES = [
  { pattern: /上午/, hour: 10 },
  { pattern: /中午|正午/, hour: 12 },
  { pattern: /下午/, hour: 15 },
] as const;

export interface TemporalExpressionInfo {
  hasDate: boolean;
  hasTime: boolean;
}

export function classifyTemporalExpression(transcript: string): TemporalExpressionInfo {
  return {
    hasDate: DATE_PATTERNS.some((pattern) => pattern.test(transcript)),
    hasTime: TIME_PATTERNS.some((pattern) => pattern.test(transcript)),
  };
}

export function hasExplicitTemporalExpression(transcript: string): boolean {
  const expression = classifyTemporalExpression(transcript);
  return expression.hasDate || expression.hasTime;
}

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function dateParts(date: Date, timezone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.get('year') ?? 1970,
    month: values.get('month') ?? 1,
    day: values.get('day') ?? 1,
    hour: values.get('hour') ?? 0,
    minute: values.get('minute') ?? 0,
    second: values.get('second') ?? 0,
  };
}

function shiftDate(parts: DateParts, days: number): DateParts {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function spokenDateParts(transcript: string, now: DateParts): DateParts | null {
  const offsets = new Set(
    RELATIVE_DATE_RULES.filter((rule) => rule.pattern.test(transcript)).map(
      (rule) => rule.offset,
    ),
  );
  if (offsets.size !== 1) return null;
  return shiftDate(now, [...offsets][0] ?? 0);
}

function spokenPeriodTime(
  transcript: string,
): Pick<DateParts, 'hour' | 'minute' | 'second'> | null {
  if (EXACT_CLOCK_PATTERNS.some((pattern) => pattern.test(transcript))) return null;
  const hours = new Set(
    PERIOD_TIME_RULES.filter((rule) => rule.pattern.test(transcript)).map(
      (rule) => rule.hour,
    ),
  );
  if (hours.size !== 1) return null;
  return { hour: [...hours][0] ?? 0, minute: 0, second: 0 };
}

function wallTimeToIso(parts: DateParts, timezone: string): string {
  const wallTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let instant = wallTime;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const represented = dateParts(new Date(instant), timezone);
    const representedWallTime = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    instant = wallTime - (representedWallTime - instant);
  }
  return new Date(instant).toISOString();
}

export function normalizeVoiceOccurredAt(input: {
  transcript: string;
  occurredAt: string | null | undefined;
  nowIso: string;
  timezone: string;
}): string {
  const temporal = classifyTemporalExpression(input.transcript);
  if (!temporal.hasDate && !temporal.hasTime) return input.nowIso;

  const candidate = input.occurredAt ? new Date(input.occurredAt) : null;
  const currentTime = dateParts(new Date(input.nowIso), input.timezone);
  const candidateDate =
    candidate && !Number.isNaN(candidate.getTime())
      ? dateParts(candidate, input.timezone)
      : null;
  const spokenDate = spokenDateParts(input.transcript, currentTime);
  const spokenTime = spokenPeriodTime(input.transcript);
  if (spokenDate) {
    const timeSource =
      spokenTime ?? (temporal.hasTime && candidateDate ? candidateDate : currentTime);
    return wallTimeToIso(
      {
        ...spokenDate,
        hour: timeSource.hour,
        minute: timeSource.minute,
        second: timeSource.second,
      },
      input.timezone,
    );
  }
  if (spokenTime) {
    return wallTimeToIso(
      {
        ...(candidateDate ?? currentTime),
        ...spokenTime,
      },
      input.timezone,
    );
  }
  if (temporal.hasTime) return input.occurredAt ?? input.nowIso;
  if (!candidateDate) return input.nowIso;
  return wallTimeToIso(
    {
      ...candidateDate,
      hour: currentTime.hour,
      minute: currentTime.minute,
      second: currentTime.second,
    },
    input.timezone,
  );
}
