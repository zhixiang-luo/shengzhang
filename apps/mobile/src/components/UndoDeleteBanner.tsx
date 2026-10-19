import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDatabase } from '../db/DatabaseProvider';
import { restoreTransaction } from '../db/transactionRepository';
import { useUndoDeleteStore } from '../stores/undoStore';
import { colors } from '../theme/tokens';

export function UndoDeleteBanner({ onRestored }: { onRestored: () => void }) {
  const db = useDatabase();
  const deleted = useUndoDeleteStore((state) => state.deleted);
  const clear = useUndoDeleteStore((state) => state.clear);

  if (!deleted) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.banner}>
        <Text style={styles.text}>已删除 1 笔账单</Text>
        <Pressable
          onPress={() => {
            restoreTransaction(db, deleted.id);
            clear();
            onRestored();
          }}
          style={styles.action}
        >
          <Text style={styles.actionText}>撤销</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    bottom: 118,
    left: 20,
    alignItems: 'center',
  },
  banner: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#292624',
    shadowColor: '#292624',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  text: {
    color: 'rgba(255, 253, 248, 0.76)',
    fontSize: 12,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    color: colors.blushSoft,
    fontSize: 12,
    fontWeight: '700',
  },
});
