import { buildMonthGrid, combineLocalDateTime, type CalendarCell } from '@shengzhang/domain';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../theme/tokens';
import { AnimatedSheetModal } from './AnimatedSheetModal';
import { Icon } from './Icon';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

type DateTimePickerSheetProps = {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSelectedDate(date: Date, hour: number, minute: number): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]} · ${pad(hour)}:${pad(minute)}`;
}

function scrollToIndex(
  ref: RefObject<ScrollViewInstance | null>,
  index: number,
  itemWidth: number,
) {
  ref.current?.scrollTo({ x: Math.max(0, (index - 2) * itemWidth), animated: false });
}

export function DateTimePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
}: DateTimePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [today] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(value);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1),
  );
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());
  const hourScrollRef = useRef<ScrollViewInstance>(null);
  const minuteScrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => {
      setSelectedDate(value);
      setVisibleMonth(new Date(value.getFullYear(), value.getMonth(), 1));
      setHour(value.getHours());
      setMinute(value.getMinutes());
    });
    return () => cancelAnimationFrame(frame);
  }, [value, visible]);

  const cells = buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth(), today);

  const chooseDay = (cell: CalendarCell) => {
    setSelectedDate(cell.date);
    if (cell.date.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
  };

  const shiftVisibleMonth = (delta: number) => {
    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1),
    );
  };

  const chooseNow = () => {
    const now = new Date();
    setSelectedDate(now);
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setHour(now.getHours());
    setMinute(now.getMinutes());
  };

  return (
    <AnimatedSheetModal
      closeAccessibilityLabel="关闭时间选择器"
      onRequestClose={onClose}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}
      visible={visible}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SELECT DATE & TIME</Text>
          <Text style={styles.title}>选择时间</Text>
        </View>
        <Pressable onPress={chooseNow} style={styles.nowButton}>
          <Icon name="clock" size={15} color={colors.blushDeep} />
          <Text style={styles.nowText}>现在</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.selectedLabel}>
          {formatSelectedDate(selectedDate, hour, minute)}
        </Text>

        <View style={styles.calendar}>
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityLabel="上个月"
              onPress={() => shiftVisibleMonth(-1)}
              style={styles.monthArrow}
            >
              <Icon name="chevron-left" size={19} color={colors.inkSecondary} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {visibleMonth.getFullYear()}年{visibleMonth.getMonth() + 1}月
            </Text>
            <Pressable
              accessibilityLabel="下个月"
              onPress={() => shiftVisibleMonth(1)}
              style={styles.monthArrow}
            >
              <Icon name="chevron-right" size={19} color={colors.inkSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {cells.map((cell) => {
              const selected = sameDay(cell.date, selectedDate);
              return (
                <Pressable
                  accessibilityLabel={`${cell.date.getFullYear()}年${cell.date.getMonth() + 1}月${cell.date.getDate()}日`}
                  key={cell.date.toISOString()}
                  onPress={() => chooseDay(cell)}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected && styles.daySelected,
                      !selected && cell.isToday && styles.dayToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !cell.inCurrentMonth && styles.dayMuted,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {cell.date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.timeSection}>
          <View style={styles.timeHeading}>
            <Text style={styles.timeTitle}>具体时间</Text>
            <Text style={styles.timeValue}>{pad(hour)}:{pad(minute)}</Text>
          </View>

          <Text style={styles.timeLabel}>小时</Text>
          <ScrollView
            contentContainerStyle={styles.timeRow}
            horizontal
            onContentSizeChange={() => scrollToIndex(hourScrollRef, hour, 50)}
            ref={hourScrollRef}
            showsHorizontalScrollIndicator={false}
          >
            {HOURS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setHour(item)}
                style={[styles.timePill, hour === item && styles.timePillSelected]}
              >
                <Text
                  style={[
                    styles.timePillText,
                    hour === item && styles.timePillTextSelected,
                  ]}
                >
                  {pad(item)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.timeLabel}>分钟</Text>
          <ScrollView
            contentContainerStyle={styles.timeRow}
            horizontal
            onContentSizeChange={() => scrollToIndex(minuteScrollRef, minute, 50)}
            ref={minuteScrollRef}
            showsHorizontalScrollIndicator={false}
          >
            {MINUTES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setMinute(item)}
                style={[styles.timePill, minute === item && styles.timePillSelected]}
              >
                <Text
                  style={[
                    styles.timePillText,
                    minute === item && styles.timePillTextSelected,
                  ]}
                >
                  {pad(item)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>取消</Text>
        </Pressable>
        <Pressable
          onPress={() => onConfirm(combineLocalDateTime(selectedDate, hour, minute))}
          style={styles.confirmButton}
        >
          <Text style={styles.confirmText}>确定时间</Text>
        </Pressable>
      </View>
    </AnimatedSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '94%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.canvas,
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  eyebrow: {
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 27,
  },
  nowButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.blushSoft,
  },
  nowText: {
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    paddingBottom: spacing.md,
  },
  selectedLabel: {
    marginTop: spacing.md,
    color: colors.inkSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  calendar: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 19,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  weekday: {
    width: '14.2857%',
    color: colors.inkTertiary,
    fontSize: 10,
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  daySelected: {
    backgroundColor: colors.ink,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.blush,
  },
  dayText: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  dayMuted: {
    color: colors.inkTertiary,
  },
  dayTextSelected: {
    color: colors.surface,
    fontWeight: '700',
  },
  timeSection: {
    marginTop: spacing.lg,
  },
  timeHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  timeTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  timeValue: {
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 21,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    marginTop: spacing.md,
    marginBottom: 7,
    color: colors.inkTertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  timeRow: {
    gap: 6,
    paddingRight: spacing.xl,
  },
  timePill: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePillSelected: {
    borderColor: colors.blushDeep,
    backgroundColor: colors.blushSoft,
  },
  timePillText: {
    color: colors.inkSecondary,
    fontFamily: typography.number,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  timePillTextSelected: {
    color: colors.blushDeep,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  cancelText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1.5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  confirmText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
