import { useEffect, useRef } from 'preact/hooks';
import { useAtomValue, useSetAtom } from 'jotai';
import type { PlaybackState, Anime4KModeType, Anime4KQualityType } from '../../../shared/types';
import { useServices } from '../../../shared/di/context';
import { container } from '../../../shared/di/container';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as store from '../../../entities/playback';
import * as uiStore from '../../../entities/ui';
import * as libraryStore from '../../../entities/anime';
import { broadcastPlayerState } from '../../sync/model/store';

export function usePlayback() {
  const { playbackService } = useServices();

  const controlsTimeoutRef = useRef<number | null>(null);
  const resumeSaveTimerRef = useRef<number | null>(null);

  // Reactive atom reads for this hook's return values
  const playbackStateVal = useAtomValue(store.playbackState);
  const seekingValueVal = useAtomValue(store.seekingValue);
  const isFullscreenVal = useAtomValue(store.isFullscreen);
  const showControlsVal = useAtomValue(store.showControls);
  const hoverTimeVal = useAtomValue(store.hoverTime);
  const hoverXVal = useAtomValue(store.hoverX);
  const thumbnailUrlVal = useAtomValue(store.thumbnailUrl);
  const isLoadingThumbnailVal = useAtomValue(store.isLoadingThumbnail);
  const anime4kModeVal = useAtomValue(store.anime4kMode);
  const anime4kQualityVal = useAtomValue(store.anime4kQuality);
  const activeMediaVal = useAtomValue(store.activeMedia);

  const setPlaybackState = useSetAtom(store.playbackState);
  const setShowControls = useSetAtom(store.showControls);
  const setHoverTime = useSetAtom(store.hoverTime);
  const setHoverX = useSetAtom(store.hoverX);
  const setThumbnailUrl = useSetAtom(store.thumbnailUrl);
  const setIsLoadingThumbnail = useSetAtom(store.isLoadingThumbnail);
  const setAnime4kMode = useSetAtom(store.anime4kMode);
  const setAnime4kQuality = useSetAtom(store.anime4kQuality);
  const setActiveMedia = useSetAtom(store.activeMedia);
  const setSeekingValue = useSetAtom(store.seekingValue);
  const setIsFullscreen = useSetAtom(store.isFullscreen);

  useEffect(() => {
    let lastBroadcastTime = 0;
    window.onPlaybackUpdate = (state) => {
      jotaiStore.set(store.playbackState, state);

      // Heartbeat sync: broadcast state periodically if playing
      const now = Date.now();
      if (!state.paused && now - lastBroadcastTime > 2000) {
        lastBroadcastTime = now;
        broadcastPlayerState(state.paused, state.time_pos);
      }
    };
    return () => {
      window.onPlaybackUpdate = undefined;
    };
  }, []);

  // Periodic resume save — every 10 seconds via interval
  useEffect(() => {
    resumeSaveTimerRef.current = window.setInterval(() => {
      const current = jotaiStore.get(store.playbackState);
      if (!current.paused && jotaiStore.get(store.resumeInfo)) {
        store.persistResume(current.time_pos);
      }
    }, 10000);
    return () => {
      if (resumeSaveTimerRef.current !== null) {
        clearInterval(resumeSaveTimerRef.current);
      }
    };
  }, []);

  const resetControlsTimeout = () => {
    jotaiStore.set(store.showControls, true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      const state = jotaiStore.get(store.playbackState);
      const drawer = jotaiStore.get(uiStore.showDrawer);
      if (!state.paused && !drawer) {
        jotaiStore.set(store.showControls, false);
      }
    }, 3500);
  };

  const togglePlayback = () => {
    const current = jotaiStore.get(store.playbackState);
    const nextPaused = !current.paused;
    const promise = nextPaused ? playbackService.pause() : playbackService.play();
    promise
      .then(() => {
        const latest = jotaiStore.get(store.playbackState);
        jotaiStore.set(store.playbackState, { ...latest, paused: nextPaused });
        resetControlsTimeout();
        broadcastPlayerState(nextPaused, jotaiStore.get(store.playbackState).time_pos);
      })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Control command failed: ' + err); });
  };

  const toggleFullscreen = () => {
    const next = !jotaiStore.get(store.isFullscreen);
    jotaiStore.set(store.isFullscreen, next);
    playbackService.setFullscreen(next)
      .catch((err: any) => console.error('Failed to toggle fullscreen', err));
  };

  const handleSeekChange = (e: any) => {
    const val = parseFloat(e.target.value);
    jotaiStore.set(store.seekingValue, val);
  };

  const handleSeekCommit = (e: any) => {
    const val = parseFloat(e.target.value);
    jotaiStore.set(store.seekingValue, null);
    playbackService.seek(val)
      .then(() => {
        broadcastPlayerState(jotaiStore.get(store.playbackState).paused, val);
      })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Seek command failed: ' + err); });
  };

  const handleVolumeChange = (e: any) => {
    const val = parseFloat(e.target.value);
    const latest = jotaiStore.get(store.playbackState);
    jotaiStore.set(store.playbackState, { ...latest, volume: val });
    playbackService.setVolume(val)
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Volume command failed: ' + err); });
  };

  const skipSeconds = (amount: number) => {
    const seeking = jotaiStore.get(store.seekingValue);
    const state = jotaiStore.get(store.playbackState);
    const current = seeking !== null ? seeking : state.time_pos;
    const target = Math.max(0, Math.min(state.duration, current + amount));
    playbackService.seek(target)
      .then(() => {
        broadcastPlayerState(jotaiStore.get(store.playbackState).paused, target);
      })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Skip command failed: ' + err); });
  };

  const applyAnime4k = (mode: Anime4KModeType, quality: Anime4KQualityType) => {
    jotaiStore.set(store.anime4kMode, mode);
    jotaiStore.set(store.anime4kQuality, quality);
    playbackService.setAnime4k(mode, quality)
      .catch((err: any) => console.error('Anime4K command failed:', err));
  };

  const selectQuality = (idx: number) => {
    playbackService.setQuality(idx)
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Set quality command failed: ' + err); });
  };

  const playNext = () => {
    const list = jotaiStore.get(libraryStore.animeList);
    const currentMedia = jotaiStore.get(store.activeMedia);
    const currentIndex = list.findIndex(anime => anime.title === currentMedia);
    if (currentIndex !== -1 && currentIndex + 1 < list.length) {
      const next = list[currentIndex + 1];
      store.playAnime(next.id, {
        anime_title: next.title.split(' - ')[0],
        cover_image: next.cover_image,
        description: next.description,
      });
    }
  };

  const playPrev = () => {
    const list = jotaiStore.get(libraryStore.animeList);
    const currentMedia = jotaiStore.get(store.activeMedia);
    const currentIndex = list.findIndex(anime => anime.title === currentMedia);
    if (currentIndex > 0) {
      const prev = list[currentIndex - 1];
      store.playAnime(prev.id, {
        anime_title: prev.title.split(' - ')[0],
        cover_image: prev.cover_image,
        description: prev.description,
      });
    }
  };

  const cycleQuality = () => {
    const state = jotaiStore.get(store.playbackState);
    if (state.editions_count && state.editions_count > 1) {
      const next = (((state.current_edition || 0) as number) + 1) % state.editions_count;
      selectQuality(next);
    }
  };

  // Thumbnail hover effect hooks
  useEffect(() => {
    if (hoverTimeVal === null) {
      jotaiStore.set(store.thumbnailUrl, null);
      return;
    }

    const timer = setTimeout(() => {
      jotaiStore.set(store.isLoadingThumbnail, true);
      playbackService.getThumbnail(hoverTimeVal)
        .then((res: any) => {
          jotaiStore.set(store.thumbnailUrl, res.thumbnail);
        })
        .catch((err: any) => {
          console.error("Failed to load thumbnail:", err);
        })
        .finally(() => {
          jotaiStore.set(store.isLoadingThumbnail, false);
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [hoverTimeVal]);

  const handleTimelineMouseMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const state = jotaiStore.get(store.playbackState);
    const duration = state.duration || 100;
    const time = Math.max(0, Math.min(duration, percent * duration));
    jotaiStore.set(store.hoverX, x);
    jotaiStore.set(store.hoverTime, time);
  };

  const handleTimelineMouseLeave = () => {
    jotaiStore.set(store.hoverTime, null);
  };

  return {
    playbackState: playbackStateVal,
    setPlaybackState: (val: PlaybackState) => setPlaybackState(val),

    seekingValue: seekingValueVal,
    setSeekingValue: (val: number | null) => setSeekingValue(val),

    isFullscreen: isFullscreenVal,
    setIsFullscreen: (val: boolean) => setIsFullscreen(val),

    showControls: showControlsVal,
    setShowControls: (val: boolean) => setShowControls(val),

    hoverTime: hoverTimeVal,
    setHoverTime: (val: number | null) => setHoverTime(val),

    hoverX: hoverXVal,
    setHoverX: (val: number) => setHoverX(val),

    thumbnailUrl: thumbnailUrlVal,
    setThumbnailUrl: (val: string | null) => setThumbnailUrl(val),

    isLoadingThumbnail: isLoadingThumbnailVal,
    setIsLoadingThumbnail: (val: boolean) => setIsLoadingThumbnail(val),

    anime4kMode: anime4kModeVal,
    setAnime4kMode: (val: Anime4KModeType) => setAnime4kMode(val),

    anime4kQuality: anime4kQualityVal,
    setAnime4kQuality: (val: Anime4KQualityType) => setAnime4kQuality(val),

    activeMedia: activeMediaVal,
    setActiveMedia: (val: string | null) => setActiveMedia(val),

    resetControlsTimeout,
    controlsTimeoutRef,
    playAnime: store.playAnime,
    togglePlayback,
    stopAnime: store.stopAnime,
    toggleFullscreen,
    handleSeekChange,
    handleSeekCommit,
    handleVolumeChange,
    skipSeconds,
    applyAnime4k,
    selectQuality,
    playNext,
    playPrev,
    cycleQuality,
    handleTimelineMouseMove,
    handleTimelineMouseLeave,
    resumePlayback: () => {
      const resumeDataVal = jotaiStore.get(uiStore.resumeData);
      if (!resumeDataVal) return;
      jotaiStore.set(uiStore.importing, true);
      jotaiStore.set(uiStore.globalError, null);
      const fakeTitle = {
        id: resumeDataVal.episode_id,
        title: resumeDataVal.anime_title,
        description: resumeDataVal.description,
        cover_image: resumeDataVal.cover_image,
      };
      const seekTo: number = resumeDataVal.time_pos || 0;
      container.libraryService.selectAnime(fakeTitle)
        .then(() => container.libraryService.fetchCatalog())
        .then((episodes: any) => {
          jotaiStore.set(libraryStore.animeList, episodes);
          const targetEp = episodes.find((e: any) => e.id === resumeDataVal.episode_id) || episodes[0];
          if (targetEp) {
            store.playAnime(targetEp.id, {
              anime_title: resumeDataVal.anime_title,
              cover_image: resumeDataVal.cover_image,
              description: resumeDataVal.description,
            });
            if (seekTo > 5) {
              setTimeout(() => {
                playbackService.seek(seekTo).catch(() => {});
              }, 2500);
            }
            playbackService.clearResume().catch(() => {});
            jotaiStore.set(uiStore.resumeData, null);
          }
        })
        .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Ошибка при восстановлении просмотра: ' + err); })
        .finally(() => { jotaiStore.set(uiStore.importing, false); });
    },
    clearResume: () => {
      playbackService.clearResume().catch(() => {});
      jotaiStore.set(uiStore.resumeData, null);
    }
  };
}
