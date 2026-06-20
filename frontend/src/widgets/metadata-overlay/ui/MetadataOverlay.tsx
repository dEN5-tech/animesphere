import { ArrowLeft, Play, Tag } from 'lucide-preact';
import { useAtomValue } from 'jotai';
import { getProxiedImageUrl } from '../../../shared/lib/utils';
import { useLibrary } from '../../../features/library';
import { useAltSearch } from '../../../features/search';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as uiStore from '../../../entities/ui';

export function MetadataOverlay() {
  const selectedMetadata = useAtomValue(uiStore.selectedMetadata);
  const { selectTitleWithMetadata } = useLibrary();
  const { triggerAltSearch } = useAltSearch();

  if (!selectedMetadata) return null;

  const isTagPage = !!(selectedMetadata.genres?.some((g: string) => g.split('|')[0] === "BestSimilar Тег"));

  const getCategorizedRecommendations = (recs: any[]) => {
    if (!recs || recs.length === 0) return [];
    
    // If few recommendations, put in one default category
    if (recs.length <= 5) {
      return [{
        title: "Рекомендуем к просмотру",
        description: "Подобрано на основе сходства сюжета и жанров",
        items: recs
      }];
    }
    
    const categories = [];
    
    // Category 1: Похожая атмосфера
    categories.push({
      title: "Похожая атмосфера",
      description: "Тайтлы с близким настроением и повествованием",
      items: recs.slice(0, Math.ceil(recs.length / 3))
    });
    
    // Category 2: Совпадение по жанрам
    categories.push({
      title: "Совпадение по жанрам",
      description: "Схожий жанровый микс и тематика",
      items: recs.slice(Math.ceil(recs.length / 3), Math.ceil(2 * recs.length / 3))
    });
    
    // Category 3: Пользователи также смотрят
    categories.push({
      title: "Пользователи также смотрят",
      description: "Популярные альтернативы от зрителей со схожими вкусами",
      items: recs.slice(Math.ceil(2 * recs.length / 3))
    });
    
    return categories.filter(c => c.items.length > 0);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#080810]/95 backdrop-blur-xl flex flex-col pointer-events-auto overflow-y-auto animate-in fade-in duration-300 text-left">
      {/* Header / Top Bar */}
      <div className="sticky top-0 z-10 bg-[#080810]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => { jotaiStore.set(uiStore.selectedMetadata, null); }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0D0E15] px-4 py-2 text-sm font-bold text-white hover:bg-[#FF007F] hover:border-[#FF007F] hover:shadow-[0_0_15px_rgba(255,0,127,0.4)] transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <div className="text-right">
          <span className="text-xs text-[#8E8E9F] block">Провайдер метаданных</span>
          <span className="text-xs font-bold text-[#FF007F] uppercase tracking-wider">
            Shikimori + BestSimilar
          </span>
        </div>
      </div>

      {/* Content Box */}
      <div className="max-w-5xl mx-auto px-6 py-10 w-full flex-grow flex flex-col gap-10">
        {/* Upper Split View */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Column: Cover & Action Button */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#161622]/40">
              {selectedMetadata.cover_image ? (
                <img 
                  src={getProxiedImageUrl(selectedMetadata.cover_image)} 
                  alt={selectedMetadata.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                  {isTagPage ? (
                    <div className="text-center space-y-2">
                      <Tag className="h-12 w-12 text-[#00F0FF]/30 mx-auto animate-pulse" />
                      <span className="text-xs text-[#8E8E9F] block">Тег / Категория</span>
                    </div>
                  ) : "Нет обложки"}
                </div>
              )}
            </div>

            {!isTagPage && (
              <button
                onClick={() => {
                  triggerAltSearch(selectedMetadata.title);
                }}
                className="w-full bg-gradient-to-r from-[#FF007F] to-[#CC0060] hover:scale-[1.02] text-white rounded-xl py-3.5 text-sm font-extrabold transition-all shadow-lg shadow-[#FF007F]/30 active:scale-95 flex items-center justify-center gap-2 pointer-events-auto"
              >
                <Play className="h-4 w-4 fill-current" />
                Смотреть / Найти видео
              </button>
            )}
          </div>

          {/* Right Column: Title & Attributes */}
          <div className="flex-grow space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white leading-tight">
                {selectedMetadata.title}
              </h2>
              {selectedMetadata.original_title && (
                <p className="text-sm text-[#8E8E9F] font-medium font-mono">
                  {selectedMetadata.original_title}
                </p>
              )}
            </div>

            {/* Metadata tags */}
            <div className="flex flex-wrap gap-2 items-center">
              {selectedMetadata.years && selectedMetadata.years.map((year: string) => (
                <span key={year} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white">
                  {year} год
                </span>
              ))}
              {selectedMetadata.age_rating && (
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-rose-400">
                  {selectedMetadata.age_rating}
                </span>
              )}
            </div>

            {/* Genres & Tags */}
            {selectedMetadata.genres && selectedMetadata.genres.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#8E8E9F] uppercase tracking-wider block">Жанры и теги</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMetadata.genres.map((genre: string) => {
                    const parts = genre.split('|');
                    const label = parts[0];
                    const url = parts[1];

                    if (url) {
                      return (
                        <button
                          key={genre}
                          onClick={() => {
                            const recTitle = {
                              id: url,
                              title: label.replace(/^[🎨📖🌍]\s*/, ''),
                              description: url,
                              cover_image: "",
                            } as any;
                            selectTitleWithMetadata(recTitle);
                          }}
                          className="px-3 py-1 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/15 border border-[#00F0FF]/25 hover:border-[#00F0FF]/50 rounded-full text-xs font-medium text-[#00F0FF] transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          {label}
                        </button>
                      );
                    }

                    return (
                      <span key={genre} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-[#E2E2E9]">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#8E8E9F] uppercase tracking-wider block">Синопсис</span>
              <p className="text-sm text-[#E2E2E9] leading-relaxed whitespace-pre-line bg-[#161622]/20 border border-white/5 rounded-2xl p-5">
                {selectedMetadata.description}
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="space-y-8 border-t border-white/5 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {isTagPage ? `Каталог по тегу: ${selectedMetadata.title}` : "Похожие аниме и рекомендации"}
              </h3>
              <p className="text-xs text-[#8E8E9F] mt-0.5">
                {isTagPage 
                  ? "Тайтлы, найденные в данной категории на BestSimilar" 
                  : "Подобрано на основе анализа сюжета и жанров с помощью BestSimilar"}
              </p>
            </div>
          </div>

          {selectedMetadata.recommendations && selectedMetadata.recommendations.length > 0 ? (
            <div className="space-y-8">
              {getCategorizedRecommendations(selectedMetadata.recommendations).map((category, catIdx) => (
                <div key={catIdx} className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-1 bg-[#FF007F] h-3.5 rounded-full inline-block" />
                      {category.title}
                    </h4>
                    <p className="text-[11px] text-[#8E8E9F] mt-0.5">{category.description}</p>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto pb-4 pt-1 pr-1 scroll-smooth">
                    {category.items.map((rec: any, idx: number) => {
                      const match = rec.name.match(/(.+) \[Похоже на (.+)\]/);
                      const cleanTitle = match ? match[1] : rec.name;
                      const similarity = match ? match[2] : "90%";
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const recTitle = {
                              id: rec.url,
                              title: cleanTitle,
                              description: rec.url,
                              cover_image: rec.preview_image || "",
                            } as any;
                            selectTitleWithMetadata(recTitle);
                          }}
                          className="group flex flex-col justify-between p-4 rounded-2xl border border-white/10 bg-[#161622]/40 hover:border-[#FF007F]/40 hover:bg-[#FF007F]/5 cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,0,127,0.1)] relative overflow-hidden min-w-[260px] w-[260px] shrink-0"
                        >
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-[#FF007F]/10 text-[#FF007F] border border-[#FF007F]/25 uppercase shrink-0">
                              {similarity} совпадение
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-white group-hover:text-[#FF007F] transition-colors line-clamp-2 leading-snug">
                            {cleanTitle}
                          </h4>
                          
                          <div className="mt-4 flex items-center text-[10px] text-[#00F0FF] font-bold opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            Смотреть детали
                            <ArrowLeft className="h-3 w-3 rotate-180" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 rounded-2xl border border-white/5 bg-[#161622]/10">
              <span className="text-sm text-[#8E8E9F]">Рекомендаций не найдено</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
