import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

interface Props {
  type: 'upload' | 'download';
  name: string;
  size: number;
  progress: number;
  status: string;
}

export const TransferCard = ({ type, name, size, progress, status }: Props) => {
  const isUp = type === 'upload';
  const percent = Math.round(progress * 100);

  // Format bytes to MB/KB
  const sizeStr =
    size > 1024 * 1024
      ? (size / 1024 / 1024).toFixed(2) + ' MB'
      : (size / 1024).toFixed(1) + ' KB';

  return (
    <View style={styles.card}>
      {/* Icon Area */}
      <View style={[styles.icon, isUp ? styles.iconUp : styles.iconDown]}>
        <Text style={styles.emoji}>{isUp ? '↑' : '↓'}</Text>
      </View>

      {/* Info Area */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta}>{sizeStr}</Text>
        </View>

        {/* Progress Bar Background */}
        <View style={styles.barBg}>
          {/* Progress Bar Fill */}
          <View
            style={[
              styles.barFill,
              {
                width: `${percent}%`,
                backgroundColor:
                  status === 'error'
                    ? colors.error
                    : isUp
                    ? colors.primary
                    : colors.secondary,
              },
            ]}
          />
        </View>

        <Text style={styles.status}>
          {status === 'completed'
            ? 'TRANSMISSION COMPLETE'
            : status === 'error'
            ? 'TRANSMISSION FAILED'
            : `${percent}% TRANSMITTED`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconUp: { backgroundColor: 'rgba(98, 0, 238, 0.2)' },
  iconDown: { backgroundColor: 'rgba(3, 218, 198, 0.2)' },
  emoji: { color: colors.text, fontWeight: 'bold', fontSize: 18 },
  info: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: { color: colors.text, fontWeight: 'bold', flex: 1, marginRight: 10 },
  meta: { color: colors.subtext, fontSize: 10, fontFamily: 'monospace' },
  barBg: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 2 },
  status: {
    color: colors.subtext,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
});
