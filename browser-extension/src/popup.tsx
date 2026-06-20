import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Search, Tv, ExternalLink, Globe, Compass } from 'lucide-preact';
import './index.css';

function Popup() {
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');
  const [currentTabTitle, setCurrentTabTitle] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSupportedSite, setIsSupportedSite] = useState<boolean>(false);

  useEffect(() => {
    // Query the current active browser tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs && tabs[0]) {
          const url = tabs[0].url || '';
          const title = tabs[0].title || '';
          setCurrentTabUrl(url);
          setCurrentTabTitle(title);

          const supportedHosts = ['shikimori.one', 'shikimori.me', 'jut.su', 'animego.org'];
          const hasMatch = supportedHosts.some(host => url.includes(host));
          setIsSupportedSite(hasMatch);
        }
      });
    }
  }, []);

  const handleOpenCurrentTab = () => {
    if (currentTabUrl) {
      const deepLink = `animesphere://play?url=${encodeURIComponent(currentTabUrl)}`;
      window.open(deepLink, '_self');
    }
  };

  const handleSearchSubmit = (e: Event) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const deepLink = `animesphere://search?q=${encodeURIComponent(searchQuery.trim())}`;
      window.open(deepLink, '_self');
    }
  };

  const handleOpenClient = () => {
    window.open('animesphere://', '_self');
  };

  return (
    <div className="w-[360px] min-h-[400px] bg-background text-white p-5 flex flex-col justify-between selection:bg-[#FF007F]/30 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-[#00F0FF] animate-pulse" />
          <h1 className="text-xl font-extrabold tracking-tight neon-text">
            AnimeSphere
          </h1>
        </div>
        <button
          onClick={handleOpenClient}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 hover:border-[#00F0FF]/30 bg-white/5 hover:bg-[#00F0FF]/10 text-xs font-semibold text-[#8E8E9F] hover:text-[#00F0FF] transition-all duration-200"
          title="Запустить приложение"
        >
          <span>Клиент</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-grow space-y-4">
        {/* Active Tab Helper */}
        {isSupportedSite ? (
          <div className="glass neon-border rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-2.5">
              <Tv className="h-5 w-5 text-[#FF007F] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF007F]">
                  Обнаружено аниме
                </span>
                <h2 className="text-sm font-bold leading-snug line-clamp-2">
                  {currentTabTitle || "Загрузка заголовка..."}
                </h2>
              </div>
            </div>
            
            <button
              onClick={handleOpenCurrentTab}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#FF007F] to-[#CC0060] text-sm font-bold text-white shadow-lg shadow-[#FF007F]/25 hover:shadow-[#FF007F]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Tv className="h-4 w-4" />
              <span>Смотреть в приложении</span>
            </button>
          </div>
        ) : (
          <div className="glass rounded-xl p-4 text-center space-y-2.5 border border-white/5">
            <Compass className="h-8 w-8 text-[#8E8E9F]/60 mx-auto" />
            <p className="text-xs text-[#8E8E9F] leading-relaxed max-w-[280px] mx-auto">
              Откройте страницу аниме на <span className="text-white font-semibold">Shikimori</span>, <span className="text-white font-semibold">Jut.su</span> или <span className="text-white font-semibold">AnimeGO</span> для быстрого перехода к просмотру.
            </p>
          </div>
        )}

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#8E8E9F] block px-1">
            Поиск аниме
          </label>
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4.5 w-4.5 text-[#8E8E9F]" />
            <input
              type="text"
              placeholder="Название аниме..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full bg-[#161622]/80 border border-white/10 focus:border-[#00F0FF]/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-[#8E8E9F] outline-none shadow-inner focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="w-full py-2.5 rounded-lg bg-white/5 disabled:bg-white/2 border border-white/10 hover:border-[#00F0FF]/30 text-sm font-bold text-[#8E8E9F] hover:text-white disabled:text-white/20 disabled:cursor-not-allowed hover:bg-[#00F0FF]/15 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            <span>Искать в AnimeSphere</span>
          </button>
        </form>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[10px] text-[#8E8E9F]/60 border-t border-white/5 pt-3 mt-4">
        AnimeSphere WebExtension &copy; 2026. Все права защищены.
      </div>
    </div>
  );
}

// Initial mounting
const root = document.getElementById('app');
if (root) {
  render(<Popup />, root);
}
