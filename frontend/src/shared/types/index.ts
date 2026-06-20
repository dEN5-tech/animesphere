export interface Anime {
  id: number;
  title: string;
  description: string;
  cover_image: string;
}

export interface AnimeTitle {
  id: number;
  title: string;
  description: string;
  cover_image: string;
}

export interface StreamInfo {
  title: string;
}

export interface NerdStats {
  video_codec: string;
  audio_codec: string;
  width: number;
  height: number;
  fps: number;
  hwdec: string;
  video_bitrate: number;
  frame_drop_count: number;
}

export interface PlaybackState {
  time_pos: number;
  duration: number;
  paused: boolean;
  volume: number;
  demuxer_cache_duration: number;
  nerd_stats?: NerdStats;
  current_edition?: number;
  editions_count?: number;
  edition_list?: string;
}

export type Anime4KModeType = 'off' | 'A' | 'B' | 'C';
export type Anime4KQualityType = 'S' | 'M' | 'L' | 'VL' | 'UL';

declare global {
  interface Window {
    ipc: {
      postMessage: (message: string) => void;
    };
    resolveIpc: (callbackId: string, success: boolean, data: any) => void;
    onPlaybackUpdate?: (state: PlaybackState) => void;
  }
}
