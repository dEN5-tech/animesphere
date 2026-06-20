import { atom } from 'jotai';
import type { Anime, AnimeTitle } from '../model/types';

export const animeList = atom<Anime[]>([]);
export const titles = atom<AnimeTitle[]>([]);
export const searchQuery = atom<string>("");

export const shikimoriBookmarks = atom<any[]>([]);
export const isLoadingBookmarks = atom<boolean>(false);
export const activeBookmarkFilter = atom<string>('all');
