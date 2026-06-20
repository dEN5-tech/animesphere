import { atom } from 'jotai';
import { getSafeStorage } from '../../../shared/lib/utils';

export const currentTab = atom<'home' | 'search' | 'history' | 'bookmarks' | 'settings' | 'friends' | 'logs'>('home');
export const globalError = atom<string | null>(null);
export const importing = atom<boolean>(false);
export const selectedMetadata = atom<any | null>(null);
export const contextMenu = atom<{ x: number; y: number } | null>(null);
export const vostId = atom<string>("");
export const resumeData = atom<any | null>(null);
export const showQualityMenu = atom<boolean>(false);
export const showDrawer = atom<boolean>(false);
export const showAnime4kPanel = atom<boolean>(false);
export const showNerdStats = atom<boolean>(false);
export const showSyncPanel = atom<boolean>(false);

// Support Plan / Donation State
export const showSupportModal = atom<boolean>(false);
export const isSupporter = atom<boolean>(
  getSafeStorage('is_supporter', 'false') === 'true'
);
