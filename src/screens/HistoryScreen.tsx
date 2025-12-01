/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { Database, TransferLog } from '../database/database';
import { TransferCard } from '../components/TransferCard';
import { colors } from '../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<TransferLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'upload' | 'download'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = Database.getHistory();
    setLogs(data);
  };

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all transfer history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Database.clear();
          loadData();
        },
      },
    ]);
  };

  const filteredLogs = logs.filter(l =>
    filter === 'all' ? true : l.type === filter,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'< BACK'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transfer History</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['all', 'upload', 'download'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.activeTab]}
            onPress={() => setFilter(f as any)}
          >
            <Text
              style={[styles.tabText, filter === f && styles.activeTabText]}
            >
              {f === 'all' ? 'ALL' : f === 'upload' ? 'SENT' : 'RECEIVED'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.dateLabel}>
              {new Date(item.timestamp).toLocaleString()} • ID:{' '}
              {item.peerId.slice(0, 4)}
            </Text>
            <TransferCard
              type={item.type}
              name={item.name}
              size={item.size}
              progress={1}
              status={item.status}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No Transfers Yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
  backBtn: { padding: 5 },
  backText: { color: colors.secondary, fontWeight: 'bold', fontSize: 12 },
  clearText: { color: colors.error, fontWeight: 'bold', fontSize: 12 },

  tabs: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'center',
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: colors.card,
  },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activeTabText: { color: '#FFF' },

  dateLabel: {
    color: colors.secondary,
    fontSize: 10,
    marginBottom: 5,
    marginTop: 15,
    fontFamily: 'monospace',
  },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: {
    color: colors.subtext,
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
});
