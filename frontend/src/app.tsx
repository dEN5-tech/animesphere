import { useState, useEffect, useRef } from 'preact/hooks'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  ArrowLeft, 
  Search, 
  Menu, 
  RefreshCw,
  Settings,
  Sparkles,
  Maximize,
  Minimize
} from 'lucide-preact'

declare global {
  interface Window {
    ipc: {
      postMessage: (message: string) => void;
    };
    resolveIpc: (callbackId: string, success: boolean, data: any) => void;
    onPlaybackUpdate?: (state: PlaybackState) => void;
  }
}

interface Anime {
  id: number;
  title: string;
  description: string;
  cover_image: string;
}

interface AnimeTitle {
  id: number;
  title: string;
  description: string;
  cover_image: string;
}

interface StreamInfo {
  title: string;
}

interface PlaybackState {
  time_pos: number;
  duration: number;
  paused: boolean;
  volume: number;
}

const callbacks: Record<string, (success: boolean, data: any) => void> = {};
let simulatedPlaybackInterval: any = null;

const getProxiedImageUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("media.animetop.info") || url.includes("media.animevost.org")) {
    const isWindowsOrAndroid = /windows|android/i.test(navigator.userAgent);
    const isHttps = url.startsWith("https");
    const proto = isHttps ? "https" : "http";
    const cleanUrl = url.replace(/^https?:\/\//i, "");
    if (isWindowsOrAndroid) {
      return `http://vostmedia.localhost/${proto}/${cleanUrl}`;
    } else {
      return `vostmedia://${proto}/${cleanUrl}`;
    }
  }
  return url;
};
let mockTimePos = 0;
let mockPaused = false;
let mockVolume = 80;
let mockProxyUrl = "http://127.0.0.1:2080";
let mockSearchProvider = "animevost";

// Native Rust event listener routing
window.resolveIpc = (callbackId: string, success: boolean, data: any) => {
  if (callbacks[callbackId]) {
    callbacks[callbackId](success, data);
    delete callbacks[callbackId];
  }
};

function callNative<T>(action: string, payload: string = ""): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackId = Math.random().toString(36).substring(2, 11);
    callbacks[callbackId] = (success: boolean, data: any) => {
      if (success) resolve(data as T);
      else reject(data);
    };
    if (window.ipc) {
      window.ipc.postMessage(JSON.stringify({ callback_id: callbackId, action, payload }));
    } else {
      // Direct mock fallback for browser testing if window.ipc doesn't exist
      console.warn("Native bridge window.ipc is not available. Using mock fallback.");
      if (action === "fetch_catalog") {
        setTimeout(() => {
          resolve([
            { id: 1, title: "Власть книжного червя: Приёмная дочь лорда  1 серия", description: "Ascendance of a Bookworm: Part III - Episode 1", cover_image: "http://media.animetop.info/img/2147423374.jpg" },
            { id: 2, title: "Власть книжного червя: Приёмная дочь лорда  2 серия", description: "Ascendance of a Bookworm: Part III - Episode 2", cover_image: "http://media.animetop.info/img/1458104562.jpg" },
            { id: 3, title: "Власть книжного червя: Приёмная дочь лорда  3 серия", description: "Ascendance of a Bookworm: Part III - Episode 3", cover_image: "http://media.animetop.info/img/924786115.jpg" },
            { id: 4, title: "Власть книжного червя: Приёмная дочь лорда  4 серия", description: "Ascendance of a Bookworm: Part III - Episode 4", cover_image: "http://media.animetop.info/img/1281487242.jpg" }
          ] as unknown as T);
        }, 300);
      } else if (action === "play_stream") {
        setTimeout(() => {
          const titles: Record<string, string> = {
            "1": "Власть книжного червя: Приёмная дочь лорда  1 серия",
            "2": "Власть книжного червя: Приёмная дочь лорда  2 серия",
            "3": "Власть книжного червя: Приёмная дочь лорда  3 серия",
            "4": "Власть книжного червя: Приёмная дочь лорда  4 серия"
          };
          resolve({ title: titles[payload] || "Власть книжного червя: Приёмная дочь лорда  " + payload + " серия" } as unknown as T);
          
          // Set up mock updates
          mockTimePos = 0;
          mockPaused = false;
          if (simulatedPlaybackInterval) clearInterval(simulatedPlaybackInterval);
          simulatedPlaybackInterval = setInterval(() => {
            if (!mockPaused) {
              mockTimePos = Math.min(1200, mockTimePos + 1);
            }
            if (window.onPlaybackUpdate) {
              window.onPlaybackUpdate({
                time_pos: mockTimePos,
                duration: 1200,
                paused: mockPaused,
                volume: mockVolume
              });
            }
          }, 1000);
        }, 300);
      } else if (action === "media_pause") {
        mockPaused = true;
        resolve(undefined as unknown as T);
      } else if (action === "media_play") {
        mockPaused = false;
        resolve(undefined as unknown as T);
      } else if (action === "media_stop") {
        if (simulatedPlaybackInterval) {
          clearInterval(simulatedPlaybackInterval);
          simulatedPlaybackInterval = null;
        }
        resolve(undefined as unknown as T);
      } else if (action === "media_seek") {
        mockTimePos = parseFloat(payload) || 0;
        resolve(undefined as unknown as T);
      } else if (action === "media_volume") {
        mockVolume = parseFloat(payload) || 80;
        resolve(undefined as unknown as T);
      } else if (action === "set_anime4k") {
        resolve({ success: true } as unknown as T);
      } else if (action === "set_fullscreen") {
        resolve((payload === "true") as unknown as T);
      } else if (action === "import_animevost") {
        resolve(undefined as unknown as T);
      } else if (action === "get_settings") {
        resolve({ proxy_url: mockProxyUrl, search_provider: mockSearchProvider } as unknown as T);
      } else if (action === "save_settings") {
        const parsed = JSON.parse(payload);
        mockProxyUrl = parsed.proxy_url;
        mockSearchProvider = parsed.search_provider || "animevost";
        resolve({ success: true } as unknown as T);
      } else if (action === "get_history") {
        resolve([
          { id: 2938, title: "Власть книжного червя: Приёмная дочь лорда", description: "Ascendance of a Bookworm: Part III", cover_image: "http://media.animetop.info/img/2147423374.jpg" }
        ] as unknown as T);
      } else if (action === "search_animevost") {
        resolve([
          { id: 2938, title: "Власть книжного червя: Приёмная дочь лорда", description: "По запросу: " + payload, cover_image: "http://media.animetop.info/img/2147423374.jpg" }
        ] as unknown as T);
      } else if (action === "select_anime") {
        resolve({ success: true } as unknown as T);
      } else {
        resolve(undefined as unknown as T);
      }
    }
  });
}

type Anime4KModeType = 'off' | 'A' | 'B' | 'C';
type Anime4KQualityType = 'S' | 'M' | 'L' | 'VL' | 'UL';

export function App() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [titles, setTitles] = useState<AnimeTitle[]>([]);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    time_pos: 0,
    duration: 0,
    paused: true,
    volume: 80,
  });

  const [seekingValue, setSeekingValue] = useState<number | null>(null);
  const [vostId, setVostId] = useState("");
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);

  // Anime4K shader state
  const [anime4kMode, setAnime4kMode] = useState<Anime4KModeType>('off');
  const [anime4kQuality, setAnime4kQuality] = useState<Anime4KQualityType>('M');
  const [showAnime4kPanel, setShowAnime4kPanel] = useState(false);
  
  // Settings configurations
  const [showSettings, setShowSettings] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("http://127.0.0.1:2080");
  const [searchProvider, setSearchProvider] = useState("animevost");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    callNative<Anime[]>("fetch_catalog")
      .then(data => setAnimeList(data))
      .catch(err => setError("Failed to retrieve catalog: " + err));

    callNative<AnimeTitle[]>("get_history")
      .then(data => setTitles(data))
      .catch(err => setError("Failed to retrieve history: " + err));

    callNative<{ proxy_url: string, search_provider: string }>("get_settings")
      .then(config => {
        setProxyUrl(config.proxy_url);
        setSearchProvider(config.search_provider || "animevost");
      })
      .catch(err => console.error("Failed to load settings:", err));

    window.onPlaybackUpdate = (state) => {
      setPlaybackState(state);
    };

    return () => {
      window.onPlaybackUpdate = undefined;
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      callNative<AnimeTitle[]>("get_history")
        .then(data => setTitles(data))
        .catch(err => setError("Failed to retrieve history: " + err));
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeMedia) {
      document.body.classList.add('playback-active');
    } else {
      document.body.classList.remove('playback-active');
    }
  }, [activeMedia]);

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

  const playAnime = (id: number) => {
    callNative<StreamInfo>("play_stream", id.toString())
      .then(streamInfo => {
        setActiveMedia(streamInfo.title);
        setSeekingValue(null);
      })
      .catch(err => setError("Playback initialization failed: " + err));
  };

  const togglePlayback = () => {
    const nextPaused = !playbackState.paused;
    callNative<void>(nextPaused ? "media_pause" : "media_play")
      .then(() => {
        setPlaybackState(prev => ({ ...prev, paused: nextPaused }));
        resetControlsTimeout();
      })
      .catch(err => setError("Control command failed: " + err));
  };

  const stopAnime = () => {
    callNative<void>("media_stop")
      .then(() => {
        setActiveMedia(null);
        setSeekingValue(null);
        setShowDrawer(false);
        if (searchQuery.trim() === "") {
          callNative<AnimeTitle[]>("get_history")
            .then(data => setTitles(data))
            .catch(err => console.error("Failed to reload history:", err));
        }
      })
      .catch(err => setError("Stop command failed: " + err));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      callNative<boolean>("set_fullscreen", next.toString())
        .catch(err => console.error("Failed to toggle fullscreen", err));
      return next;
    });
  };

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
        const target = Math.max(0, playbackState.time_pos - 10);
        setPlaybackState(prev => ({ ...prev, time_pos: target }));
        callNative<void>("media_seek", target.toString())
          .catch(err => console.error(err));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const target = Math.min(playbackState.duration, playbackState.time_pos + 10);
        setPlaybackState(prev => ({ ...prev, time_pos: target }));
        callNative<void>("media_seek", target.toString())
          .catch(err => console.error(err));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMedia, isFullscreen, playbackState.time_pos, playbackState.duration]);

  const handleSeekChange = (e: any) => {
    const val = parseFloat(e.target.value);
    setSeekingValue(val);
  };

  const handleSeekCommit = (e: any) => {
    const val = parseFloat(e.target.value);
    setSeekingValue(null);
    callNative<void>("media_seek", val.toString())
      .catch(err => setError("Seek command failed: " + err));
  };

  const handleVolumeChange = (e: any) => {
    const val = parseFloat(e.target.value);
    setPlaybackState(prev => ({ ...prev, volume: val }));
    callNative<void>("media_volume", val.toString())
      .catch(err => setError("Volume command failed: " + err));
  };

  const skipSeconds = (amount: number) => {
    const current = seekingValue !== null ? seekingValue : playbackState.time_pos;
    const target = Math.max(0, Math.min(playbackState.duration, current + amount));
    callNative<void>("media_seek", target.toString())
      .catch(err => setError("Skip command failed: " + err));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    if (query.startsWith("http") && query.includes("jut.su")) {
      const dummyTitle = {
        id: -1,
        title: "Импорт с Jut.su",
        description: query,
        cover_image: ""
      };
      selectTitle(dummyTitle);
      return;
    }
    setImporting(true);
    setError(null);
    callNative<AnimeTitle[]>("search_animevost", query)
      .then(data => {
        setTitles(data);
      })
      .catch(err => {
        setError("Ошибка поиска: " + err);
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const selectTitle = (title: AnimeTitle) => {
    setImporting(true);
    setError(null);
    callNative<any>("select_anime", JSON.stringify(title))
      .then(() => {
        return callNative<Anime[]>("fetch_catalog");
      })
        .then(episodes => {
          setAnimeList(episodes);
          if (episodes.length > 0) {
            playAnime(episodes[0].id);
          } else {
            setError("Этот провайдер предоставляет только метаданные (поиск/описание) — видеопотоков нет. Используйте AnimeGO, Jut.su или AnimeVost для просмотра.");
          }
      })
      .catch(err => {
        setError("Ошибка при открытии аниме: " + err);
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const importPlaylist = () => {
    const val = vostId.trim();
    if (!val) {
      setError("Укажите числовой ID или URL");
      return;
    }
    
    const isUrl = val.startsWith("http");
    if (!isUrl) {
      const id = parseInt(val, 10);
      if (isNaN(id) || id <= 0) {
        setError("Укажите корректный числовой ID или URL");
        return;
      }
    }

    setImporting(true);
    setError(null);
    callNative<any>("import_animevost", val)
      .then(() => {
        setVostId("");
        return callNative<Anime[]>("fetch_catalog");
      })
      .then(data => {
        setAnimeList(data);
      })
      .catch(err => {
        setError("Ошибка импорта: " + err);
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const applyAnime4k = (mode: Anime4KModeType, quality: Anime4KQualityType) => {
    setAnime4kMode(mode);
    setAnime4kQuality(quality);
    callNative<void>('set_anime4k', JSON.stringify({ mode, quality }))
      .catch(err => console.error('Anime4K command failed:', err));
  };

  const saveConfig = () => {
    setError(null);
    callNative<any>("save_settings", JSON.stringify({ proxy_url: proxyUrl, search_provider: searchProvider }))
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

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
              onClick={stopAnime}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 hover:text-white transition-colors pointer-events-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <span className="text-lg font-bold text-white drop-shadow-md truncate">{activeMedia}</span>
          </div>

          {/* Clickable Viewport */}
          <div className="absolute inset-0 z-0 bg-transparent cursor-pointer pointer-events-auto" onClick={handleViewportClick} onDblClick={toggleFullscreen}></div>

          {/* Collapsible Right Drawer */}
          <div className={`fixed top-0 right-0 z-40 w-80 h-full bg-card border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ${showDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-violet-400">Список серий</h3>
              <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {animeList.map((anime) => {
                const isPlaying = anime.title === activeMedia;
                return (
                  <div
                    key={anime.id}
                    className={`flex gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${isPlaying ? 'bg-violet-600/10 border-violet-500 text-violet-400' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    onClick={() => playAnime(anime.id)}
                  >
                    <div 
                      className="w-20 h-12 bg-cover bg-center rounded bg-muted border border-white/5 shrink-0" 
                      style={anime.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(anime.cover_image)})` } : {}}
                    />
                    <div className="flex flex-col justify-center overflow-hidden">
                      <span className="text-xs font-semibold truncate text-white">{anime.title}</span>
                      {isPlaying && <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mt-1">Играет</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

                {/* Anime4K Button + Panel */}
                <div className="relative pointer-events-auto">
                  <button
                    id="anime4k-toggle"
                    onClick={() => setShowAnime4kPanel(p => !p)}
                    className={`flex items-center gap-1.5 h-9 rounded-full border px-3 text-xs font-bold transition-all ${
                      anime4kMode !== 'off'
                        ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/40'
                        : 'bg-zinc-900 border-white/10 text-white/60 hover:text-white hover:bg-zinc-800 hover:border-white/20'
                    }`}
                    title="Anime4K апскейлинг"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{anime4kMode === 'off' ? '4K' : `4K·${anime4kMode}·${anime4kQuality}`}</span>
                  </button>

                  {/* Anime4K Panel */}
                  {showAnime4kPanel && (
                    <div
                      id="anime4k-panel"
                      className="absolute bottom-12 right-0 z-50 w-64 rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-2xl p-4 space-y-4"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-400" />
                          <span className="text-sm font-bold text-white">Anime4K</span>
                        </div>
                        <button onClick={() => setShowAnime4kPanel(false)} className="text-white/40 hover:text-white transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Mode selector */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Режим</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['off', 'A', 'B', 'C'] as Anime4KModeType[]).map(m => (
                            <button
                              key={m}
                              id={`anime4k-mode-${m}`}
                              onClick={() => applyAnime4k(m, anime4kQuality)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                anime4kMode === m
                                  ? 'bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-600/50'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {m === 'off' ? 'Выкл' : `Mode ${m}`}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/30 leading-tight">
                          {anime4kMode === 'A' ? 'Restore → Upscale. Для BD-рипов без артефактов' :
                           anime4kMode === 'B' ? 'Soft Restore → Upscale. Для размытых контуров/aliasing' :
                           anime4kMode === 'C' ? 'Upscale+Denoise. Для качественного видео' :
                           'Шейдеры отключены — оригинальное разрешение'}
                        </p>
                      </div>

                      {/* Quality selector */}
                      <div className={`space-y-1.5 transition-opacity ${anime4kMode === 'off' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Качество GPU</p>
                        <div className="flex gap-1.5">
                          {(['S', 'M', 'L', 'VL', 'UL'] as Anime4KQualityType[]).map(q => (
                            <button
                              key={q}
                              id={`anime4k-quality-${q}`}
                              onClick={() => applyAnime4k(anime4kMode, q)}
                              className={`flex-1 py-1 rounded-full text-xs font-bold transition-all border ${
                                anime4kQuality === q && anime4kMode !== 'off'
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/30">
                          {anime4kQuality === 'S' ? 'Слабый GPU (GTX 960+)' :
                           anime4kQuality === 'M' ? 'Средний GPU (GTX 1060+)' :
                           anime4kQuality === 'L' ? 'Мощный GPU (RTX 2060+)' :
                           anime4kQuality === 'VL' ? 'Топовый GPU (RTX 3070+)' :
                           'Флагман (RTX 4080+)'}
                        </p>
                      </div>

                      {/* Shader files notice */}
                      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                        <p className="text-[10px] text-white/40 leading-relaxed">
                          📁 Шейдеры: <span className="text-white/60 font-mono">./shaders/*.glsl</span><br/>
                          <a
                            href="https://github.com/bloc97/Anime4K/releases"
                            className="text-violet-400 hover:text-violet-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >Скачать с GitHub ↗</a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

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
                onClick={() => selectTitle(title)}
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

          {/* Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
              <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div>
                  <h2 className="text-xl font-bold text-violet-400 mb-1 flex items-center gap-2">
                    <Settings className="h-5 w-5 animate-[spin_10s_linear_infinite]" />
                    Настройки
                  </h2>
                  <p className="text-xs text-muted-foreground">Глобальные настройки прокси и импорта плейлистов</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Глобальный Прокси URL</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/30"
                      placeholder="например, http://127.0.0.1:2080"
                      value={proxyUrl}
                      onInput={(e: any) => setProxyUrl(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Оставьте пустым для прямого подключения (без прокси)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Провайдер поиска</label>
                    <select
                      className="w-full bg-zinc-900 border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white"
                      value={searchProvider}
                      onChange={(e: any) => setSearchProvider(e.target.value)}
                    >
                      <option value="animevost">AnimeVost (Поиск по сайту)</option>
                      <option value="jutsu">Jut.su (Поиск по slug/URL)</option>
                      <option value="animego">AnimeGO (Поиск аниме + плеер Aniboom/CVH)</option>
                      <option value="shikimori">Shikimori (Метаданные / Обнаружение аниме)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">Какой сервис использовать для поиска на главном экране</p>
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Импорт с AnimeVost / Jut.su</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-grow bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/30"
                        placeholder="Введите ID новости или URL с jut.su..."
                        value={vostId}
                        onInput={(e: any) => setVostId(e.target.value)}
                        disabled={importing}
                      />
                      <button
                        className="bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
                        onClick={importPlaylist}
                        disabled={importing || !vostId.trim()}
                      >
                        {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Импорт"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="border border-border rounded-lg px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors text-white bg-transparent"
                  >
                    Закрыть
                  </button>
                  <button 
                    onClick={saveConfig}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow"
                  >
                    Сохранить настройки
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
