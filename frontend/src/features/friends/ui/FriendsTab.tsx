import { useState, useEffect } from 'preact/hooks';
import { useServices } from '../../../shared/di/context';
import { Users, RefreshCw, ExternalLink, ShieldAlert } from 'lucide-preact';
import { AnimeCard } from '../../../shared/ui/AnimeCard';
import { useLibrary } from '../../library/model/useLibrary';
import { useAltSearch } from '../../search/model/useSearch';

interface Friend {
  id: number;
  nickname: string;
  avatar: string;
  last_online_at: string;
  url: string;
}

export function FriendsTab() {
  const { isMetadataTitle, selectTitleWithMetadata } = useLibrary();
  const { triggerAltSearch } = useAltSearch();
  const { settingsService } = useServices();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendBookmarks, setFriendBookmarks] = useState<any[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [bookmarksError, setBookmarksError] = useState<string | null>(null);
  const [activeBookmarkFilter, setActiveBookmarkFilter] = useState<string>('all');

  const loadFriends = async () => {
    setLoadingFriends(true);
    setFriendsError(null);
    try {
      const list = await settingsService.shikimoriFriends();
      setFriends(list);
    } catch (err: any) {
      console.error("Failed to load Shikimori friends:", err);
      setFriendsError("Не удалось получить список друзей: " + (err?.message || String(err)));
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadFriendBookmarks = async (friend: Friend) => {
    setSelectedFriend(friend);
    setLoadingBookmarks(true);
    setBookmarksError(null);
    setActiveBookmarkFilter('all');
    try {
      const list = await settingsService.shikimoriFriendBookmarks(String(friend.id));
      setFriendBookmarks(list);
    } catch (err: any) {
      console.error("Failed to load friend bookmarks:", err);
      setBookmarksError("Не удалось получить список аниме друга: " + (err?.message || String(err)));
    } finally {
      setLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const formatLastOnline = (isoStr: string) => {
    if (!isoStr) return "неизвестно";
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 5) return "В сети";
      if (diffMins < 60) return `${diffMins} мин. назад`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ч. назад`;
      
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return "давно";
    }
  };

  const isOnline = (isoStr: string) => {
    if (!isoStr) return false;
    try {
      const diffMs = new Date().getTime() - new Date(isoStr).getTime();
      return diffMs < 5 * 60 * 1000; // less than 5 minutes
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-[#FF007F]" />
            Друзья Shikimori
          </h3>
        </div>
        <button
          onClick={loadFriends}
          className="text-xs text-[#FF007F] hover:text-[#FF007F]/80 font-bold transition-colors inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          disabled={loadingFriends}
        >
          {loadingFriends ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Обновление...
            </>
          ) : (
            "Обновить список"
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* LEFT COLUMN: FRIENDS LIST */}
        <div className="space-y-3">
          <div className="bg-[#161622]/40 border border-white/5 rounded-2xl p-3 max-h-[70vh] overflow-y-auto space-y-2 relative scrollbar-thin">
            {loadingFriends ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="w-full flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-[#161622]/20 animate-pulse select-none">
                    <div className="flex items-center gap-2.5 w-full">
                      <div className="w-9 h-9 rounded-full bg-white/5 shrink-0" />
                      <div className="space-y-1.5 flex-grow">
                        <div className="h-3 bg-white/10 rounded w-2/3" />
                        <div className="h-2 bg-white/5 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : friendsError ? (
              <div className="text-center py-6 text-rose-400 space-y-2 text-xs">
                <ShieldAlert className="h-8 w-8 mx-auto opacity-60" />
                <p>{friendsError}</p>
                <button
                  onClick={loadFriends}
                  className="bg-[#FF007F]/10 hover:bg-[#FF007F]/20 text-[#FF007F] px-3 py-1.5 rounded-lg border border-[#FF007F]/25 text-[10px] font-bold"
                >
                  Повторить
                </button>
              </div>
            ) : friends.length > 0 ? (
              friends.map(friend => {
                const active = selectedFriend?.id === friend.id;
                const online = isOnline(friend.last_online_at);
                return (
                  <button
                    key={friend.id}
                    onClick={() => loadFriendBookmarks(friend)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 active:scale-98 hover:scale-[1.01] text-left ${
                      active
                        ? 'bg-gradient-to-r from-[#FF007F]/20 to-[#CC0060]/10 border-[#FF007F]/40 text-white font-semibold shadow-md shadow-[#FF007F]/5'
                        : 'bg-[#161622]/30 border-transparent text-[#8E8E9F] hover:text-white hover:bg-white/5 hover:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="relative shrink-0">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.nickname}
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                            onError={(e: any) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                            {friend.nickname.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#161622] ${
                          online ? 'bg-emerald-500 animate-pulse' : 'bg-[#3A3A4A]'
                        }`} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate text-white">{friend.nickname}</div>
                        <div className="text-[10px] text-[#8E8E9F] truncate">
                          {online ? 'В сети' : formatLastOnline(friend.last_online_at)}
                        </div>
                      </div>
                    </div>
                    {friend.url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          settingsService.openBrowser(friend.url).catch(() => {});
                        }}
                        className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all shrink-0"
                        title="Открыть в браузере"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-[#8E8E9F] text-xs">
                У вас нет друзей на Shikimori.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: FRIEND'S ANIME RATES LIST */}
        <div className="bg-[#161622]/20 border border-white/5 rounded-2xl p-5 min-h-[60vh] space-y-5">
          {selectedFriend ? (
            <>
              {/* Header inside introspection pane */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    Список аниме: <span className="text-[#FF007F]">{selectedFriend.nickname}</span>
                  </h4>
                  <p className="text-[11px] text-[#8E8E9F] mt-0.5">Изучение библиотеки и просмотров друга</p>
                </div>
                <button
                  onClick={() => loadFriendBookmarks(selectedFriend)}
                  className="text-xs text-[#FF007F] hover:text-[#FF007F]/80 font-bold transition-colors disabled:opacity-50"
                  disabled={loadingBookmarks}
                >
                  {loadingBookmarks ? "Обновление..." : "Обновить список"}
                </button>
              </div>

              {/* Loader */}
              {loadingBookmarks ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} className="rounded-xl border border-white/5 bg-[#161622]/20 animate-pulse flex flex-col relative select-none">
                      <div className="aspect-[2/3] w-full bg-[#0D0E15]/50 border-b border-white/5 rounded-t-xl" />
                      <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="h-4 bg-white/10 rounded w-3/4" />
                          <div className="h-3 bg-white/5 rounded w-full" />
                          <div className="h-3 bg-white/5 rounded w-5/6" />
                        </div>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="h-3 bg-white/5 rounded w-12" />
                          <div className="h-6 bg-white/10 rounded-lg w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : bookmarksError ? (
                <div className="text-center py-12 text-rose-400 space-y-3">
                  <ShieldAlert className="h-10 w-10 mx-auto opacity-50" />
                  <p className="text-sm">{bookmarksError}</p>
                  <button
                    onClick={() => loadFriendBookmarks(selectedFriend)}
                    className="bg-[#FF007F] hover:bg-[#CC0060] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Повторить загрузку
                  </button>
                </div>
              ) : friendBookmarks.length > 0 ? (
                <>
                  {/* Category Filter Tabs */}
                  <div className="flex flex-wrap gap-2 pb-2">
                    {[
                      { key: 'all', label: 'Все' },
                      { key: 'watching', label: 'Смотрю' },
                      { key: 'planned', label: 'В планах' },
                      { key: 'completed', label: 'Просмотрено' },
                      { key: 'on_hold', label: 'Отложено' },
                      { key: 'dropped', label: 'Брошено' },
                      { key: 'rewatching', label: 'Пересматриваю' },
                    ].map(filter => {
                      const count = filter.key === 'all'
                        ? friendBookmarks.length
                        : friendBookmarks.filter(b => b.watch_status === filter.key).length;

                      if (filter.key !== 'all' && count === 0) return null;

                      const isActive = activeBookmarkFilter === filter.key;
                      return (
                        <button
                          key={filter.key}
                          onClick={() => setActiveBookmarkFilter(filter.key)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                            isActive
                              ? 'bg-[#FF007F] text-white shadow-md shadow-[#FF007F]/25 font-bold'
                              : 'bg-[#161622]/60 text-[#8E8E9F] hover:text-white border border-white/10 hover:bg-[#161622] transition-all duration-200'
                          }`}
                        >
                          {filter.label}
                          <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold ${
                            isActive ? 'bg-white/25 text-white' : 'bg-white/5 text-white/40'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Introspection Grid List */}
                  {(() => {
                    const filtered = friendBookmarks.filter(title => {
                      if (activeBookmarkFilter === 'all') return true;
                      return title.watch_status === activeBookmarkFilter;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-16 space-y-1">
                          <p className="text-sm font-bold text-white">Раздел пуст</p>
                          <p className="text-xs text-[#8E8E9F] max-w-xs mx-auto">
                            В категории "{activeBookmarkFilter}" отсутствуют релизы в списке друга.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5">
                        {filtered.map((title, idx) => {
                          const isMetadata = isMetadataTitle(title);
                          const badgeText = title.status_text 
                            ? title.status_text.split("Статус: ")[1].split(",")[0] 
                            : undefined;

                          return (
                            <AnimeCard
                              key={idx}
                              title={title.title}
                              coverImage={title.cover_image}
                              description={title.status_text || title.description}
                              badgeText={badgeText}
                              isMetadata={isMetadata}
                              onSelect={() => selectTitleWithMetadata(title)}
                              onFindVideo={() => triggerAltSearch(title.title)}
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-16 text-[#8E8E9F] text-xs">
                  Этот пользователь не добавил ни одного аниме в закладки.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <Users className="h-12 w-12 text-[#FF007F]/30 animate-pulse" />
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white">Интроспекция списков</h4>
                <p className="text-xs text-[#8E8E9F]">
                  Выберите друга в левом списке, чтобы загрузить его профиль, узнать статус просмотра серий и запустить проигрывание любого аниме в плеере.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
