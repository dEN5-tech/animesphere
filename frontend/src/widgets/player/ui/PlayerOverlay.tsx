import { useEffect } from 'preact/hooks';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft, SkipBack, Play, Pause,
  SkipForward, VolumeX, Volume2, Minimize, Maximize,
  Users, Sliders
} from 'lucide-preact';
import { formatTime, getProxiedImageUrl } from '../../../shared/lib/utils';
import { NerdStatsOverlay } from './NerdStatsOverlay';
import { PlayerContextMenu } from './PlayerContextMenu';
import { SyncDrawer } from './SyncDrawer';
import { usePlayback } from '../../../features/playback-control';
import { useLibrary } from '../../../features/library';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as uiStore from '../../../entities/ui';
import { proxyUrl } from '../../../features/settings';

export function PlayerOverlay() {
  const {
    activeMedia,
    showControls,
    setShowControls,
    stopAnime,
    playbackState,
    seekingValue,
    isFullscreen,
    toggleFullscreen,
    togglePlayback,
    playPrev,
    playNext,
    playAnime,
    cycleQuality,
    handleSeekChange,
    handleSeekCommit,
    hoverTime,
    hoverX,
    thumbnailUrl,
    isLoadingThumbnail,
    handleVolumeChange,
    anime4kMode,
    anime4kQuality,
    applyAnime4k,
    resetControlsTimeout,
    controlsTimeoutRef,
    skipSeconds,
  } = usePlayback();

  const { animeList } = useLibrary();

  const proxyUrlVal = useAtomValue(proxyUrl);

  const showDrawer = useAtomValue(uiStore.showDrawer);
  const setShowDrawer = (val: boolean | ((prev: boolean) => boolean)) => {
    const current = jotaiStore.get(uiStore.showDrawer);
    jotaiStore.set(uiStore.showDrawer, typeof val === 'function' ? val(current) : val);
  };

  const showSyncPanel = useAtomValue(uiStore.showSyncPanel);
  const setShowSyncPanel = (val: boolean | ((prev: boolean) => boolean)) => {
    const current = jotaiStore.get(uiStore.showSyncPanel);
    jotaiStore.set(uiStore.showSyncPanel, typeof val === 'function' ? val(current) : val);
  };

  const showNerdStats = useAtomValue(uiStore.showNerdStats);
  const setShowNerdStats = (val: boolean | ((prev: boolean) => boolean)) => {
    const current = jotaiStore.get(uiStore.showNerdStats);
    jotaiStore.set(uiStore.showNerdStats, typeof val === 'function' ? val(current) : val);
  };

  const contextMenu = useAtomValue(uiStore.contextMenu);
  const setContextMenu = (val: { x: number; y: number } | null | ((prev: { x: number; y: number } | null) => { x: number; y: number } | null)) => {
    const current = jotaiStore.get(uiStore.contextMenu);
    jotaiStore.set(uiStore.contextMenu, typeof val === 'function' ? val(current) : val);
  };

  useEffect(() => {
    const handlePlayerContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
      resetControlsTimeout();
    };
    window.addEventListener('contextmenu', handlePlayerContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handlePlayerContextMenu);
    };
  }, []);

  useEffect(() => {
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
  }, [isFullscreen, playbackState.time_pos, playbackState.duration]);

  useEffect(() => {
    window.addEventListener('mousemove', resetControlsTimeout);
    resetControlsTimeout();
    return () => {
      window.removeEventListener('mousemove', resetControlsTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playbackState.paused, showDrawer]);

  if (!activeMedia) return null;

  // Computed values
  const currentEpisodeIndex = animeList.findIndex(anime => anime.title === activeMedia);
  const displayedTime = seekingValue !== null ? seekingValue : playbackState.time_pos;
  const progressPercent = playbackState.duration > 0 ? (displayedTime / playbackState.duration) * 100 : 0;
  const bufferPercent = playbackState.duration > 0
    ? Math.min(100, ((playbackState.time_pos + (playbackState.demuxer_cache_duration || 0)) / playbackState.duration) * 100)
    : 0;

  const handleViewportClick = () => {
    if (contextMenu) {
      setContextMenu(null);
      return;
    }
    if (showDrawer) {
      setShowDrawer(false);
      return;
    }
    if (showSyncPanel) {
      setShowSyncPanel(false);
      return;
    }
    
    // Toggle controls visibility on single click
    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimeout();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none pointer-events-none transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Top Navigation Bar */}
      <header className={`fixed top-0 w-full z-50 bg-[#080810]/75 backdrop-blur-xl border-b border-[#5c3f46] flex justify-between items-center px-6 h-16 pointer-events-auto transform transition-transform duration-300 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-8">
          <span onClick={() => { stopAnime(); setShowDrawer(false); }} className="text-xl font-black text-[#ffb1c4] italic cursor-pointer active:scale-95 transition-transform flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            AnimeSphere
          </span>
          <nav className="hidden md:flex gap-6">
            <span className="text-[#fbdae1]/70 font-medium cursor-pointer" onClick={() => { stopAnime(); setShowDrawer(false); }}>The Station Lobby</span>
            <span className="text-[#00dbe9] font-bold border-b-2 border-[#00dbe9] pb-1 cursor-pointer">The Window Seat</span>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-white">
          <span className="text-sm font-bold text-[#fbdae1] drop-shadow-md truncate max-w-xs md:max-w-md">{activeMedia}</span>
        </div>
      </header>

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
          onCycleQuality={cycleQuality}
        />
      )}

      {/* Left Sidebar: Episode Playlist */}
      <aside className={`absolute left-4 top-24 bottom-24 w-72 player-glass-panel rounded-xl flex flex-col overflow-hidden transition-all duration-300 pointer-events-auto z-40 ${showControls ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`} id="playlist-sidebar">
        <div className="p-4 border-b border-[#00dbe9]/30 flex justify-between items-center bg-[#2d1a1f]/30">
          <h3 className="font-semibold text-sm text-[#00dbe9]">Episode Playlist</h3>
          <span className="text-[10px] font-mono text-[#e5bcc5]">{animeList.length} EPS</span>
        </div>
        <div className="flex-1 overflow-y-auto playlist-scroll p-2 space-y-2">
          {animeList.map((anime) => {
            const isPlaying = anime.title === activeMedia;
            return (
              <div
                key={anime.id}
                onClick={() => playAnime(anime.id)}
                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${isPlaying ? 'bg-[#00eefc]/15 border-[#00dbe9]/50 text-[#00dbe9]' : 'bg-transparent border-transparent hover:bg-[#442f34]/30 text-[#fbdae1]'}`}
              >
                <div
                  className={`w-14 h-9 rounded bg-cover bg-center border border-[#5c3f46] shrink-0 ${!isPlaying ? 'grayscale opacity-60' : ''}`}
                  style={anime.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(anime.cover_image)})` } : {}}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${isPlaying ? 'font-bold text-[#00dbe9]' : 'font-medium'}`}>{anime.title}</p>
                  <p className="text-[9px] font-mono text-[#e5bcc5] uppercase">
                    {isPlaying ? 'Playing' : 'Watched'}
                  </p>
                </div>
                {isPlaying && <span className="material-symbols-outlined text-[#00dbe9] text-[10px]">play_arrow</span>}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right Panel: Shader Control Panel */}
      <aside className={`absolute right-4 top-24 bottom-24 w-64 player-glass-panel rounded-xl flex flex-col p-4 gap-5 transition-all duration-300 pointer-events-auto z-40 ${showControls ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
        <header className="flex items-center justify-between border-b border-[#00dbe9]/30 pb-2">
          <h3 className="font-semibold text-sm text-[#00dbe9]">Shader HUD</h3>
          <Sliders className="h-4 w-4 text-[#00dbe9]" />
        </header>
        
        {/* Anime4K Modes */}
        <section>
          <label className="font-mono text-[10px] text-[#e5bcc5] uppercase block mb-2">Anime4K Modes</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['off', 'A', 'B', 'C'] as const).map((m) => (
              <button
                key={m}
                onClick={() => applyAnime4k(m, anime4kQuality)}
                className={`py-1.5 rounded border text-[10px] font-bold transition-all active:scale-95 ${anime4kMode === m ? 'border-[#00dbe9] bg-[#00dbe9]/20 text-[#00dbe9]' : 'border-[#5c3f46] bg-[#442f34]/20 text-[#e5bcc5] hover:border-[#00dbe9]/50'}`}
              >
                {m === 'off' ? 'OFF' : m}
              </button>
            ))}
          </div>
        </section>

        {/* Quality Tiers */}
        <section>
          <label className="font-mono text-[10px] text-[#e5bcc5] uppercase block mb-2">Quality Tiers</label>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'S', name: 'Ultra-Low (S)' },
              { id: 'M', name: 'Low (M)' },
              { id: 'L', name: 'Medium (L)' },
              { id: 'VL', name: 'Standard HQ (VL)' },
              { id: 'UL', name: 'Ultra HQ (UL)' }
            ].map((q) => {
              const isActive = anime4kQuality === q.id && anime4kMode !== 'off';
              return (
                <div
                  key={q.id}
                  onClick={() => anime4kMode !== 'off' && applyAnime4k(anime4kMode, q.id as any)}
                  className={`flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer ${anime4kMode === 'off' ? 'opacity-40 cursor-not-allowed border-[#5c3f46]' : isActive ? 'bg-[#00eefc]/10 border-[#00dbe9]/50 text-[#00dbe9]' : 'bg-transparent border-[#5c3f46] hover:bg-[#442f34]/20'}`}
                >
                  <span className="text-[11px] font-medium">{q.name}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#00dbe9] shadow-[0_0_8px_#00dbe9]' : 'bg-[#e5bcc5]'}`} />
                </div>
              );
            })}
          </div>
        </section>

        {/* System Monitor */}
        <section className="mt-auto pt-3 border-t border-[#00dbe9]/30">
          <div className="flex justify-between text-[9px] font-mono text-[#e5bcc5]">
            <span>FRAME TIME</span>
            <span className="text-[#00dbe9] font-bold">
              {playbackState.nerd_stats && playbackState.nerd_stats.fps > 0
                ? (1000.0 / playbackState.nerd_stats.fps).toFixed(1) + 'ms'
                : '16.6ms'}
            </span>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#e5bcc5] mt-1">
            <span>VRAM LOAD</span>
            <span className="text-[#00dbe9] font-bold">
              {playbackState.nerd_stats && playbackState.nerd_stats.width > 0
                ? (playbackState.nerd_stats.width * playbackState.nerd_stats.height * 4 * 3 / (1024 * 1024 * 1024) + 1.2).toFixed(1) + ' GB'
                : '2.4 GB'}
            </span>
          </div>
          <div className="mt-3 h-1 w-full bg-[#5c3f46] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00dbe9] to-[#ff4a8d]" style={{ width: '65%' }}></div>
          </div>
        </section>
      </aside>

      <SyncDrawer
        showDrawer={showSyncPanel}
        setShowDrawer={setShowSyncPanel}
      />

      {/* Bottom Control Dock */}
      <section className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl player-glass-panel rounded-2xl flex flex-col p-4 gap-4 transition-all duration-300 pointer-events-auto z-40 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        
        {/* Custom Seekbar */}
        <div className="relative w-full h-4 group cursor-pointer flex items-center">
          <div className="w-full h-[3px] bg-[#442f34] rounded-full overflow-hidden relative">
            {/* Buffer */}
            <div className="absolute left-0 top-0 h-full bg-white/10" style={{ width: `${bufferPercent}%` }} />
            {/* Progress */}
            <div className="absolute left-0 top-0 h-full bg-[#00dbe9]" style={{ width: `${progressPercent}%` }} />
          </div>
          
          {/* Slider input overlapping for hit detection */}
          <input
            type="range"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            min="0"
            max={playbackState.duration || 100}
            value={displayedTime}
            onInput={handleSeekChange}
            onChange={handleSeekCommit}
          />
          
          {/* Handle (Neon Pink Thumb) */}
          <div
            className="absolute w-4.5 h-4.5 rounded-full bg-[#ff4a8d] seekbar-handle transform -translate-x-1/2 border border-white/20 transition-transform group-hover:scale-125 pointer-events-none z-10"
            style={{ left: `${progressPercent}%`, boxShadow: '0 0 12px #ff4a8d' }}
          />

          {hoverTime !== null && (
            <div
              className="absolute bottom-full mb-3 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 transition-all duration-100 ease-out"
              style={{ left: `${hoverX}px` }}
            >
              <div className="relative rounded-xl overflow-hidden border border-[#00dbe9]/30 bg-[#080810]/95 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-md w-44 aspect-video flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[#080810]/80 flex items-center justify-center">
                    {isLoadingThumbnail ? (
                      <div className="w-6 h-6 border-2 border-[#ff4a8d] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-white/40 text-xs font-mono">...</span>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-1.5 bg-[#080810]/95 border border-[#00dbe9]/20 px-2 py-0.5 rounded text-[10px] font-mono text-[#00dbe9] shadow backdrop-blur-md">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-white">
          {/* Left: Controls */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={playPrev}
                disabled={currentEpisodeIndex <= 0}
                className="w-9 h-9 rounded-full bg-[#2d1a1f]/60 border border-[#5c3f46] flex items-center justify-center hover:bg-[#ff4a8d]/10 hover:border-[#ff4a8d]/40 active:scale-95 transition-all text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Предыдущая серия"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </button>
              
              <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-[#00dbe9] hover:bg-[#00B4CC] text-[#080810] flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95"
              >
                {playbackState.paused ? (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                ) : (
                  <Pause className="h-4 w-4 fill-current" />
                )}
              </button>
              
              <button
                onClick={playNext}
                disabled={currentEpisodeIndex === -1 || currentEpisodeIndex >= animeList.length - 1}
                className="w-9 h-9 rounded-full bg-[#2d1a1f]/60 border border-[#5c3f46] flex items-center justify-center hover:bg-[#ff4a8d]/10 hover:border-[#ff4a8d]/40 active:scale-95 transition-all text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Следующая серия"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
            </div>

            {/* Volume Section */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={() => handleVolumeChange({ target: { value: playbackState.volume > 0 ? 0 : 80 } } as any)}
                className="w-8 h-8 rounded-full bg-[#2d1a1f]/60 border border-[#5c3f46] hover:bg-[#ff4a8d]/10 hover:border-[#ff4a8d]/40 active:scale-95 flex items-center justify-center text-white transition-all"
              >
                {playbackState.volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
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

            <span className="font-mono text-xs text-[#e5bcc5]">
              {formatTime(displayedTime)} / {formatTime(playbackState.duration)}
            </span>
          </div>

          {/* Center: Now Playing Title */}
          <div className="text-center">
            <p className="text-xs font-bold text-[#fbdae1] uppercase tracking-wider">{activeMedia}</p>
          </div>

          {/* Right: Settings */}
          <div className="flex items-center gap-4">
            {/* Proxy Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#00dbe9]/30 bg-[#2d1a1f]/40">
              <span className="text-[10px] font-mono text-[#e5bcc5]">PROXY:</span>
              <span className="text-[10px] font-mono text-[#00dbe9] font-bold">
                {proxyUrlVal.trim().length === 0 ? "DIRECT" : "SYSTEM"}
              </span>
            </div>

            {/* Sync Panel Button */}
            <button
              onClick={() => {
                setShowSyncPanel(!showSyncPanel);
                if (!showSyncPanel) setShowDrawer(false);
              }}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all active:scale-95 ${showSyncPanel ? 'bg-[#00dbe9] border-[#00dbe9] text-[#080810] shadow-lg' : 'bg-[#2d1a1f]/60 border-[#5c3f46] text-white hover:bg-[#00dbe9]/10'}`}
              title="Watch Together (Синхронизация)"
            >
              <Users className="h-4 w-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-[#2d1a1f]/60 border border-[#5c3f46] flex items-center justify-center text-white hover:bg-[#ff4a8d]/10 hover:border-[#ff4a8d]/40 active:scale-95 transition-all"
              title={isFullscreen ? "Выйти" : "Во весь экран"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
