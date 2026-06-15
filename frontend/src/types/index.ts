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

export interface PlaybackState {
  time_pos: number;
  duration: number;
  paused: boolean;
  volume: number;
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
