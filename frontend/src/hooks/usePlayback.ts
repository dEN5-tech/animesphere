import { useState, useEffect, useRef } from 'preact/hooks';
import type { PlaybackState, Anime4KModeType, Anime4KQualityType, StreamInfo } from '../types';
import { callNative } from '../lib/ipc';

export interface ResumeInfo {
  episode_id: number;
  time_pos: number;
  episode_title?: string;
  anime_title: string;
  cover_image: string;
  description: string;
}

export function usePlayback(
  setActiveMedia: (media: string | null) => void,
  setError: (err: string | null) => void,
  loadHistory: () => void,
  searchQuery: string,
  showDrawer: boolean
) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    time_pos: 0,
    duration: 0,
    paused: true,
    volume: 80,
    demuxer_cache_duration: 0,
  });

  const [seekingValue, setSeekingValue] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Anime4K shader state
  const [anime4kMode, setAnime4kMode] = useState<Anime4KModeType>('off');
  const [anime4kQuality, setAnime4kQuality] = useState<Anime4KQualityType>('M');

  // Resume tracking refs
  const resumeInfoRef = useRef<ResumeInfo | null>(null);
  const resumeSaveTimerRef = useRef<number | null>(null);
  const lastSavedTimeRef = useRef<number>(-1);

  const persistResume = (timePos: number) => {
    const info = resumeInfoRef.current;
    if (!info || info.episode_id < 0) return;
    // Only save if position changed by more than 5 seconds to avoid I/O spam
    if (Math.abs(timePos - lastSavedTimeRef.current) < 5) return;
    lastSavedTimeRef.current = timePos;
    callNative('save_resume', JSON.stringify({
      ...info,
      time_pos: timePos,
    })).catch(() => {});
  };

  useEffect(() => {
    window.onPlaybackUpdate = (state) => {
      setPlaybackState(state);
    };
    return () => {
      window.onPlaybackUpdate = undefined;
    };
  }, []);

  // Periodic resume save — every 10 seconds via interval
  useEffect(() => {
    resumeSaveTimerRef.current = window.setInterval(() => {
      setPlaybackState(current => {
        if (!current.paused && resumeInfoRef.current) {
          persistResume(current.time_pos);
        }
        return current;
      });
    }, 10000);
    return () => {
      if (resumeSaveTimerRef.current !== null) {
        clearInterval(resumeSaveTimerRef.current);
      }
    };
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (!playbackState.paused && !showDrawer) {
        setShowControls(false);
      }
    }, 3500);
  };

  const playAnime = (
    id: number,
    resumeInfo?: Omit<ResumeInfo, 'episode_id' | 'time_pos'>
  ) => {
    callNative<StreamInfo>('play_stream', id.toString())
      .then(streamInfo => {
        setActiveMedia(streamInfo.title);
        setSeekingValue(null);
        // Store resume tracking info
        if (resumeInfo) {
          resumeInfoRef.current = {
            episode_id: id,
            time_pos: 0,
            episode_title: streamInfo.title,
            anime_title: resumeInfo.anime_title,
            cover_image: resumeInfo.cover_image,
            description: resumeInfo.description,
          };
        } else {
          resumeInfoRef.current = {
            episode_id: id,
            time_pos: 0,
            episode_title: streamInfo.title,
            anime_title: streamInfo.title,
            cover_image: '',
            description: '',
          };
        }
        lastSavedTimeRef.current = -1;
      })
      .catch(err => setError('Playback initialization failed: ' + err));
  };

  const togglePlayback = () => {
    const nextPaused = !playbackState.paused;
    callNative<void>(nextPaused ? 'media_pause' : 'media_play')
      .then(() => {
        setPlaybackState(prev => ({ ...prev, paused: nextPaused }));
        resetControlsTimeout();
      })
      .catch(err => setError('Control command failed: ' + err));
  };

  const stopAnime = () => {
    // Save final position before stopping
    if (resumeInfoRef.current) {
      persistResume(playbackState.time_pos);
    }
    callNative<void>('media_stop')
      .then(() => {
        setActiveMedia(null);
        setSeekingValue(null);
        resumeInfoRef.current = null;
        lastSavedTimeRef.current = -1;
        if (searchQuery.trim() === '') {
          loadHistory();
        }
      })
      .catch(err => setError('Stop command failed: ' + err));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      callNative<boolean>('set_fullscreen', next.toString())
        .catch(err => console.error('Failed to toggle fullscreen', err));
      return next;
    });
  };

  const handleSeekChange = (e: any) => {
    const val = parseFloat(e.target.value);
    setSeekingValue(val);
  };

  const handleSeekCommit = (e: any) => {
    const val = parseFloat(e.target.value);
    setSeekingValue(null);
    callNative<void>('media_seek', val.toString())
      .catch(err => setError('Seek command failed: ' + err));
  };

  const handleVolumeChange = (e: any) => {
    const val = parseFloat(e.target.value);
    setPlaybackState(prev => ({ ...prev, volume: val }));
    callNative<void>('media_volume', val.toString())
      .catch(err => setError('Volume command failed: ' + err));
  };

  const skipSeconds = (amount: number) => {
    const current = seekingValue !== null ? seekingValue : playbackState.time_pos;
    const target = Math.max(0, Math.min(playbackState.duration, current + amount));
    callNative<void>('media_seek', target.toString())
      .catch(err => setError('Skip command failed: ' + err));
  };

  const applyAnime4k = (mode: Anime4KModeType, quality: Anime4KQualityType) => {
    setAnime4kMode(mode);
    setAnime4kQuality(quality);
    callNative<void>('set_anime4k', JSON.stringify({ mode, quality }))
      .catch(err => console.error('Anime4K command failed:', err));
  };

  return {
    playbackState, setPlaybackState,
    seekingValue, setSeekingValue,
    isFullscreen, setIsFullscreen,
    showControls, setShowControls,
    anime4kMode, setAnime4kMode,
    anime4kQuality, setAnime4kQuality,
    resetControlsTimeout, controlsTimeoutRef,
    playAnime, togglePlayback, stopAnime, toggleFullscreen,
    handleSeekChange, handleSeekCommit, handleVolumeChange, skipSeconds, applyAnime4k
  };
}
