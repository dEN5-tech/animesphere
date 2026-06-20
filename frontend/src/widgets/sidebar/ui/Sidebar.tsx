import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useServices } from '../../../shared/di/context';
import { useLibrary } from '../../../features/library';
import { tabRegistry } from '../../../app/tabRegistry';
import * as uiStore from '../../../entities/ui';
import * as userEntity from '../../../entities/user';

export function Sidebar() {
  const { settingsService } = useServices();
  const { loadHistory } = useLibrary();

  const [currentTab, setCurrentTab] = useAtom(uiStore.currentTab);
  const shikimoriAuthorized = useAtomValue(userEntity.shikimoriAuthorized);
  const shikimoriProfile = useAtomValue(userEntity.shikimoriProfile);
  const isSupporter = useAtomValue(uiStore.isSupporter);
  const setShowSupportModal = useSetAtom(uiStore.showSupportModal);

  const visibleTabs = tabRegistry.filter((tab: any) => {
    if (tab.id === 'logs') {
      return false;
    }
    if (tab.id === 'bookmarks' || tab.id === 'friends') {
      return shikimoriAuthorized;
    }
    return true;
  });


  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-96px)] w-64 border-r border-[#2A2A3C]/30 bg-[#161622]/85 backdrop-blur-xl flex flex-col py-6 z-20 text-left">
      <div 
        onClick={() => {
          if (shikimoriAuthorized && shikimoriProfile && shikimoriProfile.url) {
            settingsService.openBrowser(shikimoriProfile.url).catch((err: any) => console.error(err));
          }
        }}
        className={`px-6 mb-8 ${(shikimoriAuthorized && shikimoriProfile && shikimoriProfile.url) ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        title={shikimoriAuthorized && shikimoriProfile ? `Открыть профиль Shikimori: ${shikimoriProfile.nickname}` : undefined}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-[#0D0714] border ${
            isSupporter 
              ? 'border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.6)] animate-[pulse_2s_infinite]' 
              : 'border-[#FF007F]/50 shadow-[0_0_10px_rgba(255,0,127,0.3)]'
          }`}>
            {shikimoriAuthorized && shikimoriProfile && shikimoriProfile.avatar ? (
              <img
                src={shikimoriProfile.avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <img 
                alt="Dispatcher" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpSkaCUz_iIlmj8WfModocKURvZglyxdzUmP8xRz7UXso6qJweZtq0tHq28O5QVJwFf2rF4QHdBLWU9xLApCVaN-ciVhVhti_9f0bQWKlsj7dupsp0Ik4-wHEySsnL2heJ5T2z8c5SaKsn_vxDFvbtG2PIOmg6ME9Wqdeq6gtIxbpL_kjV_PrTE3Km58ajMRJsKaNblhsznaYl181QucO2qBjVT1blQgTb12FJnXpQBtsTd7lCCK4Z68z-P_V_OLJqeAT_PB5qpCIa" 
              />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">
              {shikimoriAuthorized && shikimoriProfile ? shikimoriProfile.nickname : "Dispatcher"}
            </div>
            <div className={`text-[10px] font-mono uppercase leading-none mt-1 ${
              isSupporter ? 'text-[#FFD700] font-extrabold tracking-wider animate-pulse' : 'text-[#FF007F] opacity-90'
            }`}>
              {isSupporter ? 'Space Backer' : 'Active Session'}
            </div>
          </div>
        </div>
      </div>
      
      <nav className="space-y-1">
        {visibleTabs.map((tab: any) => {
          const isActive = currentTab === tab.id;
          const iconName = 
            tab.id === 'home' ? 'home' :
            tab.id === 'bookmarks' ? 'bookmarks' :
            tab.id === 'search' ? 'play_circle' :
            tab.id === 'history' ? 'history' :
            tab.id === 'friends' ? 'group' :
            'settings';
          
          const displayLabel = 
            tab.id === 'home' ? 'The Station Lobby' :
            tab.id === 'bookmarks' ? 'Watchlist' :
            tab.id === 'search' ? 'The Window Seat' :
            tab.id === 'history' ? 'History' :
            tab.id === 'friends' ? 'Friends' :
            "The Conductor's Desk";

          return (
            <div 
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id);
                if (tab.id === 'history') {
                  loadHistory();
                }
              }}
              className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-xl transition-all duration-200 active:scale-98 cursor-pointer ${
                isActive 
                  ? 'bg-[#FF007F] text-white font-bold shadow-[0_0_15px_rgba(255,0,127,0.4)]' 
                  : 'text-[#e5bcc5] hover:text-[#FF007F] hover:bg-[#2A2A3C]/50'
              }`}
            >
              <span className="material-symbols-outlined">{iconName}</span>
              <span className="text-sm">{displayLabel}</span>
            </div>
          );
        })}
      </nav>
      
      <div className="mt-auto px-4 pb-4">
        <button
          onClick={() => setShowSupportModal(true)}
          className={`w-full py-3 text-white rounded-xl font-bold text-sm active:scale-95 transition-all ${
            isSupporter 
              ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:shadow-[0_0_15px_rgba(255,215,0,0.5)] border border-[#FFD700]/30 font-black' 
              : 'neon-btn'
          }`}
        >
          {isSupporter ? '⭐ Вы поддерживаете проект!' : 'Support Project'}
        </button>
        <div className="mt-6 space-y-2 border-t border-[#2A2A3C]/30 pt-4">
          <div className="flex items-center gap-4 text-[#e5bcc5] hover:text-[#FF007F] transition-all px-2 cursor-pointer text-xs">
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span>Support</span>
          </div>
          <div 
            onClick={() => { setCurrentTab('logs'); }}
            className={`flex items-center gap-4 transition-all px-2 cursor-pointer text-xs ${
              currentTab === 'logs' ? 'text-[#FF007F] font-bold' : 'text-[#e5bcc5] hover:text-[#FF007F]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">terminal</span>
            <span>Logs</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
