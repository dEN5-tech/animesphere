import { useState } from 'preact/hooks';
import { Search, X, ChevronDown } from 'lucide-preact';
import { getProxiedImageUrl } from '../../../shared/lib/utils';
import { useAltSearch } from '../model/useSearch';
import { useLibrary } from '../../library/model/useLibrary';

export function AltSearchOverlay() {
  const {
    showAltSearch,
    setShowAltSearch,
    altSearchTitle,
    isLoadingAltSearch,
    altSearchResults
  } = useAltSearch();

  const { selectTitleWithMetadata } = useLibrary();
  const [showPartial, setShowPartial] = useState(false);

  if (!showAltSearch) return null;

  // Helper to determine exact title match
  const isExactMatch = (itemTitle: string, query: string) => {
    const cleanQuery = query.toLowerCase().trim();
    const cleanTitle = itemTitle.toLowerCase().trim();
    if (cleanTitle === cleanQuery) return true;
    
    // Also split by common delimiters to check component titles
    const parts = itemTitle.split(/[/|-]/).map(p => p.toLowerCase().trim());
    return parts.includes(cleanQuery);
  };

  const exactMatches = altSearchResults ? altSearchResults.filter(item => isExactMatch(item.title, altSearchTitle)) : [];
  const partialMatches = altSearchResults ? altSearchResults.filter(item => !isExactMatch(item.title, altSearchTitle)) : [];
  
  const isExpanded = showPartial || exactMatches.length === 0;

  const renderItem = (item: any, idx: number) => (
    <div
      key={idx}
      onClick={() => {
        setShowAltSearch(false);
        selectTitleWithMetadata(item);
      }}
      className="group flex gap-3 p-3 rounded-xl border border-white/10 bg-[#161622]/60 hover:border-[#FF007F]/40 hover:bg-[#FF007F]/5 cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,0,127,0.15)]"
    >
      <div
        className="w-16 h-24 rounded-lg bg-cover bg-center shrink-0 border border-white/5"
        style={item.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(item.cover_image)})` } : {}}
      />
      <div className="flex flex-col justify-between overflow-hidden py-1">
        <div>
          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-[#FF007F]/10 text-[#FF007F] border border-[#FF007F]/25 mb-1.5 uppercase">
            {item.provider}
          </span>
          <h4 className="text-sm font-bold text-white group-hover:text-[#FF007F] transition-colors line-clamp-2 leading-snug">
            {item.title}
          </h4>
        </div>
        <p className="text-[10px] text-[#8E8E9F] truncate mt-1">
          {item.description.startsWith("http") ? "Перейти к просмотру" : item.description}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="bg-[#0D0E15]/95 border border-[#FF007F]/20 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/80 space-y-4 animate-in fade-in zoom-in duration-200 backdrop-blur-xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-[#FF007F]" />
              Поиск плеера для аниме
            </h3>
            <p className="text-xs text-[#8E8E9F] mt-0.5">
              Ищем по провайдерам для: <span className="text-[#00F0FF] font-semibold">{altSearchTitle}</span>
            </p>
          </div>
          <button
            onClick={() => setShowAltSearch(false)}
            className="text-[#8E8E9F] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto space-y-4 pr-1">
          {isLoadingAltSearch ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-[#FF007F] border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-1.5 border-4 border-[#00F0FF] border-b-transparent rounded-full animate-[spin_1.2s_linear_infinite_reverse]" />
              </div>
              <p className="text-sm text-[#8E8E9F] font-medium tracking-wide animate-pulse text-center">
                Опрашиваем AnimeGO, Jut.su, AnimeVost, AniLiberty, Collaps...
              </p>
            </div>
          ) : altSearchResults && altSearchResults.length > 0 ? (
            <div className="space-y-4">
              {/* Exact Matches */}
              {exactMatches.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#FF007F] uppercase tracking-wider block">Точные совпадения</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {exactMatches.map((item, idx) => renderItem(item, idx))}
                  </div>
                </div>
              )}

              {/* Partial Matches Accordion */}
              {partialMatches.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPartial(!showPartial)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-[#161622]/40 hover:bg-[#FF007F]/5 hover:border-[#FF007F]/25 text-xs text-[#8E8E9F] hover:text-white font-bold transition-all duration-200 active:scale-[0.99] select-none"
                  >
                    <span className="flex items-center gap-2">
                      <span>Возможно, вам также подойдет</span>
                      <span className="px-1.5 py-0.5 bg-white/5 rounded-md text-[9px] font-mono font-bold text-[#00F0FF]">
                        {partialMatches.length}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-[#8E8E9F] transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {partialMatches.map((item, idx) => renderItem(item, idx))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <Search className="h-8 w-8 text-[#FF007F]/40 mx-auto animate-pulse" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Ни одного совпадения не найдено</p>
                <p className="text-xs text-[#8E8E9F] max-w-sm mx-auto">
                  Провайдеры не вернули видеопотоков. Попробуйте изменить поисковый запрос или выбрать другой источник.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-white/5">
          <button
            onClick={() => setShowAltSearch(false)}
            className="px-4 py-2 bg-[#FF007F] hover:bg-[#CC0060] text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-[#FF007F]/20 hover:scale-105"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
