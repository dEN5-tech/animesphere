import { useAtom } from 'jotai';
import * as uiStore from '../../../entities/ui';

export function Header() {
  const [currentTab, setCurrentTab] = useAtom(uiStore.currentTab);

  return (
    <header className="fixed top-0 left-0 w-full z-30 h-16 bg-[#080810]/85 backdrop-blur-xl border-b border-[#2A2A3C]/30 flex justify-between items-center px-6 shadow-lg shadow-black/10 pointer-events-auto">
      <div className="flex items-center gap-8 w-full">
        <span
          onClick={() => setCurrentTab('home')}
          className="text-2xl font-extrabold text-[#FF007F] italic cursor-pointer active:scale-95 transition-transform neon-text-glow"
        >
          AnimeSphere
        </span>
        <nav className="hidden md:flex items-center gap-6">
          <span 
            onClick={() => setCurrentTab('home')}
            className={`font-body-main cursor-pointer active:scale-95 transition-all duration-300 ${currentTab === 'home' ? 'text-[#FF007F] font-bold border-b-2 border-[#FF007F] pb-1 neon-text-glow' : 'text-[#e5bcc5] hover:text-[#FF007F]'}`}
          >
            The Station Lobby
          </span>
          <span 
            onClick={() => setCurrentTab('bookmarks')}
            className={`font-body-main cursor-pointer active:scale-95 transition-all duration-300 ${currentTab === 'bookmarks' ? 'text-[#FF007F] font-bold border-b-2 border-[#FF007F] pb-1 neon-text-glow' : 'text-[#e5bcc5] hover:text-[#FF007F]'}`}
          >
            Watchlist
          </span>
          <span 
            onClick={() => setCurrentTab('search')}
            className={`font-body-main cursor-pointer active:scale-95 transition-all duration-300 ${currentTab === 'search' ? 'text-[#FF007F] font-bold border-b-2 border-[#FF007F] pb-1 neon-text-glow' : 'text-[#e5bcc5] hover:text-[#FF007F]'}`}
          >
            The Window Seat
          </span>
        </nav>
      </div>
      
      <div className="flex items-center gap-4 text-white shrink-0">
        <span className="material-symbols-outlined cursor-pointer hover:text-[#FF007F] transition-colors">account_circle</span>
        <span className="material-symbols-outlined cursor-pointer hover:text-[#FF007F] transition-colors">notifications</span>
        <span className="material-symbols-outlined cursor-pointer hover:text-[#FF007F] transition-colors" onClick={() => setCurrentTab('settings')}>settings</span>
      </div>
    </header>
  );
}
