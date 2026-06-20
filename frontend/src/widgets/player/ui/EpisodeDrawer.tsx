import { X } from 'lucide-preact';
import type { Anime } from '../../../shared/types';
import { getProxiedImageUrl } from '../../../shared/lib/utils';

interface EpisodeDrawerProps {
  showDrawer: boolean;
  setShowDrawer: (show: boolean) => void;
  animeList: Anime[];
  activeMedia: string | null;
  playAnime: (id: number) => void;
}

export function EpisodeDrawer({ showDrawer, setShowDrawer, animeList, activeMedia, playAnime }: EpisodeDrawerProps) {
  return (
    <div className={`fixed top-0 right-0 z-40 w-80 h-full bg-[#0D0E15]/95 border-l border-[#FF007F]/20 backdrop-blur-2xl shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 shadow-black/80 ${showDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF007F] to-[#00F0FF]">Список серий</h3>
        <button onClick={() => setShowDrawer(false)} className="text-[#8E8E9F] hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {animeList.map((anime) => {
          const isPlaying = anime.title === activeMedia;
          return (
            <div
              key={anime.id}
              className={`flex gap-3 p-2 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${isPlaying ? 'bg-[#FF007F]/10 border-[#FF007F]/40 text-[#FF007F] shadow-[0_0_15px_rgba(255,0,127,0.15)]' : 'bg-[#161622]/60 border-white/5 hover:border-white/10 text-white hover:bg-[#161622]'}`}
              onClick={() => playAnime(anime.id)}
            >
              <div
                className="w-20 h-12 bg-cover bg-center rounded bg-muted border border-white/5 shrink-0"
                style={anime.cover_image ? { backgroundImage: `url(${getProxiedImageUrl(anime.cover_image)})` } : {}}
              />
              <div className="flex flex-col justify-center overflow-hidden">
                <span className="text-xs font-semibold truncate text-white">{anime.title}</span>
                {isPlaying && <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00F0FF] mt-1 neon-pulse">Играет</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
