import { X } from 'lucide-preact';
import type { Anime } from '../../types';
import { getProxiedImageUrl } from '../../lib/utils';

interface EpisodeDrawerProps {
  showDrawer: boolean;
  setShowDrawer: (show: boolean) => void;
  animeList: Anime[];
  activeMedia: string | null;
  playAnime: (id: number) => void;
}

export function EpisodeDrawer({ showDrawer, setShowDrawer, animeList, activeMedia, playAnime }: EpisodeDrawerProps) {
  return (
    <div className={`fixed top-0 right-0 z-40 w-80 h-full bg-card border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ${showDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-bold text-violet-400">Список серий</h3>
        <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {animeList.map((anime) => {
          const isPlaying = anime.title === activeMedia;
          return (
            <div
              key={anime.id}
              className={`flex gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${isPlaying ? 'bg-violet-600/10 border-violet-500 text-violet-400' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
              onClick={() => playAnime(anime.id)}
            >
              <div
                className="w-20 h-12 bg-cover bg-center rounded bg-muted border border-white/5 shrink-0"
                style={anime.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(anime.cover_image)})` } : {}}
              />
              <div className="flex flex-col justify-center overflow-hidden">
                <span className="text-xs font-semibold truncate text-white">{anime.title}</span>
                {isPlaying && <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mt-1">Играет</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
