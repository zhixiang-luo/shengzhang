export interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function buildMonthGrid(
  year: number,
  monthIndex: number,
  today: Date = new Date(),
): CalendarCell[] {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error('Invalid calendar month');
  }

  const first = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - mondayOffset, 12, 0, 0, 0);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
      12,
      0,
      0,
      0,
    );
    return {
      date,
      inCurrentMonth: date.getMonth() === monthIndex,
      isToday: sameLocalDay(date, today),
    };
  });
}

export function combineLocalDateTime(date: Date, hours: number, minutes: number): Date {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error('Invalid time');
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}
