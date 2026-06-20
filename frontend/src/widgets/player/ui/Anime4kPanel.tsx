import { Sparkles, X } from 'lucide-preact';
import type { Anime4KModeType, Anime4KQualityType } from '../../../shared/types';

interface Anime4kPanelProps {
  showAnime4kPanel: boolean;
  setShowAnime4kPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  anime4kMode: Anime4KModeType;
  anime4kQuality: Anime4KQualityType;
  applyAnime4k: (mode: Anime4KModeType, quality: Anime4KQualityType) => void;
}

export function Anime4kPanel({
  showAnime4kPanel,
  setShowAnime4kPanel,
  anime4kMode,
  anime4kQuality,
  applyAnime4k
}: Anime4kPanelProps) {
  return (
    <div className="relative pointer-events-auto">
      <button
        id="anime4k-toggle"
        onClick={() => setShowAnime4kPanel(p => !p)}
        className={`flex items-center gap-1.5 h-9 rounded-full border px-3 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
          anime4kMode !== 'off'
            ? 'bg-[#FF007F] border-[#FF007F] text-white shadow-lg shadow-[#FF007F]/30 neon-glow-pink'
            : 'bg-[#161622]/60 border-white/10 text-[#8E8E9F] hover:text-white hover:bg-[#161622] hover:border-white/20'
        }`}
        title="Anime4K апскейлинг"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>{anime4kMode === 'off' ? '4K' : `4K·${anime4kMode}·${anime4kQuality}`}</span>
      </button>

      {/* Anime4K Panel */}
      {showAnime4kPanel && (
        <div
          id="anime4k-panel"
          className="absolute bottom-12 right-0 z-50 w-64 rounded-2xl border border-[#FF007F]/20 bg-[#0D0E15]/95 backdrop-blur-xl shadow-2xl p-4 space-y-4 shadow-black/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FF007F] neon-pulse" />
              <span className="text-sm font-bold text-white">Anime4K</span>
            </div>
            <button onClick={() => setShowAnime4kPanel(false)} className="text-white/40 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode selector */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Режим</p>
            <div className="flex gap-1.5 flex-wrap">
              {(['off', 'A', 'B', 'C'] as Anime4KModeType[]).map(m => (
                <button
                  key={m}
                  id={`anime4k-mode-${m}`}
                  onClick={() => applyAnime4k(m, anime4kQuality)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    anime4kMode === m
                      ? 'bg-[#FF007F] border-[#FF007F] text-white shadow-sm shadow-[#FF007F]/30'
                      : 'bg-white/5 border-white/10 text-[#8E8E9F] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {m === 'off' ? 'Выкл' : `Mode ${m}`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/30 leading-tight">
              {anime4kMode === 'A' ? 'Restore → Upscale. Для BD-рипов без артефактов' :
               anime4kMode === 'B' ? 'Soft Restore → Upscale. Для размытых контуров/aliasing' :
               anime4kMode === 'C' ? 'Upscale+Denoise. Для качественного видео' :
               'Шейдеры отключены — оригинальное разрешение'}
            </p>
          </div>

          {/* Quality selector */}
          <div className={`space-y-1.5 transition-opacity ${anime4kMode === 'off' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Качество GPU</p>
            <div className="flex gap-1.5">
              {(['S', 'M', 'L', 'VL', 'UL'] as Anime4KQualityType[]).map(q => (
                <button
                  key={q}
                  id={`anime4k-quality-${q}`}
                  onClick={() => applyAnime4k(anime4kMode, q)}
                  className={`flex-1 py-1 rounded-full text-xs font-bold transition-all border ${
                    anime4kQuality === q && anime4kMode !== 'off'
                      ? 'bg-[#00F0FF] border-[#00F0FF] text-[#080810] shadow-sm shadow-[#00F0FF]/30'
                      : 'bg-white/5 border-white/10 text-[#8E8E9F] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/30">
              {anime4kQuality === 'S' ? 'Слабый GPU (GTX 960+)' :
               anime4kQuality === 'M' ? 'Средний GPU (GTX 1060+)' :
               anime4kQuality === 'L' ? 'Мощный GPU (RTX 2060+)' :
               anime4kQuality === 'VL' ? 'Топовый GPU (RTX 3070+)' :
               'Флагман (RTX 4080+)'}
            </p>
          </div>

          {/* Shader files notice */}
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-[10px] text-white/40 leading-relaxed">
              📁 Шейдеры: <span className="text-white/60 font-mono">./shaders/*.glsl</span><br/>
              <a
                href="https://github.com/bloc97/Anime4K/releases"
                className="text-[#00F0FF] hover:text-[#00F0FF]/80 underline font-semibold transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >Скачать с GitHub ↗</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
