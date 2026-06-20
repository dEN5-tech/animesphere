import { History } from 'lucide-preact';
import { AnimeCard } from '../../../shared/ui/AnimeCard';
import { useLibrary } from '../model/useLibrary';
import { useAltSearch } from '../../search/model/useSearch';

export function HistoryTab() {
  const { titles, loadHistory, isMetadataTitle, selectTitleWithMetadata } = useLibrary();
  const { triggerAltSearch } = useAltSearch();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">История просмотров</h3>
        <button
          onClick={loadHistory}
          className="text-xs text-[#FF007F] hover:text-[#FF007F]/80 font-bold transition-colors"
        >
          Обновить
        </button>
      </div>
      {titles && titles.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
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
          <History className="h-10 w-10 text-[#FF007F]/40 mx-auto neon-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">История пуста</h3>
            <p className="text-xs text-[#8E8E9F] max-w-xs mx-auto">Здесь будет отображаться список аниме, которые вы недавно воспроизводили.</p>
          </div>
        </div>
      )}
    </div>
  );
}
