export interface IpcTransport {
  call<T>(action: string, payload?: string): Promise<T>;
}
