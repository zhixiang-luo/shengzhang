import { combineLocalDateTime } from '@shengzhang/domain';

export type DateTimePickerMode = 'date' | 'datetime';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatPickerSelection(
  mode: DateTimePickerMode,
  date: Date,
  hour: number,
  minute: number,
): string {
  const day = `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
  return mode === 'date' ? day : `${day} · ${pad(hour)}:${pad(minute)}`;
}

export function pickerConfirmation(
  mode: DateTimePickerMode,
  date: Date,
  hour: number,
  minute: number,
): Date {
  if (mode === 'date') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  return combineLocalDateTime(date, hour, minute);
}
