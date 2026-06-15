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
              <option value="aniliberty">AniLiberty (Поиск по API / aniliberty.top)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">Какой сервис использовать для поиска на главном экране</p>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-border">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Discord Rich Presence
              <input
                type="checkbox"
                className="rounded border-border bg-zinc-900 text-violet-600 focus:ring-violet-500"
                checked={discordPresenceEnabled}
                onChange={(e: any) => setDiscordPresenceEnabled(e.target.checked)}
              />
            </label>
            <div className={`space-y-1.5 transition-all ${discordPresenceEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <input
                type="text"
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/30"
                placeholder="Application ID (по умолчанию: 925843...)"
                value={discordClientId}
                onInput={(e: any) => setDiscordClientId(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Оставьте пустым для ID по умолчанию. Требуется запущенный клиент Discord.</p> 
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Интеграция Shikimori</label>
            <div className="space-y-1.5">
              <input
                type="text"
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/30"
                placeholder="Client ID"
                value={shikimoriClientId}
                onInput={(e: any) => setShikimoriClientId(e.target.value)}
              />
              <input
                type="password"
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/30"
                placeholder="Client Secret"
                value={shikimoriClientSecret}
                onInput={(e: any) => setShikimoriClientSecret(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">
                Статус:{" "}
                {shikimoriAuthorized ? (
                  <span className="text-green-400 font-semibold">Авторизован</span>
                ) : (
                  <span className="text-red-400 font-semibold">Не авторизован</span>
                )}
              </span>
              <button
                type="button"
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1 text-xs font-semibold transition-colors shadow disabled:opacity-50 inline-flex items-center gap-1.5"
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

          <div className="space-y-1.5 pt-4 border-t border-border">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Импорт с AnimeVost / Jut.su / AniLiberty</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-grow bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-white placeholder-white/30"
                placeholder="ID новости, URL с jut.su или alias с aniliberty..."
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
  );
}
