import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { toByteArray } from 'base64-js';
import { DataConn } from './PeerConnection';

export type SendOpts = {
  chunkSize?: number;
  highWaterMark?: number;
  onProgress?: (sent: number, total: number) => void;
};

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

async function resolveFile(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const dest = `${RNFS.CachesDirectoryPath}/${Date.now()}.tmp`;
    await ReactNativeBlobUtil.fs.cp(uri, dest);
    return dest;
  }
  return uri;
}

export async function sendFileStream(
  conn: DataConn,
  originalUri: string,
  fileName: string,
  opts: SendOpts = {},
): Promise<void> {
  const dc = conn.dc;
  if (!dc || dc.readyState !== 'open') {
    throw new Error('DataChannel not ready');
  }

  const safePath = await resolveFile(originalUri);
  let isTempFile = safePath !== originalUri;

  try {
    const stats = await RNFS.stat(safePath);
    const totalSize = parseInt(String(stats.size), 10);

    const CHUNK = opts.chunkSize ?? 16 * 1024;
    const HIGH_WATER = opts.highWaterMark ?? 64 * 1024;

    dc.send(
      JSON.stringify({ type: 'file-meta', name: fileName, size: totalSize }),
    );

    let offset = 0;

    while (offset < totalSize) {
      while ((dc.bufferedAmount ?? 0) > HIGH_WATER) {
        await sleep(10);
      }

      const remaining = totalSize - offset;
      const lengthToRead = Math.floor(Math.min(CHUNK, remaining));
      const currentOffset = Math.floor(offset);

      const chunkBase64 = await RNFS.read(
        safePath,
        lengthToRead,
        currentOffset,
        'base64',
      );

      const chunkU8 = toByteArray(chunkBase64);

      dc.send(chunkU8.buffer as ArrayBuffer);

      offset += lengthToRead;
      opts.onProgress?.(offset, totalSize);
    }

    dc.send(JSON.stringify({ type: 'file-complete', name: fileName }));
  } catch (err) {
    console.error('Error streaming file:', err);
    throw err;
  } finally {
    if (isTempFile) {
      await RNFS.unlink(safePath).catch(() => {});
    }
  }
}
