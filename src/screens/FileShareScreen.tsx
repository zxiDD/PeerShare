/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import { TransferCard } from '../components/TransferCard';
import { initializePeer, connectToPeer } from '../services/PeerConnection';
import { attachFileReceiver } from '../services/receiveFile';
import { sendFileStream } from '../services/sendFile';
import { colors, shadows } from '../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  myName: string;
  onExit: () => void;
}

export default function FileShareScreen({ myName, onExit }: Props) {
  const [myId, setMyId] = useState('...');
  const [remoteId, setRemoteId] = useState('');
  const [status, setStatus] = useState<'offline' | 'connecting' | 'connected'>(
    'offline',
  );

  const [transfers, setTransfers] = useState<any[]>([]);

  const connRef = useRef<any>(null);

  useEffect(() => {
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    setMyId(id);

    initializePeer(id, incomingConn => {
      console.log('Incoming connection detected');
      setupConnection(incomingConn);
    }).catch(err => Alert.alert('Init Error', String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupConnection = (conn: any) => {
    connRef.current = conn;
    setStatus('connected');

    attachFileReceiver(conn, {
      onStart: meta => {
        addTransfer('download', meta.name, meta.size);
      },
      onProgress: (received, total) => {
        updateProgress('download', received / total);
      },
      onComplete: path => {
        completeTransfer('download');
        Alert.alert('File Received', `Saved to:\n${path}`);
      },
      onError: err => {
        console.error(err);
        failTransfer('download');
      },
    });
  };

  const handleConnect = async () => {
    Keyboard.dismiss();
    if (remoteId.length < 3) return;
    setStatus('connecting');
    try {
      const c = await connectToPeer(remoteId);
      setupConnection(c);
    } catch (e) {
      Alert.alert('Connection Failed', String(e));
      setStatus('offline');
    }
  };

  const handleSend = async () => {
    if (status !== 'connected') return;

    try {
      const [res] = await pick({ type: types.allFiles });
      if (!res.uri) return;

      const name = res.name || 'file';
      const size = res.size || 0;

      addTransfer('upload', name, size);

      setTimeout(async () => {
        try {
          await sendFileStream(connRef.current, res.uri, name, {
            onProgress: (sent, total) => updateProgress('upload', sent / total),
          });
          completeTransfer('upload');
        } catch (e) {
          failTransfer('upload');
          Alert.alert('Send Error', String(e));
        }
      }, 500);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)
        return;
      Alert.alert('Picker Error', String(e));
    }
  };

  const addTransfer = (type: string, name: string, size: number) => {
    setTransfers(prev => [
      {
        id: Date.now().toString(),
        type,
        name,
        size,
        progress: 0,
        status: 'active',
      },
      ...prev,
    ]);
  };

  const updateProgress = (type: string, val: number) => {
    setTransfers(prev => {
      const idx = prev.findIndex(t => t.type === type && t.status === 'active');
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx].progress = val;
      return copy;
    });
  };

  const completeTransfer = (type: string) => {
    setTransfers(prev => {
      const idx = prev.findIndex(t => t.type === type && t.status === 'active');
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx].status = 'completed';
      copy[idx].progress = 1;
      return copy;
    });
  };

  const failTransfer = (type: string) => {
    setTransfers(prev => {
      const idx = prev.findIndex(t => t.type === type && t.status === 'active');
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx].status = 'error';
      return copy;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Peer<Text style={{ color: colors.secondary }}>Share</Text>
          </Text>
          <Text style={styles.subTitle}>OPERATOR: {myName.toUpperCase()}</Text>
          <Text style={styles.id}>
            ID: <Text style={{ color: '#FFF' }}>{myId}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
          <Text style={styles.exitText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>TARGET SYSTEM ID</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={remoteId}
            onChangeText={setRemoteId}
            placeholder="000000"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            maxLength={6}
          />
          <TouchableOpacity
            style={[
              styles.btn,
              status === 'connected' && { backgroundColor: colors.success },
            ]}
            onPress={handleConnect}
            disabled={status !== 'offline'}
          >
            {status === 'connecting' ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.btnText}>
                {status === 'connected' ? 'LINKED' : 'CONNECT'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.mainBtn, status !== 'connected' && styles.disabledBtn]}
        onPress={handleSend}
        disabled={status !== 'connected'}
        activeOpacity={0.8}
      >
        <Text style={styles.mainBtnText}>INITIATE UPLOAD</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>RECENT TRANSFERS</Text>
      <FlatList
        data={transfers}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <TransferCard {...item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 20,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  subTitle: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
  id: {
    color: colors.secondary,
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 2,
    fontWeight: 'bold',
  },
  exitBtn: { padding: 5 },
  exitText: { color: colors.error, fontWeight: 'bold', fontSize: 12 },

  box: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    ...shadows.card,
  },
  label: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: colors.input,
    color: colors.text,
    padding: 12,
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  btn: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

  mainBtn: {
    backgroundColor: colors.secondary,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.neon,
  },
  disabledBtn: { opacity: 0.3, shadowOpacity: 0 },
  mainBtnText: {
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    fontSize: 16,
  },

  sectionHeader: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 1,
  },
});
