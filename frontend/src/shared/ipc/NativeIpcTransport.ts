import type { IpcTransport } from './types';

export class NativeIpcTransport implements IpcTransport {
  private callbacks: Record<string, (success: boolean, data: any) => void> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      window.resolveIpc = (callbackId: string, success: boolean, data: any) => {
        if (this.callbacks[callbackId]) {
          this.callbacks[callbackId](success, data);
          delete this.callbacks[callbackId];
        }
      };
    }
  }

  call<T>(action: string, payload: string = ""): Promise<T> {
    return new Promise((resolve, reject) => {
      const callbackId = Math.random().toString(36).substring(2, 11);
      this.callbacks[callbackId] = (success: boolean, data: any) => {
        if (success) {
          resolve(data as T);
        } else {
          reject(data);
        }
      };

      if (window.ipc) {
        window.ipc.postMessage(JSON.stringify({ callback_id: callbackId, action, payload }));
      } else {
        reject(new Error("Native IPC bridge not available"));
      }
    });
  }
}
