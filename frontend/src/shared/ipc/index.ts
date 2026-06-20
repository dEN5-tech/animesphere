import { NativeIpcTransport } from './NativeIpcTransport';
import { MockIpcTransport } from './MockIpcTransport';
import type { IpcTransport } from './types';

export const transport: IpcTransport = typeof window !== 'undefined' && window.ipc
  ? new NativeIpcTransport()
  : new MockIpcTransport();

export function callNative<T>(action: string, payload: string = ""): Promise<T> {
  return transport.call<T>(action, payload);
}

export type { IpcTransport };
export { NativeIpcTransport, MockIpcTransport };
export { mockHandlers } from './mockHandlers';
