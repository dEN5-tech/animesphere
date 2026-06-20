import { atom } from 'jotai';

export const showAltSearch = atom<boolean>(false);
export const altSearchTitle = atom<string>("");
export const altSearchResults = atom<any[]>([]);
export const isLoadingAltSearch = atom<boolean>(false);
