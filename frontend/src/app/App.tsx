import { useEffect } from 'preact/hooks';
import { useAtomValue, useSetAtom } from 'jotai';
import { AppProviders } from './providers';
import { useServices } from '../shared/di/context';
import { isAndroidRuntime } from '../shared/lib/utils';
import { useSettings } from '../features/settings';
import { usePlayback } from '../features/playback-control';
import { useLibrary } from '../features/library';
import { jotaiStore } from '../shared/store/jotaiStore';
import * as uiStore from '../entities/ui';
import * as userEntity from '../entities/user';
import { tabRegistry } from './tabRegistry';
import { PlayerOverlay } from '../widgets/player';
import { AltSearchOverlay } from '../features/search';
import { MetadataOverlay } from '../widgets/metadata-overlay';
import { Header } from '../widgets/header';
import { Sidebar } from '../widgets/sidebar';
import { SupportModal } from '../widgets/support-modal';

export function App() {
  console.info('[AnimeSphere] App render');
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

function AppContent() {
  console.info('[AnimeSphere] AppContent render start');
  const { playbackService } = useServices();
  const isAndroid = isAndroidRuntime();

  useSettings();
  const shikimoriAuthorized = useAtomValue(userEntity.shikimoriAuthorized);
  
  const { activeMedia } = usePlayback();
  const { loadHistory, handleSearch, setSearchQuery } = useLibrary();

  const currentTab = useAtomValue(uiStore.currentTab);
  const error = useAtomValue(uiStore.globalError);
  const setCurrentTab = useSetAtom(uiStore.currentTab);

  console.info('[AnimeSphere] AppContent render state', JSON.stringify({
    currentTab,
    activeMedia: !!activeMedia,
    shikimoriAuthorized,
    hasError: !!error,
  }));

  useEffect(() => {
    if (activeMedia && !isAndroid) {
      document.body.classList.remove('lobby-mode');
      document.body.classList.add('playback-active');
    } else {
      document.body.classList.remove('playback-active');
      document.body.classList.add('lobby-mode');
    }
    return () => {
      document.body.classList.remove('lobby-mode');
      document.body.classList.remove('playback-active');
    };
  }, [activeMedia, isAndroid]);

  useEffect(() => {
    playbackService.getResume()
      .then((data: any) => { if (data) jotaiStore.set(uiStore.resumeData, data); })
      .catch(() => {});

    // Prevent default browser context menu globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    // Prevent touchpad/mouse pinch-to-zoom and ctrl+hotkey zooms
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+' || e.key === '_')) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    (window as any).handleDeepLink = (urlStr: string) => {
      try {
        console.log("Deep link received in frontend:", urlStr);
        const decodedUrl = decodeURIComponent(urlStr);
        const url = new URL(decodedUrl);
        if (url.protocol === 'animesphere:') {
          if (url.host === 'play') {
            const videoUrl = url.searchParams.get('url');
            if (videoUrl) {
              setSearchQuery(videoUrl);
              jotaiStore.set(uiStore.currentTab, 'search');
              handleSearch(videoUrl);
            }
          } else if (url.host === 'search') {
            const query = url.searchParams.get('q');
            if (query) {
              setSearchQuery(query);
              jotaiStore.set(uiStore.currentTab, 'search');
              handleSearch(query);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse/handle deep link:", e);
      }
    };

    return () => {
      delete (window as any).handleDeepLink;
    };
  }, [handleSearch, setSearchQuery]);

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
    <div className={activeMedia && !isAndroid ? "playback-active animate-in fade-in duration-300" : "w-full min-h-screen relative z-10 select-none animate-in fade-in duration-300"}>
      {activeMedia && !isAndroid ? (
        <PlayerOverlay />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Header Widget */}
          <Header />

          {/* Main Content Area */}
          <div className="flex w-full flex-grow pt-16 relative">
            {/* Sidebar Widget (Desktop) */}
            {!isAndroid ? (
              <Sidebar />
            ) : (
              /* Bottom Bar (Android) */
              <aside className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-around gap-2 p-2 bg-[#161622]/95 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl shadow-black/30">
                {visibleTabs.map((tab: any) => {
                  const TabIcon = tab.icon;
                  const isActive = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCurrentTab(tab.id);
                        if (tab.id === 'history') {
                          loadHistory();
                        }
                      }}
                      className={`group rounded-xl flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-2 py-3 transition-all duration-200 active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-b from-[#FF007F] to-[#CC0060] text-white font-bold shadow-lg shadow-[#FF007F]/25'
                          : 'text-[#8E8E9F] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <TabIcon className="h-5 w-5 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] leading-none text-center">{tab.label}</span>
                    </button>
                  );
                })}
              </aside>
            )}

            {/* Right Panel / Tab Canvas */}
            <div className={`flex-grow p-6 overflow-y-auto ${!isAndroid ? 'ml-64' : ''} mb-8`}>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm font-semibold mb-6">
                  {error}
                </div>
              )}

              {/* TAB CONTENTS */}
              {(() => {
                const activeTabDef = tabRegistry.find(tab => tab.id === currentTab);
                if (!activeTabDef) return null;
                const TabComponent = activeTabDef.component;
                return <TabComponent />;
              })()}
            </div>
          </div>
          <AltSearchOverlay />
          <MetadataOverlay />
          <SupportModal />
        </div>
      )}
    </div>
  );
}
