import { open } from 'react-native-nitro-sqlite';

const db = open({ name: 'peershare.sqlite' });

export interface TransferLog {
  id: string;
  type: 'upload' | 'download';
  name: string;
  size: number;
  peerId: string;
  timestamp: number;
  status: 'completed' | 'error';
}

export const Database = {
  init: () => {
    try {
      db.execute(`
        CREATE TABLE IF NOT EXISTS transfers (
          id TEXT PRIMARY KEY,
          type TEXT,
          name TEXT,
          size INTEGER,
          peerId TEXT,
          timestamp INTEGER,
          status TEXT
        );
      `);
      console.log('Database initialized');
    } catch (e) {
      console.error('DB Init Error', e);
    }
  },

  addLog: (log: TransferLog) => {
    try {
      db.execute(
        'INSERT INTO transfers (id, type, name, size, peerId, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          log.id,
          log.type,
          log.name,
          log.size,
          log.peerId,
          log.timestamp,
          log.status,
        ],
      );
    } catch (e) {
      console.error('DB Insert Error', e);
    }
  },

  getHistory: (): TransferLog[] => {
    try {
      const results = db.execute(
        'SELECT * FROM transfers ORDER BY timestamp DESC',
      );

      if (results?.rows?._array) {
        return results.rows._array as unknown as TransferLog[];
      } else if (results?.rows && Array.isArray(results.rows)) {
        return results.rows as TransferLog[];
      } else if (Array.isArray(results)) {
        return results as TransferLog[];
      }
      return [];
    } catch (e) {
      console.error('DB Read Error', e);
      return [];
    }
  },

  clear: () => {
    try {
      db.execute('DELETE FROM transfers');
    } catch (e) {
      console.error('DB Clear Error', e);
    }
  },
};
