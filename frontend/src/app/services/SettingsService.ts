import type { IpcTransport } from '../../shared/ipc/types';

export interface SettingsService {
  getSettings(): Promise<any>;
  saveSettings(payload: string): Promise<any>;
  shikimoriLogin(): Promise<any>;
  shikimoriStatus(): Promise<any>;
  shikimoriBookmarks(): Promise<any[]>;
  shikimoriFriends(): Promise<any[]>;
  shikimoriFriendBookmarks(nicknameOrId: string): Promise<any[]>;
  openBrowser(url: string): Promise<any>;
}

export class SettingsServiceImpl implements SettingsService {
  private transport: IpcTransport;

  constructor(transport: IpcTransport) {
    this.transport = transport;
  }

  getSettings(): Promise<any> {
    return this.transport.call<any>("get_settings");
  }

  saveSettings(payload: string): Promise<any> {
    return this.transport.call<any>("save_settings", payload);
  }

  shikimoriLogin(): Promise<any> {
    return this.transport.call<any>("shikimori_login");
  }

  shikimoriStatus(): Promise<any> {
    return this.transport.call<any>("shikimori_status");
  }

  shikimoriBookmarks(): Promise<any[]> {
    return this.transport.call<any[]>("shikimori_bookmarks");
  }

  shikimoriFriends(): Promise<any[]> {
    return this.transport.call<any[]>("shikimori_friends");
  }

  shikimoriFriendBookmarks(nicknameOrId: string): Promise<any[]> {
    return this.transport.call<any[]>("shikimori_friend_bookmarks", nicknameOrId);
  }

  openBrowser(url: string): Promise<any> {
    return this.transport.call<any>("open_browser", url);
  }
}
