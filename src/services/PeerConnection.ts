import { Platform } from 'react-native';
import { RTCPeerConnection, RTCIceCandidate } from 'react-native-webrtc';
import RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel';

export type DataConn = {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  remoteId: string;
  send: (data: any) => void;
  close: () => void;
};

let ws: WebSocket | undefined;
let myId: string | undefined;
const conns = new Map<string, DataConn>();
const pendingCandidates = new Map();

async function safeAddCandidate(
  remoteId: string,
  pc: RTCPeerConnection,
  cand: any,
) {
  if (!cand) return;
  try {
    console.log(
      '[ICE] trying addIceCandidate',
      remoteId,
      cand.sdpMid,
      cand.sdpMLineIndex,
    );
    await pc.addIceCandidate(new RTCIceCandidate(cand));
    console.log('[ICE] addIceCandidate succeeded', remoteId);
    return true;
  } catch (err) {
    console.warn('[ICE] addIceCandidate FAILED', remoteId, err);
    return false;
  }
}

async function drainPendingCandidates(remoteId: string) {
  const queued = pendingCandidates.get(remoteId);
  if (!queued || queued.length === 0) return;
  const conn = conns.get(remoteId);
  if (!conn || !conn.pc) {
    console.log('[ICE] cannot drain - no pc for', remoteId);
    return;
  }
  if (!conn.pc.remoteDescription || !conn.pc.remoteDescription.type) {
    console.log('[ICE] cannot drain - remoteDesc missing for', remoteId);
    return;
  }

  console.log('[ICE] draining', queued.length, 'candidates for', remoteId);
  while (queued.length) {
    const cand = queued.shift();
    try {
      await conn.pc.addIceCandidate(new RTCIceCandidate(cand));
      console.log('[ICE] drained candidate ok', remoteId);
    } catch (err) {
      console.warn('[ICE] drained candidate failed, requeueing', remoteId, err);
      queued.unshift(cand);
      break;
    }
  }
  if (queued.length === 0) pendingCandidates.delete(remoteId);
  else pendingCandidates.set(remoteId, queued);
}

let url =
  Platform.OS === 'android' ? 'ws://10.0.2.2:9000' : 'ws://192.168.0.105:9000';

const ICE_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

async function connectWs(id: string, signalingUrl = url) {
  if (ws && ws.readyState === WebSocket.OPEN && myId === id) return ws;
  if (ws)
    try {
      ws.close();
    } catch {}
  ws = new WebSocket(signalingUrl);
  return new Promise<WebSocket>((resolve, reject) => {
    ws!.onopen = () => {
      myId = id;
      ws!.send(JSON.stringify({ type: 'register', id }));
      resolve(ws!);
    };
    ws!.onmessage = () => {};
    ws!.onerror = e => reject(e);
  });
}

function createConnection(remoteId: string, initiator = false): DataConn {
  const pc = new RTCPeerConnection(ICE_CONFIG);
  const conn: DataConn = {
    pc,
    remoteId,
    send: d => {
      if (!conn.dc || conn.dc.readyState !== 'open')
        throw new Error('Dc not open');
      if (
        typeof d === 'string' ||
        d instanceof ArrayBuffer ||
        d instanceof Uint8Array
      ) {
        conn.dc!.send(d as any);
      } else {
        conn.dc!.send(JSON.stringify(d));
      }
    },
    close: () => {
      try {
        conn.dc?.close();
      } catch {}
      try {
        conn.pc.close();
      } catch {}
      conns.delete(remoteId);
    },
  };

  pc.addEventListener('icecandidate', event => {
    if (event.candidate && ws && myId) {
      ws.send(
        JSON.stringify({
          type: 'candidate',
          from: myId,
          to: remoteId,
          candidate: event.candidate,
        }),
      );
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pc.addEventListener('connectionstatechange', event => {
    console.log(remoteId, pc.connectionState);
  });

  if (initiator) {
    const dc = pc.createDataChannel('data');
    conn.dc = dc;
    dc.addEventListener('open', () => {});
    dc.addEventListener('message', event => {
      (conn as any)._onmessage?.(event.data);
    });
    dc.addEventListener('close', () => {});
  } else {
    pc.addEventListener('datachannel', event => {
      conn.dc = event.channel;
      conn.dc.addEventListener('message', event2 => {
        (conn as any)._onmessage?.(event2.data);
      });
      conn.dc.addEventListener('open', () => {});
    });
  }

  return conn;
}

export const initializePeer = async (
  id: string,
  onConnection: (conn: DataConn) => void,
  signalingUrl = url,
) => {
  await connectWs(id, signalingUrl);
  if (!ws) throw new Error('ws failed');

  ws.onmessage = async event => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'offer' && msg.from && msg.sdp) {
        const remoteId = msg.from;
        const conn = createConnection(remoteId, false);
        conns.set(remoteId, conn);

        await conn.pc.setRemoteDescription({
          type: 'offer',
          sdp: msg.sdp,
        } as any);
        console.log(conn.pc.remoteDescription);
        await drainPendingCandidates(remoteId);
        const answer = await conn.pc.createAnswer();
        console.log('local desc setting in initializepeer');
        await conn.pc.setLocalDescription(answer);
        console.log('local desc set in initializepeer');

        ws!.send(
          JSON.stringify({
            type: 'answer',
            from: id,
            to: remoteId,
            sdp: (answer as any).sdp,
          }),
        );

        const waitForOpen = new Promise<void>(resolve => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          (conn as any)._onmessage = (d: any) => {};
          const check = () => {
            if (conn.dc && conn.dc.readyState === 'open') resolve();
            else setTimeout(check, 50);
          };
          check();
        });
        waitForOpen.then(() => onConnection(conn));
      } else if (msg.type === 'answer' && msg.from && msg.sdp) {
        const conn = conns.get(msg.from);
        if (!conn || !conn.pc) console.warn('no pc found');
        else {
          try {
            await conn.pc.setRemoteDescription({
              type: 'answer',
              sdp: msg.sdp,
            });
            console.log(
              '[ANSWER] applied remote answer',
              conn.pc.remoteDescription?.type,
            );
            await drainPendingCandidates(msg.from);
          } catch (error) {
            console.error(error);
          }
        }
      } else if (msg.type === 'candidate' && msg.from && 'candidate' in msg) {
        const remoteId = msg.from;
        const candidate = msg.candidate;
        console.log(
          '[WS] candidate for',
          remoteId,
          'candidateIsNull=',
          candidate === null,
        );

        if (candidate === null) {
          console.log('[ICE] received null candidate (end)');
          return;
        }

        const conn = conns.get(remoteId);
        if (!conn || !conn.pc) {
          console.log('[ICE] no pc for', remoteId, '→ queueing');
          pendingCandidates.set(
            remoteId,
            (pendingCandidates.get(remoteId) || []).concat(candidate),
          );
          return;
        }

        if (!conn.pc.remoteDescription || !conn.pc.remoteDescription.type) {
          console.log('[ICE] remoteDesc not ready for', remoteId, '→ queueing');
          pendingCandidates.set(
            remoteId,
            (pendingCandidates.get(remoteId) || []).concat(candidate),
          );
          return;
        }

        const ok = await safeAddCandidate(remoteId, conn.pc, candidate);
        if (!ok) {
          pendingCandidates.set(
            remoteId,
            (pendingCandidates.get(remoteId) || []).concat(candidate),
          );
        }
      }
    } catch (e) {
      console.warn('bad signal', e);
    }
  };
};

export const connectToPeer = (
  remoteId: string,
  timeoutMs = 30000,
): Promise<DataConn> => {
  return new Promise(async (resolve, reject) => {
    if (!ws || !myId) return reject(new Error('Not Initialized'));
    try {
      const conn = createConnection(remoteId, true);
      conns.set(remoteId, conn);
      console.log('local desc setting in connecttopeer');
      const offer = await conn.pc.createOffer();
      await conn.pc.setLocalDescription(offer);
      console.log('local desc set in connecttopeer');
      ws!.send(
        JSON.stringify({
          type: 'offer',
          from: myId,
          to: remoteId,
          sdp: (offer as any).sdp,
        }),
      );
      const tid = setTimeout(() => {
        reject(new Error('connectToPeer timed out'));
        conn.close();
      }, timeoutMs);
      const onOpenCheck = () => {
        if (conn.dc && conn.dc.readyState === 'open') {
          clearTimeout(tid);
          resolve(conn);
        } else {
          setTimeout(onOpenCheck, 50);
        }
      };
      onOpenCheck();
    } catch (error) {
      console.log(error);
    }
  });
};

export const onData = (conn: DataConn, handler: (data: any) => void) => {
  (conn as any)._onmessage = (raw: any) => {
    try {
      if (typeof raw === 'string') {
        handler(JSON.parse(raw));
      } else {
        handler(raw);
      }
    } catch {
      handler(raw);
    }
  };
};

export const sendFile = async (
  conn: DataConn,
  fileName: string,
  fileData: ArrayBuffer | Uint8Array,
) => {
  const CHUNK = 64 * 1024;
  const u8 =
    fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData);
  const total = u8.length;
  let offset = 0;
  conn.send({ fileMeta: { name: fileName, size: total } });
  while (offset < total) {
    const end = Math.min(offset + CHUNK, total);
    const chunk = u8.subarray(offset, end);
    conn.send({ fileChunk: { offset, chunk: Array.from(chunk) } });
    offset = end;
  }
  conn.send({ fileComplete: { name: fileName } });
};

export const destroyPeer = () => {
  conns.forEach(c => c.close());
  conns.clear();
  if (ws) {
    try {
      ws.close();
    } catch {}
    ws = undefined;
  }
  myId = undefined;
};
