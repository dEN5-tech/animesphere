const callbacks: Record<string, (success: boolean, data: any) => void> = {};
export let simulatedPlaybackInterval: any = null;

export let mockTimePos = 0;
export let mockPaused = false;
export let mockVolume = 80;
export let mockProxyUrl = "http://127.0.0.1:2080";
export let mockSearchProvider = "animevost";

// Native Rust event listener routing
window.resolveIpc = (callbackId: string, success: boolean, data: any) => {
  if (callbacks[callbackId]) {
    callbacks[callbackId](success, data);
    delete callbacks[callbackId];
  }
};

export function callNative<T>(action: string, payload: string = ""): Promise<T> {
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
                volume: mockVolume,
                demuxer_cache_duration: Math.min(60, 1200 - mockTimePos)
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
        resolve({ 
            proxy_url: mockProxyUrl, 
            search_provider: mockSearchProvider,
            discord_presence_enabled: false,
            discord_client_id: ""
        } as unknown as T);
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
      } else if (action === "get_thumbnail") {
        resolve({ thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAAAI913AAAAMklEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8GY4QAAB65E5XgAAAABJRU5ErkJggg==" } as unknown as T);
      } else if (action === "shikimori_login") {
        setTimeout(() => {
          (window as any).mockShikimoriAuthorized = true;
          resolve({ success: true } as unknown as T);
        }, 1500);
      } else if (action === "shikimori_status") {
        const isAuth = !!(window as any).mockShikimoriAuthorized;
        resolve({
          authorized: isAuth,
          profile: isAuth ? {
            nickname: "ShikimoriUser",
            avatar: "https://shikimori.one/system/users/x160/206253.jpg",
            url: "https://shikimori.one/users/ShikimoriUser"
          } : null
        } as unknown as T);
      } else if (action === "shikimori_bookmarks") {
        resolve([
          {
            id: -1,
            title: "Волчица и пряности",
            description: "https://shikimori.one/animes/z20-ookami-to-koushinryou",
            cover_image: "http://media.animetop.info/img/2147423374.jpg",
            status_text: "Статус: Смотрю, серий: 4, оценка: 9/10",
            watch_status: "watching"
          },
          {
            id: -1,
            title: "Наруто: Ураганные хроники",
            description: "https://shikimori.one/animes/z20-naruto-shippuuden",
            cover_image: "http://media.animetop.info/img/1458104562.jpg",
            status_text: "Статус: В планах",
            watch_status: "planned"
          }
        ] as unknown as T);
      } else if (action === "open_browser") {
        console.log("Mock open browser:", payload);
        resolve({ success: true } as unknown as T);
      } else if (action === "search_all") {
        setTimeout(() => {
          resolve([
            {
              id: -1,
              title: "Волчица и пряности [AnimeGO]",
              description: "https://animego.org/anime/volchica-i-pryanosti-i41",
              cover_image: "http://media.animetop.info/img/2147423374.jpg",
              provider: "AnimeGO"
            },
            {
              id: -1,
              title: "Волчица и пряности (Jut.su)",
              description: "https://jut.su/ookami-to-koshinryou/",
              cover_image: "http://media.animetop.info/img/924786115.jpg",
              provider: "Jut.su"
            },
            {
              id: 2938,
              title: "Волчица и пряности 1 серия (AnimeVost)",
              description: "2938",
              cover_image: "http://media.animetop.info/img/1458104562.jpg",
              provider: "AnimeVost"
            }
          ] as unknown as T);
        }, 800);
      } else {
        resolve(undefined as unknown as T);
      }
    }
  });
}
