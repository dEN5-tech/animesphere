import { Settings, X, RefreshCw } from 'lucide-preact';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  proxyUrl: string;
  setProxyUrl: (val: string) => void;
  searchProvider: string;
  setSearchProvider: (val: string) => void;
  discordPresenceEnabled: boolean;
  setDiscordPresenceEnabled: (val: boolean) => void;
  discordClientId: string;
  setDiscordClientId: (val: string) => void;
  shikimoriClientId: string;
  setShikimoriClientId: (val: string) => void;
  shikimoriClientSecret: string;
  setShikimoriClientSecret: (val: string) => void;
  shikimoriAuthorized: boolean;
  shikimoriLoggingIn: boolean;
  loginShikimori: () => void;
  vostId: string;
  setVostId: (val: string) => void;
  importing: boolean;
  importPlaylist: () => void;
  saveConfig: () => void;
}

export function SettingsModal({
  showSettings, setShowSettings, proxyUrl, setProxyUrl, searchProvider, setSearchProvider,
  discordPresenceEnabled, setDiscordPresenceEnabled, discordClientId, setDiscordClientId,
  shikimoriClientId, setShikimoriClientId, shikimoriClientSecret, setShikimoriClientSecret,
  shikimoriAuthorized, shikimoriLoggingIn, loginShikimori,
  vostId, setVostId, importing, importPlaylist, saveConfig
}: SettingsModalProps) {
  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="bg-[#0D0E15]/95 border border-[#FF007F]/20 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/80 relative space-y-6 animate-in fade-in zoom-in duration-200 backdrop-blur-xl">
        <button
          onClick={() => setShowSettings(false)}
          className="absolute top-4 right-4 text-[#8E8E9F] hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-xl font-bold neon-gradient-text mb-1 flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#FF007F] animate-[spin_10s_linear_infinite]" />
            Настройки
          </h2>
          <p className="text-xs text-[#8E8E9F]">Глобальные настройки прокси и импорта плейлистов</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">Глобальный Прокси URL</label>
            <input
              type="text"
              className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
              placeholder="например, http://127.0.0.1:2080"
              value={proxyUrl}
              onInput={(e: any) => setProxyUrl(e.target.value)}
            />
            <p className="text-[10px] text-[#8E8E9F]">Оставьте пустым для прямого подключения (без прокси)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">Провайдер поиска</label>
            <select
              className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white transition-all"
              value={searchProvider}
              onChange={(e: any) => setSearchProvider(e.target.value)}
            >
              <option value="animevost" className="bg-[#0D0E15] text-white">AnimeVost (Поиск по сайту)</option>
              <option value="jutsu" className="bg-[#0D0E15] text-white">Jut.su (Поиск по slug/URL)</option>
              <option value="animego" className="bg-[#0D0E15] text-white">AnimeGO (Поиск аниме + плеер Aniboom/CVH)</option>
              <option value="shikimori" className="bg-[#0D0E15] text-white">Shikimori (Метаданные / Обнаружение аниме)</option>
              <option value="aniliberty" className="bg-[#0D0E15] text-white">AniLiberty (Поиск по API / aniliberty.top)</option>
              <option value="collaps" className="bg-[#0D0E15] text-white">Collaps (Поиск по API / HLS ~720p)</option>
              <option value="collaps-dash" className="bg-[#0D0E15] text-white">Collaps-DASH (Поиск по API / DASH ~1080p)</option>
            </select>
            <p className="text-[10px] text-[#8E8E9F]">Какой сервис использовать для поиска на главном экране</p>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-white/10">
            <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider flex items-center justify-between">
              Discord Rich Presence
              <input
                type="checkbox"
                className="rounded border-white/10 bg-[#161622] text-[#FF007F] focus:ring-[#FF007F]/50"
                checked={discordPresenceEnabled}
                onChange={(e: any) => setDiscordPresenceEnabled(e.target.checked)}
              />
            </label>
            <div className={`space-y-1.5 transition-all ${discordPresenceEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <input
                type="text"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="Application ID (по умолчанию: 925843...)"
                value={discordClientId}
                onInput={(e: any) => setDiscordClientId(e.target.value)}
              />
              <p className="text-[10px] text-[#8E8E9F]">Оставьте пустым для ID по умолчанию. Требуется запущенный клиент Discord.</p> 
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/10">
            <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">Интеграция Shikimori</label>
            <div className="space-y-1.5">
              <input
                type="text"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="Client ID"
                value={shikimoriClientId}
                onInput={(e: any) => setShikimoriClientId(e.target.value)}
              />
              <input
                type="password"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="Client Secret"
                value={shikimoriClientSecret}
                onInput={(e: any) => setShikimoriClientSecret(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#8E8E9F]">
                Статус:{" "}
                {shikimoriAuthorized ? (
                  <span className="text-[#00F0FF] font-semibold">Авторизован</span>
                ) : (
                  <span className="text-red-400 font-semibold">Не авторизован</span>
                )}
              </span>
              <button
                type="button"
                className="bg-[#FF007F] hover:bg-[#CC0060] text-white rounded-lg px-3 py-1 text-xs font-semibold transition-all shadow-lg shadow-[#FF007F]/20 active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                onClick={loginShikimori}
                disabled={shikimoriLoggingIn || !shikimoriClientId || !shikimoriClientSecret}
              >
                {shikimoriLoggingIn ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Вход...
                  </>
                ) : (
                  "Войти"
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-white/10">
            <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">Импорт с AnimeVost / Jut.su / AniLiberty</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-grow bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="ID новости, URL с jut.su или alias с aniliberty..."
                value={vostId}
                onInput={(e: any) => setVostId(e.target.value)}
                disabled={importing}
              />
              <button
                className="bg-[#FF007F] hover:bg-[#CC0060] text-white inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF007F]/20 active:scale-95"
                onClick={importPlaylist}
                disabled={importing || !vostId.trim()}
              >
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Импорт"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            onClick={() => setShowSettings(false)}
            className="border border-white/10 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/5 transition-colors text-white bg-transparent"
          >
            Закрыть
          </button>
          <button
            onClick={saveConfig}
            className="bg-[#FF007F] hover:bg-[#CC0060] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-lg shadow-[#FF007F]/20 active:scale-95"
          >
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
