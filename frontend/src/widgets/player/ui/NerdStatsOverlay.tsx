import type { PlaybackState } from '../../../shared/types';

interface NerdStatsOverlayProps {
  playbackState: PlaybackState;
  showNerdStats: boolean;
  setShowNerdStats: (show: boolean) => void;
}

export function NerdStatsOverlay({ playbackState, showNerdStats, setShowNerdStats }: NerdStatsOverlayProps) {
  if (!showNerdStats || !playbackState.nerd_stats) return null;

  const stats = playbackState.nerd_stats;

  return (
    <div className="absolute top-4 left-4 z-[60] w-72 bg-[#0D0E15]/95 backdrop-blur-md rounded-xl p-4 font-mono text-[10px] text-white/90 border border-[#FF007F]/20 shadow-2xl shadow-black/80 pointer-events-auto">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
        <span className="font-bold text-[#FF007F] uppercase tracking-wider">Stats for Nerds</span>
        <button onClick={() => setShowNerdStats(false)} className="text-[#8E8E9F] hover:text-white text-base leading-none">×</button>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-white/40">Video Codec</span>
          <span className="font-bold">{stats.video_codec}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Audio Codec</span>
          <span className="font-bold">{stats.audio_codec}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Resolution</span>
          <span className="font-bold">{stats.width}x{stats.height}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Current FPS</span>
          <span className="font-bold text-[#00F0FF]">{stats.fps.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Hardware Dec</span>
          <span className={`font-bold ${stats.hwdec !== 'no' ? 'text-green-400' : 'text-red-400'}`}>{stats.hwdec}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Bitrate</span>
          <span className="font-bold">{(stats.video_bitrate / 1000).toFixed(0)} kbps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Dropped Frames</span>
          <span className="font-bold text-amber-400">{stats.frame_drop_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Position</span>
          <span className="font-bold">{playbackState.time_pos.toFixed(2)} / {playbackState.duration.toFixed(2)} s</span>
        </div>
      </div>
    </div>
  );
}
