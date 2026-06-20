import { atom } from 'jotai';
import type { PlaybackState, Anime4KModeType, Anime4KQualityType } from '../model/types';

export interface ResumeInfo {
  episode_id: number;
  time_pos: number;
  episode_title?: string;
  anime_title: string;
  cover_image: string;
  description: string;
}

export const activeMedia = atom<string | null>(null);
export const seekingValue = atom<number | null>(null);
export const isFullscreen = atom<boolean>(false);
export const showControls = atom<boolean>(true);
export const hoverTime = atom<number | null>(null);
export const hoverX = atom<number>(0);
export const thumbnailUrl = atom<string | null>(null);
export const isLoadingThumbnail = atom<boolean>(false);

export const playbackState = atom<PlaybackState>({
  time_pos: 0,
  duration: 0,
  paused: true,
  volume: 50,
  demuxer_cache_duration: 0,
  current_edition: 0,
  editions_count: 0,
  edition_list: "",
});

export const anime4kMode = atom<Anime4KModeType>('off');
export const anime4kQuality = atom<Anime4KQualityType>('M');
export const resumeInfo = atom<ResumeInfo | null>(null);
export const lastSavedTime = atom<number>(-1);
