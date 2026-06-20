import type { IpcTransport } from './types';
import { mockHandlers } from './mockHandlers';

export class MockIpcTransport implements IpcTransport {
  call<T>(action: string, payload: string = ""): Promise<T> {
    console.log(`[MockIpcTransport] call action: ${action}, payload: ${payload}`);
    const handler = mockHandlers[action];
    if (handler) {
      return handler(payload) as Promise<T>;
    }
    console.warn(`[MockIpcTransport] Action not found: ${action}`);
    return Promise.resolve(undefined as unknown as T);
  }
}
