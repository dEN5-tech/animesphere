import { Terminal, XCircle, Volume2, Languages } from 'lucide-preact';
import { callNative } from '../../lib/ipc';

interface PlayerContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onToggleNerdStats: () => void;
}

export function PlayerContextMenu({ x, y, onClose, onToggleNerdStats }: PlayerContextMenuProps) {
  const cycleAudio = () => {
    callNative('cycle_audio').catch(err => console.error(err));
    onClose();
  };

  const cycleSubtitles = () => {
    callNative('cycle_subtitles').catch(err => console.error(err));
    onClose();
  };

  return (
    <div 
      className="fixed z-[100] pointer-events-auto w-52 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden py-1.5 animate-in fade-in zoom-in duration-150"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 mb-1 border-b border-white/5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Параметры плеера</span>
      </div>
      
      <button 
        onClick={() => { onToggleNerdStats(); onClose(); }}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-violet-600/30 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-violet-500/20 transition-colors">
          <Terminal className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <span>Системная статистика</span>
      </button>

      <button 
        onClick={cycleAudio}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-violet-600/30 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-violet-500/20 transition-colors">
          <Volume2 className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <span>Сменить озвучку</span>
      </button>

      <button 
        onClick={cycleSubtitles}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-white/70 hover:text-white hover:bg-violet-600/30 transition-all group"
      >
        <div className="p-1 rounded-md bg-white/5 group-hover:bg-violet-500/20 transition-colors">
          <Languages className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <span>Сменить субтитры</span>
      </button>

      <div className="h-px bg-white/5 my-1" />
      
      <button 
        onClick={onClose}
        className="w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold text-white/40 hover:text-white transition-colors"
      >
        <XCircle className="h-3.5 w-3.5" />
        <span>Закрыть меню</span>
      </button>
    </div>
  );
}
