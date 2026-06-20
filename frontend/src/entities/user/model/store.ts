import { atom } from 'jotai';

export const shikimoriAuthorized = atom<boolean>(false);
export const shikimoriProfile = atom<{ nickname: string; avatar: string; url: string } | null>(null);
