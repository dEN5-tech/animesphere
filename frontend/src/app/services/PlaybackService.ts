import type { IpcTransport } from '../../shared/ipc/types';
import type { StreamInfo } from '../../shared/types';
import { anime } from '../../shared/proto/anime';

export interface PlaybackService {
  playStream(id: number): Promise<StreamInfo>;
  pause(): Promise<void>;
  play(): Promise<void>;
  stop(): Promise<void>;
  seek(time: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setAnime4k(mode: string, quality: string): Promise<void>;
  setFullscreen(fullscreen: boolean): Promise<boolean>;
  setQuality(index: number): Promise<void>;
  getResume(): Promise<any>;
  saveResume(payload: string): Promise<any>;
  clearResume(): Promise<any>;
  getThumbnail(time: number): Promise<{ thumbnail: string }>;
}

export class PlaybackServiceImpl implements PlaybackService {
  private transport: IpcTransport;

  constructor(transport: IpcTransport) {
    this.transport = transport;
  }

  async playStream(id: number): Promise<StreamInfo> {
    const res = await this.transport.call<string | StreamInfo>('play_stream', id.toString());
    if (typeof res === "string") {
      const binary = new Uint8Array(res.length);
      for (let i = 0; i < res.length; i++) {
        binary[i] = res.charCodeAt(i);
      }
      const decoded = anime.StreamResponse.decode(binary);
      return {
        title: decoded.title || "",
      };
    }
    return res;
  }

  pause(): Promise<void> {
    return this.transport.call<void>('media_pause');
  }

  play(): Promise<void> {
    return this.transport.call<void>('media_play');
  }

  stop(): Promise<void> {
    return this.transport.call<void>('media_stop');
  }

  seek(time: number): Promise<void> {
    return this.transport.call<void>('media_seek', time.toString());
  }

  setVolume(volume: number): Promise<void> {
    return this.transport.call<void>('media_volume', volume.toString());
  }

  setAnime4k(mode: string, quality: string): Promise<void> {
    return this.transport.call<void>('set_anime4k', JSON.stringify({ mode, quality }));
  }

  setFullscreen(fullscreen: boolean): Promise<boolean> {
    return this.transport.call<boolean>('set_fullscreen', fullscreen.toString());
  }

  setQuality(index: number): Promise<void> {
    return this.transport.call<void>('set_quality', index.toString());
  }

  getResume(): Promise<any> {
    return this.transport.call<any>('get_resume');
  }

  saveResume(payload: string): Promise<any> {
    return this.transport.call<any>('save_resume', payload);
  }

  clearResume(): Promise<any> {
    return this.transport.call<any>('clear_resume');
  }

  getThumbnail(time: number): Promise<{ thumbnail: string }> {
    return this.transport.call<{ thumbnail: string }>('get_thumbnail', time.toString());
  }
}
