import { useState, useEffect } from 'preact/hooks'
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  RotateCcw, RotateCw, ArrowLeft, Search, Menu, Settings, Maximize, Minimize
} from 'lucide-preact'
import { callNative } from './lib/ipc';
import { getProxiedImageUrl, formatTime } from './lib/utils';
import { SettingsModal } from './components/SettingsModal';
import { EpisodeDrawer } from './components/Player/EpisodeDrawer';
import { Anime4kPanel } from './components/Player/Anime4kPanel';

import { useSettings } from './hooks/useSettings';
import { useLibrary } from './hooks/useLibrary';
import { usePlayback } from './hooks/usePlayback';
import type { AnimeTitle } from './types';

export function App() {
  const [error, setError] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAnime4kPanel, setShowAnime4kPanel] = useState(false);

  const {
    showSettings, setShowSettings, proxyUrl, setProxyUrl, searchProvider, setSearchProvider,
    discordPresenceEnabled, setDiscordPresenceEnabled, discordClientId, setDiscordClientId
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

  const onSelectTitle = (title: AnimeTitle) => {
    setImporting(true);
    setError(null);
    callNative<any>("select_anime", JSON.stringify(title))
      .then(() => callNative<any>("fetch_catalog"))
      .then(episodes => {
        setAnimeList(episodes);
        if (episodes.length > 0) {
            playAnime(episodes[0].id);
        } else {
          setError("Этот провайдер предоставляет только метаданные (поиск/описание) — видеопотоков нет. Используйте AnimeGO, Jut.su или AnimeVost для просмотра.");
        }
      })
      .catch(err => setError("Ошибка при открытии аниме: " + err))
      .finally(() => setImporting(false));
  };


  const saveConfig = () => {
    setError(null);
    callNative<any>("save_settings", JSON.stringify({
      proxy_url: proxyUrl,
      search_provider: searchProvider,
      discord_presence_enabled: discordPresenceEnabled,
      discord_client_id: discordClientId
    }))
      .then(() => {
        setShowSettings(false);
      })
      .catch(err => {
        setError("Ошибка сохранения настроек: " + err);
      });
  };

  const playNext = () => {
    const currentIndex = animeList.findIndex(anime => anime.title === activeMedia);
    if (currentIndex !== -1 && currentIndex + 1 < animeList.length) {
      playAnime(animeList[currentIndex + 1].id);
    }
  };

  const playPrev = () => {
    const currentIndex = animeList.findIndex(anime => anime.title === activeMedia);
    if (currentIndex > 0) {
      playAnime(animeList[currentIndex - 1].id);
    }
  };

  const handleViewportClick = () => {
    if (showDrawer) {
      setShowDrawer(false);
    } else {
      togglePlayback();
    }
  };

  const currentEpisodeIndex = animeList.findIndex(anime => anime.title === activeMedia);
  const displayedTime = seekingValue !== null ? seekingValue : playbackState.time_pos;
  const progressPercent = playbackState.duration > 0 ? (displayedTime / playbackState.duration) * 100 : 0;

  return (
    <div className={activeMedia ? "playback-active" : "w-full max-w-7xl mx-auto px-6 py-10"}>
      {activeMedia ? (
        <div className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none pointer-events-none transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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
              <div className="flex-grow relative h-1.5 flex items-center group">
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
        <div className="space-y-8">
          <header className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">AnimeSphere</h1>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-400">Native MPV Engine</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border border-border rounded-lg bg-card/60 hover:bg-accent text-white transition-all shadow-sm hover:scale-105"
              title="Настройки"
            >
              <Settings className="h-5 w-5" />
            </button>
          </header>

          {/* Search bar */}
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

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {titles.map(title => (
              <div
                key={title.id} 
                className="group cursor-pointer rounded-xl border border-border bg-card/60 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all overflow-hidden flex flex-col"
                onClick={() => onSelectTitle(title)}
              >
                <div
                  className="relative h-44 bg-muted border-b border-border flex items-center justify-center bg-cover bg-center"
                  style={title.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(title.cover_image)})` } : {}}
                >
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                  <div className="relative z-10 w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg shadow-violet-600/40">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-1 text-foreground group-hover:text-violet-400 transition-colors line-clamp-1">{title.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{title.description}</p>
                  </div>
                </div>
              </div>
            ))}
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
            vostId={vostId}
            setVostId={setVostId}
            importing={importing}
            importPlaylist={importPlaylist}
            saveConfig={saveConfig}
          />
        </div>
      )}
    </div>
  );
}
