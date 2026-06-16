import { useState, useEffect } from 'preact/hooks'
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  RotateCcw, RotateCw, ArrowLeft, Search, Menu, Settings, Maximize, Minimize,
  Home, History, Bookmark, X
} from 'lucide-preact'
import { callNative } from './lib/ipc';
import { getProxiedImageUrl, formatTime } from './lib/utils';
import { SettingsModal } from './components/SettingsModal';
import { EpisodeDrawer } from './components/Player/EpisodeDrawer';
import { Anime4kPanel } from './components/Player/Anime4kPanel';
import { NerdStatsOverlay } from './components/Player/NerdStatsOverlay';
import { PlayerContextMenu } from './components/Player/PlayerContextMenu';

import { useSettings } from './hooks/useSettings';
import { useLibrary } from './hooks/useLibrary';
import { usePlayback } from './hooks/usePlayback';
import type { AnimeTitle } from './types';

export function App() {
  const [error, setError] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAnime4kPanel, setShowAnime4kPanel] = useState(false);
  const [showNerdStats, setShowNerdStats] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const {
    showSettings, setShowSettings, proxyUrl, setProxyUrl, searchProvider, setSearchProvider,
    discordPresenceEnabled, setDiscordPresenceEnabled, discordClientId, setDiscordClientId,
    shikimoriClientId, setShikimoriClientId, shikimoriClientSecret, setShikimoriClientSecret,
    shikimoriAuthorized, shikimoriLoggingIn, loginShikimori, shikimoriProfile
  } = useSettings();

  const {
    animeList, setAnimeList, titles, activeMedia, setActiveMedia,
    searchQuery, setSearchQuery, importing, setImporting, vostId, setVostId,
    loadHistory, handleSearch, importPlaylist
  } = useLibrary(setError);

  const {
    playbackState, seekingValue, isFullscreen, setIsFullscreen, showControls, setShowControls,
    anime4kMode, anime4kQuality, resetControlsTimeout, controlsTimeoutRef,
    playAnime, togglePlayback, stopAnime, toggleFullscreen,
    handleSeekChange, handleSeekCommit, handleVolumeChange, skipSeconds, applyAnime4k
  } = usePlayback(setActiveMedia, setError, loadHistory, searchQuery, showDrawer);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'history' | 'bookmarks'>('home');
  const [shikimoriBookmarks, setShikimoriBookmarks] = useState<any[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [activeBookmarkFilter, setActiveBookmarkFilter] = useState<string>('all');

  // ─── Resume Playback State ────────────────────────────────────────────────
  const [resumeData, setResumeData] = useState<any | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  useEffect(() => {
    callNative<any>('get_resume')
      .then(data => { if (data) setResumeData(data); })
      .catch(() => {});
  }, []);

  const loadBookmarks = async () => {
    setIsLoadingBookmarks(true);
    setError(null);
    try {
      const list = await callNative<any[]>("shikimori_bookmarks");
      setShikimoriBookmarks(list);
    } catch (err) {
      console.error("Failed to load Shikimori bookmarks:", err);
      setError("Не удалось загрузить закладки Shikimori: " + err);
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'bookmarks' && shikimoriAuthorized) {
      loadBookmarks();
    }
  }, [currentTab, shikimoriAuthorized]);

  const [showAltSearch, setShowAltSearch] = useState(false);
  const [altSearchTitle, setAltSearchTitle] = useState("");
  const [altSearchResults, setAltSearchResults] = useState<any[]>([]);
  const [isLoadingAltSearch, setIsLoadingAltSearch] = useState(false);

  const triggerAltSearch = async (titleName: string) => {
    const query = titleName.split(" / ")[0].split(" - ")[0].trim();
    setAltSearchTitle(query);
    setShowAltSearch(true);
    setIsLoadingAltSearch(true);
    setAltSearchResults([]);
    try {
      const results = await callNative<any[]>("search_all", query);
      setAltSearchResults(results);
    } catch (err) {
      console.error("Failed to fetch alternatives:", err);
      setError("Ошибка поиска видеопотоков: " + err);
    } finally {
      setIsLoadingAltSearch(false);
    }
  };

  const isMetadataTitle = (title: AnimeTitle) => {
    return title.description.includes("shikimori.one") || 
           title.description.includes("shikimori.me") || 
           title.description.includes("shikimori") || 
           !!(title as any).watch_status;
  };

  useEffect(() => {
    if (hoverTime === null) {
      setThumbnailUrl(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoadingThumbnail(true);
      callNative<{ thumbnail: string }>("get_thumbnail", hoverTime.toString())
        .then((res) => {
          setThumbnailUrl(res.thumbnail);
        })
        .catch((err) => {
          console.error("Failed to load thumbnail:", err);
        })
        .finally(() => {
          setIsLoadingThumbnail(false);
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [hoverTime]);

  const handleTimelineMouseMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const duration = playbackState.duration || 100;
    const time = Math.max(0, Math.min(duration, percent * duration));
    setHoverX(x);
    setHoverTime(time);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  useEffect(() => {
    if (activeMedia) {
      window.addEventListener('mousemove', resetControlsTimeout);
      resetControlsTimeout();
    } else {
      window.removeEventListener('mousemove', resetControlsTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
    }
    return () => {
      window.removeEventListener('mousemove', resetControlsTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [activeMedia, playbackState.paused, showDrawer]);

  useEffect(() => {
    if (!activeMedia) {
      if (isFullscreen) {
        setIsFullscreen(false);
        callNative<boolean>("set_fullscreen", "false").catch(err => console.error(err));
      }
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayback();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMedia, isFullscreen, playbackState.time_pos, playbackState.duration]);

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (activeMedia) {
        setContextMenu({ x: e.clientX, y: e.clientY });
        setShowControls(true);
        resetControlsTimeout();
      }
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, [activeMedia]);

  const onSelectTitle = (title: AnimeTitle) => {
    if (isMetadataTitle(title)) {
      triggerAltSearch(title.title);
      return;
    }
    setImporting(true);
    setError(null);
    callNative<any>('select_anime', JSON.stringify(title))
      .then(() => callNative<any>('fetch_catalog'))
      .then(episodes => {
        setAnimeList(episodes);
        if (episodes.length > 0) {
          playAnime(episodes[0].id, {
            anime_title: title.title.split(' - ')[0],
            cover_image: title.cover_image,
            description: title.description,
          });
        } else {
          setError('Этот провайдер предоставляет только метаданные — видеопотоков нет. Используйте AnimeGO, Jut.su или AnimeVost для просмотра.');
        }
      })
      .catch(err => setError('Ошибка при открытии аниме: ' + err))
      .finally(() => setImporting(false));
  };

  // Restore a previously saved playback session
  const resumePlayback = () => {
    if (!resumeData) return;
    setImporting(true);
    setError(null);
    const fakeTitle: AnimeTitle = {
      id: resumeData.episode_id,
      title: resumeData.anime_title,
      description: resumeData.description,
      cover_image: resumeData.cover_image,
    };
    const seekTo: number = resumeData.time_pos || 0;
    callNative<any>('select_anime', JSON.stringify(fakeTitle))
      .then(() => callNative<any>('fetch_catalog'))
      .then(episodes => {
        setAnimeList(episodes);
        const targetEp = episodes.find((e: any) => e.id === resumeData.episode_id) || episodes[0];
        if (targetEp) {
          playAnime(targetEp.id, {
            anime_title: resumeData.anime_title,
            cover_image: resumeData.cover_image,
            description: resumeData.description,
          });
          if (seekTo > 5) {
            setTimeout(() => {
              callNative<void>('media_seek', seekTo.toString()).catch(() => {});
            }, 2500);
          }
          callNative('clear_resume').catch(() => {});
          setResumeData(null);
          setResumeDismissed(false);
        }
      })
      .catch(err => setError('Ошибка при восстановлении просмотра: ' + err))
      .finally(() => setImporting(false));
  };


  const saveConfig = () => {
    setError(null);
    callNative<any>('save_settings', JSON.stringify({
      proxy_url: proxyUrl,
      search_provider: searchProvider,
      discord_presence_enabled: discordPresenceEnabled,
      discord_client_id: discordClientId,
      shikimori_client_id: shikimoriClientId,
      shikimori_client_secret: shikimoriClientSecret
    }))
      .then(() => {
        setShowSettings(false);
      })
      .catch(err => {
        setError('Ошибка сохранения настроек: ' + err);
      });
  };

  const playNext = () => {
    const currentIndex = animeList.findIndex(anime => anime.title === activeMedia);
    if (currentIndex !== -1 && currentIndex + 1 < animeList.length) {
      const next = animeList[currentIndex + 1];
      playAnime(next.id, {
        anime_title: next.title.split(' - ')[0],
        cover_image: next.cover_image,
        description: next.description,
      });
    }
  };

  const playPrev = () => {
    const currentIndex = animeList.findIndex(anime => anime.title === activeMedia);
    if (currentIndex > 0) {
      const prev = animeList[currentIndex - 1];
      playAnime(prev.id, {
        anime_title: prev.title.split(' - ')[0],
        cover_image: prev.cover_image,
        description: prev.description,
      });
    }
  };

  const handleViewportClick = () => {
    if (contextMenu) {
      setContextMenu(null);
      return;
    }
    if (showDrawer) {
      setShowDrawer(false);
    } else {
      togglePlayback();
    }
  };

  const currentEpisodeIndex = animeList.findIndex(anime => anime.title === activeMedia);
  const displayedTime = seekingValue !== null ? seekingValue : playbackState.time_pos;
  const progressPercent = playbackState.duration > 0 ? (displayedTime / playbackState.duration) * 100 : 0;
  const bufferPercent = playbackState.duration > 0
    ? Math.min(100, ((playbackState.time_pos + (playbackState.demuxer_cache_duration || 0)) / playbackState.duration) * 100)
    : 0;

  return (
    <div className={activeMedia ? "playback-active" : "w-full max-w-7xl mx-auto px-6 py-10"}>
      {activeMedia ? (
        <div 
          className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none pointer-events-none transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Top Bar */}
          <div className={`relative z-10 bg-gradient-to-b from-black/95 to-transparent p-6 flex items-center gap-4 pointer-events-auto transform transition-transform duration-300 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
            <button
              onClick={() => { stopAnime(); setShowDrawer(false); }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 hover:text-white transition-colors pointer-events-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <span className="text-lg font-bold text-white drop-shadow-md truncate">{activeMedia}</span>
          </div>

          {/* Clickable Viewport */}
          <div className="absolute inset-0 z-0 bg-transparent cursor-pointer pointer-events-auto" onClick={handleViewportClick} onDblClick={toggleFullscreen}></div>

          <NerdStatsOverlay
            playbackState={playbackState}
            showNerdStats={showNerdStats}
            setShowNerdStats={setShowNerdStats}
          />

          {contextMenu && (
            <PlayerContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onToggleNerdStats={() => setShowNerdStats(!showNerdStats)}
            />
          )}

          <EpisodeDrawer
            showDrawer={showDrawer}
            setShowDrawer={setShowDrawer}
            animeList={animeList}
            activeMedia={activeMedia}
            playAnime={playAnime}
          />

          {/* Control Bar Panel */}
          <div className={`relative z-10 bg-gradient-to-t from-black/95 to-transparent p-6 pt-12 flex flex-col pointer-events-auto transform transition-transform duration-300 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
            {/* Timeline */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-mono text-white/70 w-12 text-center drop-shadow">{formatTime(displayedTime)}</span>
              <div
                className="flex-grow relative h-1.5 flex items-center group"
                onMouseMove={handleTimelineMouseMove}
                onMouseLeave={handleTimelineMouseLeave}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-white/20 z-10 pointer-events-none"
                  style={{ width: `${bufferPercent}%` }}
                />
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 z-10 pointer-events-none"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  className="w-full h-full appearance-none bg-white/20 rounded-full cursor-pointer outline-none relative z-20"
                  min="0"
                  max={playbackState.duration || 100}
                  value={displayedTime}
                  onInput={handleSeekChange}
                  onChange={handleSeekCommit}
                />

                {hoverTime !== null && (
                  <div
                    className="absolute bottom-full mb-3 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 transition-all duration-100 ease-out"
                    style={{ left: `${hoverX}px` }}
                  >
                    <div className="relative rounded-lg overflow-hidden border border-violet-500/30 bg-zinc-950/90 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur w-44 aspect-video flex items-center justify-center">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center">
                          {isLoadingThumbnail ? (
                            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="text-white/40 text-xs font-mono">...</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 bg-zinc-950/90 border border-violet-500/20 px-2 py-0.5 rounded text-[10px] font-mono text-violet-300 shadow backdrop-blur">
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-xs font-mono text-white/70 w-12 text-center drop-shadow">{formatTime(playbackState.duration)}</span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Previous */}
                <button
                  onClick={playPrev}
                  disabled={currentEpisodeIndex <= 0}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 hover:border-white/20 transition-all text-white disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
                  title="Предыдущая серия"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </button>

                {/* Rewind */}
                <button
                  onClick={() => skipSeconds(-10)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 hover:border-white/20 transition-all text-white pointer-events-auto"
                  title="Назад на 10 сек"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlayback}
                  className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 pointer-events-auto"
                >
                  {playbackState.paused ? (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  ) : (
                    <Pause className="h-5 w-5 fill-current" />
                  )}
                </button>

                {/* Fast Forward */}
                <button
                  onClick={() => skipSeconds(10)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 hover:border-white/20 transition-all text-white pointer-events-auto"
                  title="Вперед на 10 сек"
                >
                  <RotateCw className="h-4 w-4" />
                </button>

                {/* Next */}
                <button
                  onClick={playNext}
                  disabled={currentEpisodeIndex === -1 || currentEpisodeIndex >= animeList.length - 1}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 hover:border-white/20 transition-all text-white disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
                  title="Следующая серия"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Volume Section */}
                <div className="flex items-center gap-2 group/volume pointer-events-auto">
                  <button
                    onClick={() => handleVolumeChange({ target: { value: playbackState.volume > 0 ? 0 : 80 } })}
                    className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-white"
                  >
                    {playbackState.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    className="w-0 group-hover/volume:w-20 transition-all duration-200 h-1 appearance-none bg-white/20 rounded-full cursor-pointer outline-none"
                    min="0"
                    max="100"
                    value={playbackState.volume}
                    onInput={handleVolumeChange}
                  />
                </div>

                <Anime4kPanel
                  showAnime4kPanel={showAnime4kPanel}
                  setShowAnime4kPanel={setShowAnime4kPanel}
                  anime4kMode={anime4kMode}
                  anime4kQuality={anime4kQuality}
                  applyAnime4k={applyAnime4k}
                />

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-white hover:bg-zinc-800 hover:border-white/20 transition-all pointer-events-auto"
                  title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>

                {/* Drawer Button */}
                <button
                  onClick={() => setShowDrawer(!showDrawer)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all pointer-events-auto ${showDrawer ? 'bg-violet-600 border-violet-600 text-white' : 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 hover:border-white/20'}`}
                  title="Список серий"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Vertical Left Sidebar Navigation */}
          <aside className="w-16 md:w-56 shrink-0 flex flex-col gap-1.5 p-2 bg-zinc-950/40 border border-white/5 rounded-2xl backdrop-blur-xl">
            <button
              onClick={() => setCurrentTab('home')}
              className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl transition-all duration-200 ${
                currentTab === 'home'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-600/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline text-sm">Главная</span>
            </button>

            <button
              onClick={() => setCurrentTab('search')}
              className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl transition-all duration-200 ${
                currentTab === 'search'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-600/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline text-sm">Поиск</span>
            </button>

            <button
              onClick={() => {
                setCurrentTab('history');
                loadHistory();
              }}
              className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl transition-all duration-200 ${
                currentTab === 'history'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-600/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline text-sm">История</span>
            </button>

            {shikimoriAuthorized && (
              <button
                onClick={() => setCurrentTab('bookmarks')}
                className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl transition-all duration-200 ${
                  currentTab === 'bookmarks'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-600/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bookmark className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline text-sm">Закладки</span>
                <span className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 ml-auto text-[8px] font-extrabold tracking-wide uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                  Фильтры
                </span>
              </button>
            )}
          </aside>

          {/* Right Content Panel */}
          <div className="flex-grow space-y-6">
            <header className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">AnimeSphere</h1>
                <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-400">Native MPV Engine</span>
              </div>
              <div className="flex items-center gap-3">
                {shikimoriAuthorized && shikimoriProfile && (
                  <button
                    onClick={() => {
                      if (shikimoriProfile.url) {
                        callNative("open_browser", shikimoriProfile.url).catch(err => console.error(err));
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all text-xs font-medium text-violet-300 hover:scale-105 active:scale-95 shadow-sm"
                    title={`Открыть профиль Shikimori: ${shikimoriProfile.nickname}`}
                  >
                    {shikimoriProfile.avatar ? (
                      <img
                        src={shikimoriProfile.avatar}
                        alt={shikimoriProfile.nickname}
                        className="w-6 h-6 rounded-full object-cover border border-violet-400/30 shadow-inner"
                        onError={(e: any) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-400 uppercase shadow-inner">
                        {shikimoriProfile.nickname.slice(0, 2)}
                      </div>
                    )}
                    <span className="hidden sm:inline font-semibold">{shikimoriProfile.nickname}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 border border-border rounded-lg bg-card/60 hover:bg-accent text-white transition-all shadow-sm hover:scale-105"
                  title="Настройки"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </header>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm font-semibold">
                {error}
              </div>
            )}

            {/* TAB CONTENTS */}
            {currentTab === 'home' && (
              <div className="space-y-8">

                {/* ── Resume Banner ── */}
                {resumeData && !resumeDismissed && (
                  <div className="relative flex gap-4 p-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-zinc-900/60 to-indigo-950/30 backdrop-blur-xl shadow-xl overflow-hidden">
                    {/* Blurred cover art background */}
                    {resumeData.cover_image && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-10 blur-sm scale-105"
                        style={{ backgroundImage: `url(${getProxiedImageUrl(resumeData.cover_image)})` }}
                      />
                    )}
                    {/* Cover thumbnail */}
                    <div
                      className="relative shrink-0 w-16 h-20 rounded-xl bg-cover bg-center border border-white/10 shadow-lg"
                      style={resumeData.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(resumeData.cover_image)})` } : {}}
                    />
                    {/* Info */}
                    <div className="relative flex-grow flex flex-col justify-between min-w-0 py-0.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-0.5">Продолжить просмотр</p>
                        <h3 className="text-base font-bold text-white line-clamp-1">{resumeData.anime_title}</h3>
                        <p className="text-xs text-white/50 line-clamp-1 mt-0.5">{resumeData.episode_title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {/* Progress bar */}
                        <div className="flex-grow h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                            style={{ width: `${Math.min(100, (resumeData.time_pos / 1440) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-violet-300 shrink-0">
                          {formatTime(resumeData.time_pos)}
                        </span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="relative flex flex-col gap-2 justify-center shrink-0">
                      <button
                        onClick={resumePlayback}
                        disabled={importing}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Продолжить
                      </button>
                      <button
                        onClick={() => {
                          callNative('clear_resume').catch(() => {});
                          setResumeData(null);
                          setResumeDismissed(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-white/60 hover:text-white text-xs font-semibold transition-all"
                      >
                        Начать заново
                      </button>
                    </div>
                    {/* Dismiss X */}
                    <button
                      onClick={() => setResumeDismissed(true)}
                      className="absolute top-2.5 right-2.5 text-white/30 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {/* Resume Playback section if animeList is not empty */}
                {animeList && animeList.length > 0 ? (
                  <div className="p-6 rounded-2xl border border-violet-500/10 bg-gradient-to-r from-violet-950/20 via-zinc-900/40 to-indigo-950/10 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-violet-400 font-bold">Активный плейлист</p>
                      <h2 className="text-xl font-bold text-white line-clamp-1">{animeList[0].title.split(" - ")[0]}</h2>
                      <p className="text-sm text-white/50 font-medium">{animeList.length} серий доступно для воспроизведения</p>
                    </div>
                    <button
                      onClick={() => setShowDrawer(true)}
                      className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Продолжить просмотр
                    </button>
                  </div>
                ) : (
                  <div className="p-10 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/40 border border-white/5 flex items-center justify-center mx-auto">
                      <Play className="h-8 w-8 text-white/40" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white">Список серий пуст</h3>
                      <p className="text-sm text-white/40 max-w-sm mx-auto">Найдите интересующее вас аниме через поиск или импортируйте плейлист вручную в настройках.</p>
                    </div>
                    <button
                      onClick={() => setCurrentTab('search')}
                      className="px-5 py-2 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-all"
                    >
                      Перейти к поиску
                    </button>
                  </div>
                )}

                {/* Dashboard recent items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Недавно просмотренные</h3>
                  {titles && titles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {titles.slice(0, 3).map((title, idx) => (
                        <div
                          key={`${title.description || title.id}-${idx}`}
                          className="group cursor-pointer rounded-xl border border-border bg-card/60 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all overflow-hidden flex flex-col"
                          onClick={() => onSelectTitle(title)}
                        >
                          <div
                            className="relative h-36 bg-muted border-b border-border flex items-center justify-center bg-cover bg-center"
                            style={title.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(title.cover_image)})` } : {}}
                          >
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                            <div className="relative z-10 w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg shadow-violet-600/40">
                              {isMetadataTitle(title) ? (
                                <Search className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                              )}
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-bold text-sm text-foreground group-hover:text-violet-400 transition-colors line-clamp-1">{title.title}</h4>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{title.description}</p>
                            {isMetadataTitle(title) && (
                              <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider">Shikimori</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerAltSearch(title.title);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/20 text-[10px] font-bold transition-all duration-200"
                                >
                                  <Search className="h-3 w-3" />
                                  Найти видео
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/30">Здесь пока ничего нет. Начните просмотр аниме, чтобы история отобразилась здесь.</p>
                  )}
                </div>
              </div>
            )}

            {currentTab === 'search' && (
              <div className="space-y-6">
                {/* Search input bar */}
                <div className="relative flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full bg-card/20 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/40"
                      placeholder={
                        searchProvider === "jutsu" ? "Поиск аниме на Jut.su (транслитом, например: ookami-to-koshinryou)..."
                        : searchProvider === "animego" ? "Поиск аниме на AnimeGO (например: Bleach: Thousand-Year Blood War)..."
                        : searchProvider === "shikimori" ? "Поиск аниме на Shikimori (например: Naruto, Bleach)..."
                        : searchProvider === "collaps" ? "Поиск аниме на Collaps (например: Naruto, Bleach)..."
                        : searchProvider === "collaps-dash" ? "Поиск аниме на Collaps-DASH (например: Naruto, Bleach)..."
                        : "Поиск аниме на AnimeVost..."
                      }
                      value={searchQuery}
                      onInput={(e: any) => setSearchQuery(e.target.value)}
                      onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors shadow"
                    disabled={importing || !searchQuery.trim()}
                  >
                    {importing ? "Поиск..." : "Найти"}
                  </button>
                </div>

                {/* Search Results Grid */}
                {importing ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-white/50">Ищем варианты по вашему запросу...</p>
                  </div>
                ) : titles && titles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {titles.map((title, idx) => (
                      <div
                        key={`${title.description || title.id}-${idx}`}
                        className="group cursor-pointer rounded-xl border border-border bg-card/60 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all overflow-hidden flex flex-col"
                        onClick={() => onSelectTitle(title)}
                      >
                        <div
                          className="relative h-44 bg-muted border-b border-border flex items-center justify-center bg-cover bg-center"
                          style={title.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(title.cover_image)})` } : {}}
                        >
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                          <div className="relative z-10 w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg shadow-violet-600/40">
                            {isMetadataTitle(title) ? (
                              <Search className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>
                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-base mb-1 text-foreground group-hover:text-violet-400 transition-colors line-clamp-1">{title.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{title.description}</p>
                          </div>
                          {isMetadataTitle(title) && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[10px] text-white/35 font-medium uppercase tracking-wider">Shikimori</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerAltSearch(title.title);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/20 text-xs font-bold transition-all duration-200"
                              >
                                <Search className="h-3.5 w-3.5" />
                                Найти видео
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-white/30 text-sm">
                    Введите поисковый запрос выше для поиска аниме.
                  </div>
                )}
              </div>
            )}

            {currentTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">История просмотров</h3>
                  <button
                    onClick={loadHistory}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Обновить
                  </button>
                </div>
                {titles && titles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {titles.map((title, idx) => (
                      <div
                        key={`${title.description || title.id}-${idx}`}
                        className="group cursor-pointer rounded-xl border border-border bg-card/60 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all overflow-hidden flex flex-col"
                        onClick={() => onSelectTitle(title)}
                      >
                        <div
                          className="relative h-44 bg-muted border-b border-border flex items-center justify-center bg-cover bg-center"
                          style={title.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(title.cover_image)})` } : {}}
                        >
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                          <div className="relative z-10 w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg shadow-violet-600/40">
                            {isMetadataTitle(title) ? (
                              <Search className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>
                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-base mb-1 text-foreground group-hover:text-violet-400 transition-colors line-clamp-1">{title.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{title.description}</p>
                          </div>
                          {isMetadataTitle(title) && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[10px] text-white/35 font-medium uppercase tracking-wider">Shikimori</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerAltSearch(title.title);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/20 text-xs font-bold transition-all duration-200"
                              >
                                <Search className="h-3.5 w-3.5" />
                                Найти видео
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-white/30 text-sm">
                    История пуста. Запустите просмотр, чтобы наполнить этот раздел.
                  </div>
                )}
              </div>
            )}

            {currentTab === 'bookmarks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">Мой список Shikimori</h3>
                    {shikimoriBookmarks && shikimoriBookmarks.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Фильтры активны
                      </span>
                    )}
                  </div>
                  <button
                    onClick={loadBookmarks}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    disabled={isLoadingBookmarks}
                  >
                    {isLoadingBookmarks ? "Обновление..." : "Обновить"}
                  </button>
                </div>

                {/* Filters pills container */}
                {shikimoriBookmarks && shikimoriBookmarks.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {[
                      { key: 'all', label: 'Все' },
                      { key: 'watching', label: 'Смотрю' },
                      { key: 'planned', label: 'В планах' },
                      { key: 'completed', label: 'Просмотрено' },
                      { key: 'on_hold', label: 'Отложено' },
                      { key: 'dropped', label: 'Брошено' },
                      { key: 'rewatching', label: 'Пересматриваю' },
                    ].map(filter => {
                      const count = filter.key === 'all'
                        ? shikimoriBookmarks.length
                        : shikimoriBookmarks.filter(b => b.watch_status === filter.key).length;

                      // Only render filters that have items, or the 'All' filter
                      if (filter.key !== 'all' && count === 0) return null;

                      const isActive = activeBookmarkFilter === filter.key;
                      return (
                        <button
                          key={filter.key}
                          onClick={() => setActiveBookmarkFilter(filter.key)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                              : 'bg-zinc-800/40 text-white/60 hover:text-white border border-white/5 hover:bg-zinc-800/60'
                          }`}
                        >
                          {filter.label}
                          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                            isActive ? 'bg-white/25 text-white' : 'bg-white/5 text-white/40'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isLoadingBookmarks ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-white/50">Загружаем ваш список из Shikimori...</p>
                  </div>
                ) : shikimoriBookmarks && shikimoriBookmarks.length > 0 ? (
                  (() => {
                    const filtered = shikimoriBookmarks.filter(title => {
                      if (activeBookmarkFilter === 'all') return true;
                      return title.watch_status === activeBookmarkFilter;
                    });
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20 text-white/30 text-sm border border-white/5 rounded-2xl bg-zinc-900/10">
                          Нет закладок с выбранным статусом.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filtered.map((title, idx) => (
                          <div
                            key={idx}
                            className="group cursor-pointer rounded-xl border border-border bg-card/60 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all overflow-hidden flex flex-col relative"
                            onClick={() => onSelectTitle(title)}
                          >
                            {/* Bookmark progress status badge */}
                            <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border bg-zinc-950/85 backdrop-blur shadow-md text-violet-300 border-violet-500/20">
                              {title.status_text ? title.status_text.split("Статус: ")[1].split(",")[0] : ""}
                            </div>

                            <div
                              className="relative h-44 bg-muted border-b border-border flex items-center justify-center bg-cover bg-center"
                              style={title.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(title.cover_image)})` } : {}}
                            >
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                              <div className="relative z-10 w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg shadow-violet-600/40">
                                {isMetadataTitle(title) ? (
                                  <Search className="h-5 w-5" />
                                ) : (
                                  <Play className="h-5 w-5 fill-current ml-0.5" />
                                )}
                              </div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold text-base mb-1 text-foreground group-hover:text-violet-400 transition-colors line-clamp-1">{title.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{title.status_text || title.description}</p>
                              </div>
                              {isMetadataTitle(title) && (
                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                  <span className="text-[10px] text-white/35 font-medium uppercase tracking-wider">Shikimori</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerAltSearch(title.title);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/20 text-xs font-bold transition-all duration-200"
                                  >
                                    <Search className="h-3.5 w-3.5" />
                                    Найти видео
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-20 text-white/30 text-sm">
                    Ваш список на Shikimori пуст или не удалось загрузить данные.
                  </div>
                )}
              </div>
            )}
          </div>

          <SettingsModal
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            proxyUrl={proxyUrl}
            setProxyUrl={setProxyUrl}
            searchProvider={searchProvider}
            setSearchProvider={setSearchProvider}
            discordPresenceEnabled={discordPresenceEnabled}
            setDiscordPresenceEnabled={setDiscordPresenceEnabled}
            discordClientId={discordClientId}
            setDiscordClientId={setDiscordClientId}
            shikimoriClientId={shikimoriClientId}
            setShikimoriClientId={setShikimoriClientId}
            shikimoriClientSecret={shikimoriClientSecret}
            setShikimoriClientSecret={setShikimoriClientSecret}
            shikimoriAuthorized={shikimoriAuthorized}
            shikimoriLoggingIn={shikimoriLoggingIn}
            loginShikimori={loginShikimori}
            vostId={vostId}
            setVostId={setVostId}
            importing={importing}
            importPlaylist={importPlaylist}
            saveConfig={saveConfig}
          />

          {showAltSearch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Search className="h-5 w-5 text-violet-400" />
                      Поиск плеера для аниме
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">Ищем по провайдерам для: <span className="text-violet-300 font-semibold">{altSearchTitle}</span></p>
                  </div>
                  <button
                    onClick={() => setShowAltSearch(false)}
                    className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* List */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                  {isLoadingAltSearch ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-white/40">Опрашиваем AnimeGO, Jut.su, AnimeVost, AniLiberty, Collaps...</p>
                    </div>
                  ) : altSearchResults && altSearchResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {altSearchResults.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setShowAltSearch(false);
                            onSelectTitle(item);
                          }}
                          className="group flex gap-3 p-3 rounded-xl border border-white/5 bg-zinc-950/20 hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer transition-all duration-200"
                        >
                          <div
                            className="w-16 h-24 rounded-lg bg-cover bg-center shrink-0 border border-white/5"
                            style={item.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(item.cover_image)})` } : {}}
                          />
                          <div className="flex flex-col justify-between overflow-hidden py-1">
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-violet-600/20 text-violet-300 border border-violet-500/20 mb-1.5">
                                {item.provider}
                              </span>
                              <h4 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-2 leading-snug">
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-[10px] text-white/40 truncate mt-1">
                              {item.description.startsWith("http") ? "Перейти к просмотру" : item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-2">
                      <p className="text-sm text-white/30">Ни одного совпадения не найдено.</p>
                      <p className="text-xs text-white/20">Попробуйте изменить поисковый запрос во вкладке "Поиск".</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-3 border-t border-white/5">
                  <button
                    onClick={() => setShowAltSearch(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
