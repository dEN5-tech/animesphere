export let simulatedPlaybackInterval: any = null;
export let mockTimePos = 0;
export let mockPaused = false;
export let mockVolume = 80;
export let mockProxyUrl = "http://127.0.0.1:2080";
export let mockSearchProvider = "animevost";

export type MockHandler = (payload: string) => Promise<any>;

export const mockHandlers: Record<string, MockHandler> = {
  fetch_catalog: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, title: "Власть книжного червя: Приёмная дочь лорда  1 серия", description: "Ascendance of a Bookworm: Part III - Episode 1", cover_image: "http://media.animetop.info/img/2147423374.jpg" },
          { id: 2, title: "Власть книжного червя: Приёмная дочь лорда  2 серия", description: "Ascendance of a Bookworm: Part III - Episode 2", cover_image: "http://media.animetop.info/img/1458104562.jpg" },
          { id: 3, title: "Власть книжного червя: Приёмная дочь лорда  3 серия", description: "Ascendance of a Bookworm: Part III - Episode 3", cover_image: "http://media.animetop.info/img/924786115.jpg" },
          { id: 4, title: "Власть книжного червя: Приёмная дочь лорда  4 серия", description: "Ascendance of a Bookworm: Part III - Episode 4", cover_image: "http://media.animetop.info/img/1281487242.jpg" }
        ]);
      }, 300);
    });
  },

  play_stream: async (payload: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const titles: Record<string, string> = {
          "1": "Власть книжного червя: Приёмная дочь лорда  1 серия",
          "2": "Власть книжного червя: Приёмная дочь лорда  2 серия",
          "3": "Власть книжного червя: Приёмная дочь лорда  3 серия",
          "4": "Власть книжного червя: Приёмная дочь лорда  4 серия"
        };
        resolve({ title: titles[payload] || "Власть книжного червя: Приёмная дочь лорда  " + payload + " серия" });

        mockTimePos = 0;
        mockPaused = false;
        if (simulatedPlaybackInterval) {
          clearInterval(simulatedPlaybackInterval);
        }
        simulatedPlaybackInterval = setInterval(() => {
          if (!mockPaused) {
            mockTimePos = Math.min(1200, mockTimePos + 1);
          }
          if (window.onPlaybackUpdate) {
            window.onPlaybackUpdate({
              time_pos: mockTimePos,
              duration: 1200,
              paused: mockPaused,
              volume: mockVolume,
              demuxer_cache_duration: Math.min(60, 1200 - mockTimePos)
            });
          }
        }, 1000);
      }, 300);
    });
  },

  media_pause: async () => { mockPaused = true; return undefined; },
  media_play: async () => { mockPaused = false; return undefined; },

  media_stop: async () => {
    if (simulatedPlaybackInterval) {
      clearInterval(simulatedPlaybackInterval);
      simulatedPlaybackInterval = null;
    }
    return undefined;
  },

  media_seek: async (payload: string) => { mockTimePos = parseFloat(payload) || 0; return undefined; },
  media_volume: async (payload: string) => { mockVolume = parseFloat(payload) || 80; return undefined; },
  set_anime4k: async () => { return { success: true }; },
  set_fullscreen: async (payload: string) => { return payload === "true"; },
  import_animevost: async () => { return undefined; },
  set_quality: async () => { return undefined; },

  get_settings: async () => ({
    proxy_url: mockProxyUrl,
    search_provider: mockSearchProvider,
    discord_presence_enabled: false,
    discord_client_id: ""
  }),

  save_settings: async (payload: string) => {
    const parsed = JSON.parse(payload);
    mockProxyUrl = parsed.proxy_url;
    mockSearchProvider = parsed.search_provider || "animevost";
    return { success: true };
  },

  get_history: async () => [
    { id: 2938, title: "Власть книжного червя: Приёмная дочь лорда", description: "Ascendance of a Bookworm: Part III", cover_image: "http://media.animetop.info/img/2147423374.jpg" }
  ],

  search_animevost: async (payload: string) => {
    const desc = mockSearchProvider === "collaps" ? "collaps://movie/2938"
               : mockSearchProvider === "collaps-dash" ? "collaps-dash://movie/2938"
               : mockSearchProvider === "aniliberty" ? "https://aniliberty.top/release/naruto"
               : mockSearchProvider === "jutsu" ? "https://jut.su/naruto"
               : mockSearchProvider === "animego" ? "https://animego.org/anime/naruto"
               : "По запросу: " + payload;
    return [
      { id: mockSearchProvider.startsWith("collaps") ? -1 : 2938, title: "Власть книжного червя: Приёмная дочь лорда", description: desc, cover_image: "http://media.animetop.info/img/2147423374.jpg" }
    ];
  },

  select_anime: async () => ({ success: true }),
  get_thumbnail: async () => ({ thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAAAI913AAAAMklEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8GY4QAAB65E5XgAAAABJRU5ErkJggg==" }),

  shikimori_login: async () => new Promise((resolve) => {
    setTimeout(() => { (window as any).mockShikimoriAuthorized = true; resolve({ success: true }); }, 1500);
  }),

  shikimori_status: async () => {
    const isAuth = !!(window as any).mockShikimoriAuthorized;
    return {
      authorized: isAuth,
      profile: isAuth ? { nickname: "ShikimoriUser", avatar: "https://shikimori.one/system/users/x160/206253.jpg", url: "https://shikimori.one/users/ShikimoriUser" } : null
    };
  },

  shikimori_bookmarks: async () => [
    { id: -1, title: "Волчица и пряности", description: "https://shikimori.one/animes/z20-ookami-to-koushinryou", cover_image: "http://media.animetop.info/img/2147423374.jpg", status_text: "Статус: Смотрю, серий: 4, оценка: 9/10", watch_status: "watching" },
    { id: -1, title: "Наруто: Ураганные хроники", description: "https://shikimori.one/animes/z20-naruto-shippuuden", cover_image: "http://media.animetop.info/img/1458104562.jpg", status_text: "Статус: В планах", watch_status: "planned" }
  ],

  shikimori_friends: async () => [],
  shikimori_friend_bookmarks: async () => [],

  open_browser: async (payload: string) => { console.log("Mock open browser:", payload); return { success: true }; },

  search_all: async () => new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: -1, title: "Волчица и пряности [AnimeGO]", description: "https://animego.org/anime/volchica-i-pryanosti-i41", cover_image: "http://media.animetop.info/img/2147423374.jpg", provider: "AnimeGO" },
        { id: -1, title: "Волчица и пряности (Jut.su)", description: "https://jut.su/ookami-to-koshinryou/", cover_image: "http://media.animetop.info/img/924786115.jpg", provider: "Jut.su" },
        { id: 2938, title: "Волчица и пряности 1 серия (AnimeVost)", description: "2938", cover_image: "http://media.animetop.info/img/1458104562.jpg", provider: "AnimeVost" }
      ]);
    }, 800);
  }),

  save_resume: async (payload: string) => {
    try { localStorage.setItem("animesphere_resume", payload); } catch (_) {}
    return { success: true };
  },

  get_resume: async () => {
    try { const raw = localStorage.getItem("animesphere_resume"); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  },

  clear_resume: async () => { try { localStorage.removeItem("animesphere_resume"); } catch (_) {} return { success: true }; },

  get_logs: async () => [
    "[INFO] System initialization started...",
    "[INFO] Neon Kernel v2.4 initialized successfully.",
    "[WARN] Shikimori authorization token not found. Continuing as guest.",
    "[INFO] Local gRPC server listening on 127.0.0.1:50051",
    "[INFO] Webview renderer loaded and connected to backend.",
    "[Rust IPC] mock log: anime database catalog parsed with 4 local entries.",
    "[MPV LOG] [info] mpv: mpv video player backend initialized (mock mode).",
    "[INFO] AnimeSphere is ready. Welcome!"
  ],

  clear_logs: async () => ({ success: true }),
};
