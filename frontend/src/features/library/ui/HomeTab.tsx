import { Play } from 'lucide-preact';
import { useAtomValue } from 'jotai';
import { AnimeCard } from '../../../shared/ui/AnimeCard';
import { getProxiedImageUrl, formatTime } from '../../../shared/lib/utils';
import { usePlayback } from '../../playback-control/model/usePlayback';
import { useLibrary } from '../model/useLibrary';
import { useAltSearch } from '../../search/model/useSearch';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as uiStore from '../../../entities/ui';

export function HomeTab() {
  const { resumePlayback, clearResume } = usePlayback();
  const { animeList, titles, importing, isMetadataTitle, selectTitleWithMetadata } = useLibrary();
  const { triggerAltSearch } = useAltSearch();

  const resumeData = useAtomValue(uiStore.resumeData);
  const setShowDrawer = (val: boolean) => { jotaiStore.set(uiStore.showDrawer, val); };
  const setCurrentTab = (val: any) => { jotaiStore.set(uiStore.currentTab, val); };

  return (
    <div className="space-y-8">
      {/* ── Resume Banner ── */}
      {resumeData && (
        <div className="relative flex gap-4 p-4 rounded-2xl border border-[#FF007F]/20 bg-gradient-to-r from-[#FF007F]/10 via-[#161622]/80 to-[#00F0FF]/10 backdrop-blur-xl shadow-xl shadow-black/45 overflow-hidden">
          {resumeData.cover_image && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-10 blur-sm scale-105"
              style={{ backgroundImage: `url(${getProxiedImageUrl(resumeData.cover_image)})` }}
            />
          )}
          <div
            className="relative shrink-0 w-16 h-20 rounded-xl bg-cover bg-center border border-white/10 shadow-lg"
            style={resumeData.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(resumeData.cover_image)})` } : {}}
          />
          <div className="relative flex-grow flex flex-col justify-between min-w-0 py-0.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF007F] mb-0.5 neon-pulse">Продолжить просмотр</p>
              <h3 className="text-base font-bold text-white line-clamp-1">{resumeData.anime_title}</h3>
              <p className="text-xs text-white/50 line-clamp-1 mt-0.5">{resumeData.episode_title}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-grow h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF007F] to-[#00F0FF] transition-all neon-glow-pink"
                  style={{ width: `${Math.min(100, (resumeData.time_pos / (resumeData.duration || 1440)) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#00F0FF] shrink-0">
                {formatTime(resumeData.time_pos)}
              </span>
            </div>
          </div>
          <div className="relative flex flex-col gap-2 justify-center shrink-0">
            <button
              onClick={resumePlayback}
              disabled={importing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF007F] hover:bg-[#CC0060] active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-[#FF007F]/30 disabled:opacity-50 hover:scale-105"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Продолжить
            </button>
            <button
              onClick={clearResume}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all active:scale-95"
            >
              Начать заново
            </button>
          </div>
        </div>
      )}

      {/* Active playlist section */}
      {animeList && animeList.length > 0 ? (
        <div className="p-6 rounded-2xl border border-[#FF007F]/15 bg-gradient-to-r from-[#FF007F]/5 via-[#161622]/80 to-[#00F0FF]/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-[#FF007F] font-bold">Активный плейлист</p>
            <h2 className="text-xl font-bold text-white line-clamp-1">{animeList[0].title.split(" - ")[0]}</h2>
            <p className="text-sm text-white/50 font-medium">{animeList.length} серий доступно для воспроизведения</p>
          </div>
          <button
            onClick={() => setShowDrawer(true)}
            className="px-6 py-2.5 rounded-full bg-[#FF007F] hover:bg-[#CC0060] text-white text-sm font-bold transition-all shadow-lg shadow-[#FF007F]/20 hover:scale-105 active:scale-95 flex items-center gap-2 neon-glow-pink"
          >
            <Play className="h-4 w-4 fill-current" />
            Продолжить просмотр
          </button>
        </div>
      ) : (
        <div className="relative p-10 rounded-2xl border border-[#FF007F]/15 bg-[#161622]/60 backdrop-blur-xl text-center space-y-4 shadow-lg overflow-hidden cyber-grid">
          <div className="w-16 h-16 rounded-2xl bg-[#0D0E15] border border-[#FF007F]/25 flex items-center justify-center mx-auto shadow-inner hover:shadow-[0_0_15px_rgba(255,0,127,0.2)] transition-shadow">
            <Play className="h-8 w-8 text-[#FF007F]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Список серий пуст</h3>
            <p className="text-sm text-[#8E8E9F] max-w-sm mx-auto">Найдите интересующее вас аниме через поиск или импортируйте плейлист вручную в настройках.</p>
          </div>
          <button
            onClick={() => setCurrentTab('search')}
            className="px-5 py-2 rounded-full border border-[#FF007F]/30 bg-[#FF007F]/10 text-white text-xs font-bold hover:bg-[#FF007F] hover:text-white hover:shadow-[0_0_15px_rgba(255,0,127,0.3)] transition-all active:scale-95"
          >
            Перейти к поиску
          </button>
        </div>
      )}

      {/* Dashboard recent items */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Недавно просмотренные</h3>
        {titles && titles.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {titles.slice(0, 3).map((title, idx) => {
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
          <p className="text-xs text-[#8E8E9F]/70 italic">История просмотров пуста. Начните воспроизведение, чтобы заполнить этот раздел.</p>
        )}
      </div>
    </div>
  );
}
