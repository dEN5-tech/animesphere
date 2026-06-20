import { atom } from 'jotai';
import { getSafeStorage } from '../../../shared/lib/utils';

export const showSettings = atom<boolean>(false);
export const proxyUrl = atom<string>("http://127.0.0.1:2080");
export const searchProvider = atom<string>("animevost");
export const discordPresenceEnabled = atom<boolean>(false);
export const discordClientId = atom<string>("");
export const shikimoriClientId = atom<string>("");
export const shikimoriClientSecret = atom<string>("");
export const shikimoriLoggingIn = atom<boolean>(false);
export const syncServerUrl = atom<string>(getSafeStorage("sync_server_url", "wss://animesphere-sync.mrt635123.workers.dev"));
