import { useState, useEffect, useRef } from 'preact/hooks';
import { useAtomValue } from 'jotai';
import { AnimeCard } from '../../../shared/ui/AnimeCard';
import { useLibrary } from '../../library/model/useLibrary';
import { useAltSearch } from '../model/useSearch';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as settingsStore from '../../settings/model/store';

export function SearchTab() {
  const {
    searchQuery,
    setSearchQuery,
    handleSearch,
    importing,
    titles,
    isMetadataTitle,
    selectTitleWithMetadata
  } = useLibrary();

  const { triggerAltSearch } = useAltSearch();
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchProvider = useAtomValue(settingsStore.searchProvider);

  const providerNames: Record<string, string> = {
    animevost: "AnimeVost",
    jutsu: "Jut.su",
    animego: "AnimeGO",
    shikimori: "Shikimori",
    aniliberty: "AniLiberty",
    collaps: "Collaps",
    "collaps-dash": "Collaps-DASH",
    kodik: "Kodik",
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Cluster */}
      <section className="mb-8 flex justify-center relative z-40">
        <div className="glass-panel rounded-full px-6 py-3 flex items-center gap-4 w-full max-w-2xl shadow-[0_0_30px_rgba(0,240,255,0.1)] border-[#00F0FF]/30">
          <div 
            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
            className="flex items-center gap-2 pr-4 border-r border-[#2A2A3C]/30 group cursor-pointer relative shrink-0"
          >
            <span className="text-[11px] font-mono font-medium text-[#00F0FF] tracking-wider">Provider</span>
            <span className="text-sm font-bold text-[#fbdae1]">{providerNames[searchProvider] || "AnimeVost"}</span>
            <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">expand_more</span>
            
            {showProviderDropdown && (
              <div className="absolute top-full mt-3 left-0 w-48 bg-[#161622] border border-[#FF007F]/20 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                {Object.entries(providerNames).map(([key, name]) => (
                  <div
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      jotaiStore.set(settingsStore.searchProvider, key);
                      setShowProviderDropdown(false);
                    }}
                    className={`px-4 py-2 text-xs font-semibold hover:bg-[#FF007F]/20 hover:text-white transition-colors cursor-pointer ${searchProvider === key ? 'text-[#FF007F]' : 'text-[#fbdae1]'}`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <span className="material-symbols-outlined text-[#e5bcc5]">search</span>
          
          <input
            ref={inputRef}
            type="text"
            className="bg-transparent border-none focus:ring-0 text-sm text-white w-full placeholder-[#fbdae1]/40 focus:outline-none"
            placeholder="Search the manifest..."
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          
          <div className="flex gap-2 shrink-0">
            <kbd className="px-2 py-1 bg-[#1f0e13] rounded text-[10px] font-mono text-[#e5bcc5]/60 border border-[#2A2A3C]/30">CTRL</kbd>
            <kbd className="px-2 py-1 bg-[#1f0e13] rounded text-[10px] font-mono text-[#e5bcc5]/60 border border-[#2A2A3C]/30">K</kbd>
          </div>
        </div>
      </section>

      {/* Search Results Grid */}
      {importing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-[#FF007F] border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-1.5 border-4 border-[#00F0FF] border-b-transparent rounded-full animate-[spin_1.2s_linear_infinite_reverse]" />
          </div>
          <p className="text-sm text-[#8E8E9F] font-medium tracking-wide animate-pulse">Ищем варианты по вашему запросу...</p>
        </div>
      ) : titles && titles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {titles.map((title, idx) => {
            const isMetadata = isMetadataTitle(title);
            return (
              <AnimeCard
                key={`${title.description || title.id}-${idx}`}
                title={title.title}
                coverImage={title.cover_image}
                description={title.description}
                isMetadata={isMetadata}
                onSelect={() => selectTitleWithMetadata(title)}
                onFindVideo={() => triggerAltSearch(title.title)}
              />
            );
          })}
        </div>
      ) : (
        <div className="relative p-12 rounded-2xl border border-[#FF007F]/10 bg-[#161622]/30 backdrop-blur-xl text-center space-y-3 shadow-lg overflow-hidden cyber-grid">
          <span className="material-symbols-outlined text-4xl text-[#FF007F]/40 mx-auto neon-pulse">search</span>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Поиск аниме</h3>
            <p className="text-xs text-[#8E8E9F] max-w-xs mx-auto">Введите название сериала в поисковую строку выше, чтобы начать сканирование каталогов.</p>
          </div>
        </div>
      )}
    </div>
  );
}
