import { useState } from 'preact/hooks';
import { Settings, RefreshCw, Check, AlertCircle } from 'lucide-preact';
import { useSettings } from '../model/useSettings';
import { useLibrary } from '../../library/model/useLibrary';

export function SettingsTab() {
  const {
    proxyUrl, setProxyUrl, searchProvider, setSearchProvider,
    discordPresenceEnabled, setDiscordPresenceEnabled, discordClientId, setDiscordClientId,
    shikimoriClientId, setShikimoriClientId, shikimoriClientSecret, setShikimoriClientSecret,
    shikimoriAuthorized, shikimoriLoggingIn, loginShikimori, saveConfig,
    syncServerUrl, setSyncServerUrl
  } = useSettings();

  const { vostId, setVostId, importing, importPlaylist } = useLibrary();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await saveConfig();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || String(err) || "Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#FF007F] animate-[spin_12s_linear_infinite]" />
          Настройки системы
        </h3>
        <p className="text-xs text-[#8E8E9F] mt-1">
          Конфигурация прокси, параметров поиска, Discord Rich Presence и Shikimori.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: GENERAL SETTINGS */}
        <div className="p-6 rounded-2xl border border-white/5 bg-[#161622]/40 backdrop-blur-xl shadow-lg relative overflow-hidden space-y-4">
          <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wider text-[#FF007F]">
            Основные
          </h4>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                Глобальный Прокси URL
              </label>
              <input
                type="text"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="например, http://127.0.0.1:2080"
                value={proxyUrl}
                onInput={(e: any) => setProxyUrl(e.target.value)}
              />
              <p className="text-[10px] text-[#8E8E9F]">
                Оставьте пустым для прямого подключения (без прокси)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                Сервер совместного просмотра (WebSocket)
              </label>
              <input
                type="text"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="wss://animesphere-sync.dEN5.workers.dev"
                value={syncServerUrl}
                onInput={(e: any) => setSyncServerUrl(e.target.value)}
              />
              <p className="text-[10px] text-[#8E8E9F]">
                Адрес WebSocket-сигнализатора для функции "Watch Together"
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                Провайдер поиска
              </label>
              <select
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white transition-all cursor-pointer"
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
                <option value="kodik" className="bg-[#0D0E15] text-white">Kodik (Поиск по API / HLS ~720p)</option>
                <option value="bestsimilar" className="bg-[#0D0E15] text-white">BestSimilar (Рекомендации фильмов и аниме)</option>
              </select>
              <p className="text-[10px] text-[#8E8E9F]">
                Какой сервис использовать для поиска на главном экране
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: DISCORD RICH PRESENCE */}
        <div className="p-6 rounded-2xl border border-white/5 bg-[#161622]/40 backdrop-blur-xl shadow-lg relative overflow-hidden space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wider text-[#FF007F] flex items-center justify-between">
              Discord Presence
              <input
                type="checkbox"
                className="rounded border-white/10 bg-[#161622] text-[#FF007F] focus:ring-[#FF007F]/50 w-4 h-4 cursor-pointer"
                checked={discordPresenceEnabled}
                onChange={(e: any) => setDiscordPresenceEnabled(e.target.checked)}
              />
            </h4>

            <div className={`space-y-4 pt-2 transition-all duration-300 ${discordPresenceEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                  Application ID
                </label>
                <input
                  type="text"
                  className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                  placeholder="Application ID (по умолчанию: 925843...)"
                  value={discordClientId}
                  onInput={(e: any) => setDiscordClientId(e.target.value)}
                />
                <p className="text-[10px] text-[#8E8E9F]">
                  Оставьте пустым для ID по умолчанию. Требуется запущенный клиент Discord.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#8E8E9F] mt-auto">
            Отображает просматриваемое аниме и серию в вашем профиле Discord в реальном времени.
          </div>
        </div>

        {/* CARD 3: SHIKIMORI INTEGRATION */}
        <div className="p-6 rounded-2xl border border-white/5 bg-[#161622]/40 backdrop-blur-xl shadow-lg relative overflow-hidden space-y-4">
          <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wider text-[#FF007F]">
            Интеграция Shikimori
          </h4>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">Client ID</label>
              <input
                type="text"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="Client ID"
                value={shikimoriClientId}
                onInput={(e: any) => setShikimoriClientId(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">Client Secret</label>
              <input
                type="password"
                className="w-full bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                placeholder="Client Secret"
                value={shikimoriClientSecret}
                onInput={(e: any) => setShikimoriClientSecret(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
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
                className="bg-[#FF007F] hover:bg-[#CC0060] text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all shadow-lg shadow-[#FF007F]/25 active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
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
        </div>

        {/* CARD 4: PLAYLIST IMPORT */}
        <div className="p-6 rounded-2xl border border-white/5 bg-[#161622]/40 backdrop-blur-xl shadow-lg relative overflow-hidden space-y-4">
          <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wider text-[#FF007F]">
            Импорт с AnimeVost / Jut.su / AniLiberty
          </h4>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E9F] uppercase tracking-wider">
                Входные данные для импорта
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-grow bg-[#161622]/60 border border-white/10 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF007F]/50 focus:border-[#FF007F]/50 text-white placeholder-white/20 transition-all"
                  placeholder="ID новости, URL с jut.su или alias..."
                  value={vostId}
                  onInput={(e: any) => setVostId(e.target.value)}
                  disabled={importing}
                />
                <button
                  className="bg-[#FF007F] hover:bg-[#CC0060] text-white inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF007F]/25 active:scale-95"
                  onClick={importPlaylist}
                  disabled={importing || !vostId.trim()}
                >
                  {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Импорт"}
                </button>
              </div>
              <p className="text-[10px] text-[#8E8E9F]">
                Введите ID новости AnimeVost, полный URL серии Jut.su или alias AniLiberty.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE CONTROLS & STATUS BAR */}
      <div className="p-4 rounded-2xl border border-white/5 bg-[#0D0E15]/80 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold animate-pulse">
              <Check className="h-4 w-4" />
              Настройки успешно сохранены!
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-1.5 text-rose-500 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </div>
          )}
          {!saveSuccess && !saveError && (
            <span className="text-xs text-[#8E8E9F]">
              Не забудьте сохранить изменения после изменения настроек.
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#FF007F] to-[#CC0060] hover:scale-[1.02] text-white rounded-xl px-6 py-2.5 text-sm font-bold transition-all shadow-lg shadow-[#FF007F]/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            "Сохранить настройки"
          )}
        </button>
      </div>
    </div>
  );
}
