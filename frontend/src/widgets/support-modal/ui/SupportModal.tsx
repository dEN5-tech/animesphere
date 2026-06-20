import { useState } from 'preact/hooks';
import { useAtom } from 'jotai';
import { X, Heart, Coffee, Flame, Award, ExternalLink, Sparkles, CheckCircle } from 'lucide-preact';
import * as uiStore from '../../../entities/ui';
import { useServices } from '../../../shared/di/context';
import { setSafeStorage } from '../../../shared/lib/utils';

export function SupportModal() {
  const [showSupportModal, setShowSupportModal] = useAtom(uiStore.showSupportModal);
  const [isSupporterVal, setIsSupporterVal] = useAtom(uiStore.isSupporter);
  const { settingsService } = useServices();

  const [simulated, setSimulated] = useState(false);

  if (!showSupportModal) return null;

  const handleOpenLink = (url: string) => {
    settingsService.openBrowser(url).catch((err: any) => console.error("Failed to open donation link:", err));
  };

  const handleSimulateSupport = () => {
    setSafeStorage('is_supporter', 'true');
    setIsSupporterVal(true);
    setSimulated(true);
    setTimeout(() => {
      setSimulated(false);
      setShowSupportModal(false);
    }, 2000);
  };

  const handleResetSupport = () => {
    setSafeStorage('is_supporter', 'false');
    setIsSupporterVal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
      <div className="relative bg-[#0D0E15]/95 border border-[#FF007F]/30 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl shadow-[#FF007F]/10 space-y-6 animate-in fade-in zoom-in duration-300 backdrop-blur-2xl text-left">
        
        {/* Close button */}
        <button
          onClick={() => setShowSupportModal(false)}
          className="absolute top-4 right-4 text-[#8E8E9F] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex p-3 bg-[#FF007F]/10 rounded-full border border-[#FF007F]/25 text-[#FF007F] animate-bounce">
            <Heart className="h-7 w-7 fill-current" />
          </div>
          <h3 className="text-xl font-black text-white tracking-wide uppercase">
            Поддержать Станцию
          </h3>
          <p className="text-xs text-[#8E8E9F] max-w-md mx-auto leading-relaxed">
            AnimeSphere — полностью бесплатное, локальное приложение с открытым исходным кодом. Ваша добровольная поддержка помогает оплачивать серверы синхронизации и мотивирует разработчика!
          </p>
        </div>

        {/* Donation Tiers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Tier 1 */}
          <div className="p-4 rounded-2xl border border-white/5 bg-[#161622]/40 flex flex-col justify-between space-y-3 hover:border-[#FF007F]/20 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 fill-current" />
                Уголь
              </div>
              <div className="text-lg font-black text-white">~100 ₽</div>
              <p className="text-[10px] text-[#8E8E9F] leading-snug">
                Подбросить угля в котел. Помогает оплачивать трафик WebSocket-сервера.
              </p>
            </div>
            <div className="text-[9px] font-mono font-bold text-[#FF007F] bg-[#FF007F]/10 border border-[#FF007F]/25 rounded px-2 py-0.5 text-center">
              Разовый донат
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-2xl border border-[#FF007F]/20 bg-[#161622]/60 flex flex-col justify-between space-y-3 hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(255,0,127,0.05)]">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#FF007F] font-bold text-xs uppercase tracking-wider">
                <Coffee className="h-3.5 w-3.5" />
                Кофеек
              </div>
              <div className="text-lg font-black text-white">~300 ₽</div>
              <p className="text-[10px] text-[#8E8E9F] leading-snug">
                Кофе для разработчика. Поддерживает бодрость духа при решении багов плеера.
              </p>
            </div>
            <div className="text-[9px] font-mono font-bold text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/25 rounded px-2 py-0.5 text-center">
              Стабильный темп
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-2xl border border-white/5 bg-[#161622]/40 flex flex-col justify-between space-y-3 hover:border-[#FF007F]/20 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#00F0FF] font-bold text-xs uppercase tracking-wider">
                <Award className="h-3.5 w-3.5" />
                Спонсор
              </div>
              <div className="text-lg font-black text-white">500+ ₽</div>
              <p className="text-[10px] text-[#8E8E9F] leading-snug">
                Полноправный спонсор Станции. Инвестиция в разработку новых кибер-фич.
              </p>
            </div>
            <div className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded px-2 py-0.5 text-center">
              Почетный статус
            </div>
          </div>

        </div>

        {/* Action Buttons: Boosty, Patreon, Crypto */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-[#8E8E9F] uppercase tracking-wider block">Способы поддержки</label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleOpenLink("https://boosty.to/animesphere")}
              className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Поддержать через Boosty (Карты РФ / СБП)
              </span>
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleOpenLink("https://patreon.com/animesphere")}
              className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FF424D] to-[#E63946] text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all"
            >
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Поддержать через Patreon (Зарубежные карты)
              </span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Simulate Unlocking */}
        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-0.5">
            <span className="text-[9px] font-mono text-[#8E8E9F] block">КОСМЕТИЧЕСКАЯ НАГРАДА</span>
            <span className="text-xs font-bold text-[#00F0FF] block">
              Золотая рамка и бейдж «Космический спонсор»
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {isSupporterVal ? (
              <button
                onClick={handleResetSupport}
                className="px-4 py-2 border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold rounded-xl transition-all"
              >
                Сбросить
              </button>
            ) : (
              <button
                onClick={handleSimulateSupport}
                className="flex-grow sm:flex-grow-0 px-4 py-2.5 bg-[#FF007F]/10 border border-[#FF007F]/40 hover:bg-[#FF007F] text-[#FF007F] hover:text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,0,127,0.15)]"
              >
                {simulated ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 animate-pulse text-[#00F0FF]" />
                    Разблокировано!
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 fill-current" />
                    Я поддержал проект
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
