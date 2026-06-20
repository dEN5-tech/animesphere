import { Video, X } from 'lucide-preact';
import type { PlaybackState } from '../../../shared/types';

interface QualityPanelProps {
  showQualityMenu: boolean;
  setShowQualityMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  playbackState: PlaybackState;
  selectQuality: (idx: number) => void;
}

export function QualityPanel({
  showQualityMenu,
  setShowQualityMenu,
  playbackState,
  selectQuality
}: QualityPanelProps) {
  
  // Safe helper to clean resolution titles from MPV's edition_list JSON format.
  const cleanQualityTitle = (title: string, id: number): { label: string; sublabel?: string } => {
    if (!title) {
      return { label: `Вариант ${id + 1}` };
    }

    // Match patterns like "1920x1080", "1280x720", "854x480", "640x360"
    const resMatch = title.match(/(\d+)x(\d+)/);
    let label = '';
    if (resMatch) {
      const height = resMatch[2];
      label = `${height}p`;
    } else {
      const heightMatch = title.match(/(\d+p)/i);
      if (heightMatch) {
        label = heightMatch[1].toLowerCase();
      }
    }

    // Try to extract bitrate info (e.g. "Bitrate: 2200 kbps", "2200k", "2200000")
    let sublabel = '';
    const bitrateMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:kbps|k|bps)/i);
    if (bitrateMatch) {
      sublabel = `${bitrateMatch[1]} kbps`;
    } else {
      const rawBitrateMatch = title.match(/bitrate:\s*(\d+)/i);
      if (rawBitrateMatch) {
        const bps = parseInt(rawBitrateMatch[1]);
        if (bps > 1000) {
          sublabel = `${Math.round(bps / 1000)} kbps`;
        }
      }
    }

    if (!label) {
      const editionMatch = title.match(/edition\s*(\d+)/i);
      if (editionMatch) {
        label = `Вариант ${parseInt(editionMatch[1]) + 1}`;
      } else {
        label = title.length > 20 ? title.substring(0, 17) + '...' : title;
      }
    }

    return { label, sublabel: sublabel || undefined };
  };

  let editions: Array<{ id: number; title: string }> = [];
  if (playbackState.edition_list) {
    try {
      const parsed = JSON.parse(playbackState.edition_list);
      if (Array.isArray(parsed)) {
        editions = parsed.map((item: any) => ({
          id: typeof item.id === 'number' ? item.id : 0,
          title: item.title || '',
        }));
      }
    } catch (e) {
      console.error('Failed to parse edition_list in QualityPanel:', e);
    }
  }

  // Fallback if parsing resulted in empty list but we know there are multiple editions
  if (editions.length === 0 && playbackState.editions_count && playbackState.editions_count > 0) {
    for (let i = 0; i < playbackState.editions_count; i++) {
      editions.push({
        id: i,
        title: `Качество ${i + 1}`,
      });
    }
  }

  return (
    <div className="relative pointer-events-auto">
      <button
        id="quality-toggle"
        onClick={() => setShowQualityMenu(p => !p)}
        className={`w-9 h-9 rounded-full border flex items-center justify-center text-white active:scale-95 transition-all ${
          showQualityMenu
            ? 'bg-[#FF007F] border-[#FF007F] shadow-lg shadow-[#FF007F]/20 neon-glow-pink'
            : 'bg-[#0D0E15] border-white/10 hover:bg-[#FF007F]/10 hover:border-[#FF007F]/40'
        }`}
        title="Сменить качество видео"
      >
        <Video className="h-4 w-4" />
      </button>

      {showQualityMenu && (
        <div
          id="quality-panel"
          className="absolute bottom-12 right-0 z-50 w-56 rounded-2xl border border-[#FF007F]/20 bg-[#0D0E15]/95 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 shadow-black/80 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1 pb-1 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E9F]">Качество видео</span>
            <button
              onClick={() => setShowQualityMenu(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* List */}
          {editions.length === 0 ? (
            <div className="text-[11px] text-white/40 text-center py-4 font-medium">
              Автонастройка качества
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
              {editions.map((edition) => {
                const { label, sublabel } = cleanQualityTitle(edition.title, edition.id);
                const isActive = playbackState.current_edition === edition.id;
                return (
                  <button
                    key={edition.id}
                    id={`quality-option-${edition.id}`}
                    onClick={() => {
                      selectQuality(edition.id);
                      setShowQualityMenu(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between rounded-xl text-left transition-all duration-150 active:scale-95 group ${
                      isActive
                        ? 'bg-[#FF007F]/10 border border-[#FF007F]/30 text-white shadow-[0_0_10px_rgba(255,0,127,0.1)]'
                        : 'border border-transparent text-[#8E8E9F] hover:text-white hover:bg-white/5 hover:border-white/5'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${isActive ? 'text-[#FF007F]' : 'text-white/80 group-hover:text-white'}`}>
                        {label}
                      </span>
                      {sublabel && (
                        <span className="text-[9px] text-white/40 mt-0.5">
                          {sublabel}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF007F] shadow-[0_0_8px_#FF007F]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
