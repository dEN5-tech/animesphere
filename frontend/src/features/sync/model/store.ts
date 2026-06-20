import { atom } from 'jotai';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import { syncServerUrl } from '../../settings/model/store';
import { shikimoriProfile } from '../../../entities/user';
import { container } from '../../../shared/di/container';
import { playbackState } from '../../../entities/playback';

export interface ChatMsg {
  sender: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export const clientId = Math.random().toString(36).substring(2, 11);
export const roomCode = atom<string | null>(null);
export const isConnected = atom<boolean>(false);
export const isHost = atom<boolean>(false);
export const chatMessages = atom<ChatMsg[]>([]);
export const isApplyingRemoteSync = atom<boolean>(false);

let wsConnection: WebSocket | null = null;
let ignoreLocalEventsTimeout: any = null;

export function setApplyingRemoteSync() {
  jotaiStore.set(isApplyingRemoteSync, true);
  if (ignoreLocalEventsTimeout) clearTimeout(ignoreLocalEventsTimeout);
  ignoreLocalEventsTimeout = setTimeout(() => {
    jotaiStore.set(isApplyingRemoteSync, false);
  }, 1000); // Ignore local updates for 1 second to prevent echo loops
}

export function joinRoom(code: string, nickname: string, hostFlag: boolean = false) {
  if (wsConnection) {
    leaveRoom();
  }

  const cleanCode = code.trim().toLowerCase();
  if (!cleanCode) return;

  const serverUrl = jotaiStore.get(syncServerUrl).replace(/\/$/, '');
  const wsUrl = `${serverUrl}/room/${cleanCode}`;

  try {
    const ws = new WebSocket(wsUrl);
    wsConnection = ws;
    jotaiStore.set(roomCode, cleanCode);
    jotaiStore.set(isHost, hostFlag);

    ws.onopen = () => {
      jotaiStore.set(isConnected, true);
      // Send a system greeting message
      sendSystemMessage(`${nickname} присоединился к комнате`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.sender_id === clientId) {
          return; // Ignore messages sent by ourselves
        }

        if (data.type === 'sync') {
          handleRemoteSync(data);
        } else if (data.type === 'chat') {
          jotaiStore.set(chatMessages, [
            ...jotaiStore.get(chatMessages),
            {
              sender: data.sender_name,
              text: data.text,
              timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            }
          ]);
        } else if (data.type === 'system') {
          jotaiStore.set(chatMessages, [
            ...jotaiStore.get(chatMessages),
            {
              sender: 'Система',
              text: data.text,
              timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      cleanupConnection();
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      cleanupConnection();
    };
  } catch (err) {
    console.error("Failed to connect to sync server:", err);
    cleanupConnection();
  }
}

export function leaveRoom() {
  if (wsConnection) {
    const profile = jotaiStore.get(shikimoriProfile);
    const nickname = profile?.nickname || "Пользователь";
    sendSystemMessage(`${nickname} покинул комнату`);
    try {
      wsConnection.close();
    } catch {}
  }
  cleanupConnection();
}

function cleanupConnection() {
  wsConnection = null;
  jotaiStore.set(roomCode, null);
  jotaiStore.set(isConnected, false);
  jotaiStore.set(isHost, false);
  jotaiStore.set(chatMessages, []);
  jotaiStore.set(isApplyingRemoteSync, false);
}

export function sendChatMessage(text: string) {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) return;
  const profile = jotaiStore.get(shikimoriProfile);
  const nickname = profile?.nickname || "Пользователь";

  const payload = {
    type: 'chat',
    sender_id: clientId,
    sender_name: nickname,
    text: text.trim(),
  };

  wsConnection.send(JSON.stringify(payload));
}

function sendSystemMessage(text: string) {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) return;
  const payload = {
    type: 'system',
    sender_id: clientId,
    text: text,
  };
  wsConnection.send(JSON.stringify(payload));
}

export function broadcastPlayerState(paused: boolean, timePos: number) {
  if (jotaiStore.get(isApplyingRemoteSync)) return; // Don't broadcast remote actions back
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) return;

  const payload = {
    type: 'sync',
    sender_id: clientId,
    paused,
    time_pos: timePos,
  };

  wsConnection.send(JSON.stringify(payload));
}

function handleRemoteSync(data: { paused: boolean; time_pos: number }) {
  setApplyingRemoteSync();

  const state = jotaiStore.get(playbackState);

  // 1. Sync Paused/Playing State
  if (data.paused !== state.paused) {
    const promise = data.paused ? container.playbackService.pause() : container.playbackService.play();
    promise.catch((err: any) => console.error(err));
  }

  // 2. Sync Time Position (only seek if drift > 1.5s)
  const drift = Math.abs(state.time_pos - data.time_pos);
  if (drift > 1.5) {
    container.playbackService.seek(data.time_pos).catch((err: any) => console.error(err));
  }
}
