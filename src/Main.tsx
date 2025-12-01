import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
} from 'react-native';
import FileShareScreen from './screens/FileShareScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from './utils/theme';
import { Database } from './database/database';
import HistoryScreen from './screens/HistoryScreen';

export default function Main() {
  const [screen, setScreen] = useState<'home' | 'dashboard' | 'history'>(
    'home',
  );
  const [name, setName] = useState('');

  useEffect(() => {
    Database.init();
  }, []);

  if (screen === 'dashboard') {
    return (
      <FileShareScreen
        myName={name || 'Unknown'}
        onExit={() => setScreen('home')}
        onHistory={() => setScreen('history')}
      />
    );
  }

  if (screen === 'history') {
    return <HistoryScreen onBack={() => setScreen('home')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.center}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>⚡️</Text>
        </View>

        <Text style={styles.title}>
          Peer<Text style={{ color: colors.secondary }}>Share</Text>
        </Text>
        <Text style={styles.subtitle}>SECURE P2P FILE SHARING</Text>

        <View style={styles.form}>
          <Text style={styles.label}>ENTER YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Name"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={() => setScreen('dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>Start Sharing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setScreen('history')}
          >
            <Text style={styles.historyText}>View Your Transfers</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footer}>DIRECT | FAST | SECURE</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    alignItems: 'center',
  },

  logoContainer: { marginBottom: 20, ...shadows.neon },
  logo: { fontSize: 60 },

  title: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  subtitle: {
    color: colors.subtext,
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 60,
    marginTop: 5,
  },

  form: { width: '100%' },
  label: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 2,
  },
  input: {
    backgroundColor: colors.input,
    color: colors.text,
    fontSize: 18,
    padding: 18,
    borderRadius: 6,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
    fontWeight: 'bold',
  },

  btn: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 6,
    alignItems: 'center',
    ...shadows.neon,
  },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 2 },

  footer: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  historyBtn: { marginTop: 20, alignSelf: 'center', padding: 10 },
  historyText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
});
