import { Bookmark } from 'lucide-preact';
import { AnimeCard } from '../../../shared/ui/AnimeCard';
import { useLibrary } from '../model/useLibrary';
import { useAltSearch } from '../../search/model/useSearch';

export function BookmarksTab() {
  const {
    shikimoriBookmarks,
    isLoadingBookmarks,
    loadBookmarks,
    activeBookmarkFilter,
    setActiveBookmarkFilter,
    isMetadataTitle,
    selectTitleWithMetadata
  } = useLibrary();

  const { triggerAltSearch } = useAltSearch();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white">Мой список Shikimori</h3>
          {shikimoriBookmarks && shikimoriBookmarks.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Фильтры активны
            </span>
          )}
        </div>
        <button
          onClick={loadBookmarks}
          className="text-xs text-[#FF007F] hover:text-[#FF007F]/80 font-bold transition-colors"
          disabled={isLoadingBookmarks}
        >
          {isLoadingBookmarks ? "Обновление..." : "Обновить"}
        </button>
      </div>

      {/* Filters pills container */}
      {shikimoriBookmarks && shikimoriBookmarks.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1">
          {[
            { key: 'all', label: 'Все' },
            { key: 'watching', label: 'Смотрю' },
            { key: 'planned', label: 'В планах' },
            { key: 'completed', label: 'Просмотрено' },
            { key: 'on_hold', label: 'Отложено' },
            { key: 'dropped', label: 'Брошено' },
            { key: 'rewatching', label: 'Пересматриваю' },
          ].map(filter => {
            const count = filter.key === 'all'
              ? shikimoriBookmarks.length
              : shikimoriBookmarks.filter(b => b.watch_status === filter.key).length;

            // Only render filters that have items, or the 'All' filter
            if (filter.key !== 'all' && count === 0) return null;

            const isActive = activeBookmarkFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveBookmarkFilter(filter.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-[#FF007F] text-white shadow-md shadow-[#FF007F]/25 font-bold'
                    : 'bg-[#161622]/60 text-[#8E8E9F] hover:text-white border border-white/10 hover:bg-[#161622] transition-all duration-200'
                }`}
              >
                {filter.label}
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-white/5 text-white/40'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isLoadingBookmarks ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <div key={n} className="rounded-xl border border-white/5 bg-[#161622]/20 animate-pulse flex flex-col relative select-none">
              <div className="aspect-[2/3] w-full bg-[#0D0E15]/50 border-b border-white/5 rounded-t-xl" />
              <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-5/6" />
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="h-3 bg-white/5 rounded w-12" />
                  <div className="h-6 bg-white/10 rounded-lg w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : shikimoriBookmarks && shikimoriBookmarks.length > 0 ? (
        (() => {
          const filtered = shikimoriBookmarks.filter(title => {
            if (activeBookmarkFilter === 'all') return true;
            return title.watch_status === activeBookmarkFilter;
          });
          if (filtered.length === 0) {
            return (
              <div className="relative p-12 rounded-2xl border border-white/5 bg-[#161622]/20 backdrop-blur-xl text-center space-y-2 shadow-md overflow-hidden">
                <p className="text-xs font-bold text-white">Нет совпадений</p>
                <p className="text-xs text-[#8E8E9F] max-w-xs mx-auto">В категории "{activeBookmarkFilter}" отсутствуют аниме-релизы в вашем профиле.</p>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
              {filtered.map((title, idx) => {
                const isMetadata = isMetadataTitle(title);
                const badgeText = title.status_text ? title.status_text.split("Статус: ")[1].split(",")[0] : undefined;
                return (
                  <AnimeCard
                    key={idx}
                    title={title.title}
                    coverImage={title.cover_image}
                    description={title.status_text || title.description}
                    badgeText={badgeText}
                    isMetadata={isMetadata}
                    onSelect={() => selectTitleWithMetadata(title)}
                    onFindVideo={() => triggerAltSearch(title.title)}
                  />
                );
              })}
            </div>
          );
        })()
      ) : (
        <div className="relative p-12 rounded-2xl border border-[#FF007F]/10 bg-[#161622]/30 backdrop-blur-xl text-center space-y-3 shadow-lg overflow-hidden cyber-grid">
          <Bookmark className="h-10 w-10 text-[#FF007F]/40 mx-auto neon-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Закладки пусты</h3>
            <p className="text-xs text-[#8E8E9F] max-w-xs mx-auto">Списки с Shikimori отсутствуют или не содержат записей. Проверьте настройки авторизации.</p>
          </div>
        </div>
      )}
    </div>
  );
}
