import ReactNativeBlobUtil from 'react-native-blob-util';
import { fromByteArray } from 'base64-js';
import { Platform } from 'react-native';
import { DataConn } from './PeerConnection';

interface WebRTCMessageEvent {
  data: string | ArrayBuffer;
}

export type ReceiverOptions = {
  destDir?: string;
  onStart?: (meta: { name: string; size: number }) => void;
  onProgress?: (received: number, total: number) => void;
  onComplete?: (fileUri: string, meta: { name: string; size: number }) => void;
  onError?: (err: unknown) => void;
};

type ActiveTransfer = {
  name: string;
  size: number;
  received: number;
  tempPath: string;
  stream: any;
};

export function attachFileReceiver(conn: DataConn, opts: ReceiverOptions = {}) {
  const dc = conn.dc;
  if (!dc) throw new Error('attachFileReceiver: DataChannel missing');

  let activeTransfer: ActiveTransfer | null = null;

  let writeQueue = Promise.resolve();

  const handleMessage = (event: WebRTCMessageEvent) => {
    writeQueue = writeQueue
      .then(async () => {
        const data = event.data;

        if (typeof data === 'string') {
          try {
            const msg = JSON.parse(data);

            if (msg.type === 'file-meta') {
              const name = msg.name || `file_${Date.now()}.bin`;
              const size = Number(msg.size);
              const tempPath = `${
                ReactNativeBlobUtil.fs.dirs.CacheDir
              }/${Date.now()}_${name}`;

              const stream = await ReactNativeBlobUtil.fs.writeStream(
                tempPath,
                'base64',
                false,
              );

              activeTransfer = { name, size, received: 0, tempPath, stream };
              opts.onStart?.({ name, size });
            } else if (msg.type === 'file-complete') {
              if (!activeTransfer) return;

              await activeTransfer.stream.close();

              let finalPath = '';

              if (Platform.OS === 'android') {
                try {
                  const dest =
                    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
                      {
                        name: activeTransfer.name,
                        parentFolder: '',
                        mimeType: 'application/octet-stream',
                      },
                      'Download',
                      activeTransfer.tempPath,
                    );

                  finalPath = dest;

                  await ReactNativeBlobUtil.fs.unlink(activeTransfer.tempPath);
                } catch (err) {
                  console.error('MediaStore Error:', err);
                  finalPath = activeTransfer.tempPath;
                }
              } else {
                finalPath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${activeTransfer.name}`;
                if (await ReactNativeBlobUtil.fs.exists(finalPath)) {
                  await ReactNativeBlobUtil.fs.unlink(finalPath);
                }
                await ReactNativeBlobUtil.fs.mv(
                  activeTransfer.tempPath,
                  finalPath,
                );
              }

              opts.onComplete?.(finalPath, {
                name: activeTransfer.name,
                size: activeTransfer.size,
              });
              activeTransfer = null;
            }
          } catch (err) {
            console.error('Meta Error:', err);
            opts.onError?.(err);
          }
        } else if (activeTransfer) {
          try {
            let buffer: ArrayBuffer | null = null;
            if (data instanceof ArrayBuffer) buffer = data;
            else if ((data as any).buffer instanceof ArrayBuffer)
              buffer = (data as any).buffer;

            if (buffer) {
              const b64Chunk = fromByteArray(new Uint8Array(buffer));

              await activeTransfer.stream.write(b64Chunk);

              activeTransfer.received += buffer.byteLength;
              opts.onProgress?.(activeTransfer.received, activeTransfer.size);
            }
          } catch (err) {
            console.error('Write Error:', err);
            opts.onError?.(err);
          }
        }
      })
      .catch(err => {
        console.error('Queue Error:', err);
      });
  };

  dc.addEventListener('message', handleMessage as any);

  return () => {
    dc.removeEventListener('message', handleMessage as any);
  };
}
