import { Terminal, XCircle, Volume2, Languages, Video } from 'lucide-preact';
import { callNative } from '../../../shared/ipc';

interface PlayerContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onToggleNerdStats: () => void;
  onCycleQuality: () => void;
}

export function PlayerContextMenu({ x, y, onClose, onToggleNerdStats, onCycleQuality }: PlayerContextMenuProps) {
  const cycleAudio = () => {
    callNative('cycle_audio').catch(err => console.error(err));
    onClose();
  };

  const cycleSubtitles = () => {
    callNative('cycle_subtitles').catch(err => console.error(err));
    onClose();
  };

  const cycleQuality = () => {
    onCycleQuality();
    onClose();
  };

  return (
    <div 
      className="fixed z-[100] pointer-events-auto w-52 bg-[#0D0E15]/95 backdrop-blur-2xl border border-[#FF007F]/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden py-1.5 animate-in fade-in zoom-in duration-150"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 mb-1 border-b border-white/5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E9F]">Параметры плеера</span>
      </div>
      
      <button 
        onClick={() => { onToggleNerdStats(); onClose(); }}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-[#FF007F]/15 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-[#FF007F]/20 transition-colors">
          <Terminal className="h-3.5 w-3.5 text-[#FF007F]" />
        </div>
        <span>Системная статистика</span>
      </button>

      <button 
        onClick={cycleAudio}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-[#FF007F]/15 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-[#FF007F]/20 transition-colors">
          <Volume2 className="h-3.5 w-3.5 text-[#FF007F]" />
        </div>
        <span>Сменить озвучку</span>
      </button>

      <button 
        onClick={cycleSubtitles}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-[#FF007F]/15 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-[#FF007F]/20 transition-colors">
          <Languages className="h-3.5 w-3.5 text-[#FF007F]" />
        </div>
        <span>Сменить субтитры</span>
      </button>

      <button 
        onClick={cycleQuality}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-[#FF007F]/15 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-[#FF007F]/20 transition-colors">
          <Video className="h-3.5 w-3.5 text-[#FF007F]" />
        </div>
        <span>Сменить качество</span>
      </button>

      <div className="h-px bg-white/5 my-1" />
      
      <button 
        onClick={onClose}
        className="w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold text-white/40 hover:text-white transition-colors"
      >
        <XCircle className="h-3.5 w-3.5 text-[#8E8E9F]" />
        <span>Закрыть меню</span>
      </button>
    </div>
  );
}
