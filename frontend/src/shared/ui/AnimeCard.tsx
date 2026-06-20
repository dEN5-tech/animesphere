import { getProxiedImageUrl } from '../lib/utils';

interface AnimeCardProps {
  title: string;
  coverImage?: string;
  description: string;
  badgeText?: string;
  isMetadata?: boolean;
  onSelect: () => void;
  onFindVideo?: () => void;
}

export function AnimeCard({
  title,
  coverImage,
  description,
  badgeText,
  isMetadata,
  onSelect,
  onFindVideo,
}: AnimeCardProps) {
  const displayBadge = badgeText || (isMetadata ? "SHIKIMORI" : "MANIFEST");

  return (
    <div
      className="glass-card glass-panel rounded-xl overflow-hidden flex flex-col cursor-pointer group"
      onClick={onSelect}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0D0E15]">
        {coverImage && (
          <img
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            src={getProxiedImageUrl(coverImage)}
            onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
          <span className="px-2 py-0.5 bg-[#FF007F]/20 backdrop-blur-md border border-[#FF007F]/40 rounded text-[9px] font-mono font-bold text-[#FF007F] tracking-wider uppercase">
            {displayBadge}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#FF007F] transition-colors line-clamp-1">
          {title}
        </h3>
        <p className="text-xs text-[#e5bcc5] mb-4 line-clamp-2 leading-relaxed flex-grow">
          {description || "No description available."}
        </p>

        {isMetadata && onFindVideo ? (
          <button
            onClick={(e) => { e.stopPropagation(); onFindVideo(); }}
            className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-[#FF007F]/10 border border-[#FF007F]/30 rounded-lg text-[#FF007F] font-bold hover:bg-[#FF007F] hover:text-white transition-all shadow-[0_0_10px_rgba(255,0,127,0.2)] text-xs active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Найти видео
          </button>
        ) : (
          <button className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-[#FF007F]/10 border border-[#FF007F]/30 rounded-lg text-[#FF007F] font-bold hover:bg-[#FF007F] hover:text-white transition-all shadow-[0_0_10px_rgba(255,0,127,0.2)] text-xs active:scale-95 duration-200">
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            Watch Now
          </button>
        )}
      </div>
    </div>
  );
}
