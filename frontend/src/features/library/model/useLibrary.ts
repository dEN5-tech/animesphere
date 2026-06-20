import { useEffect } from 'preact/hooks';
import { useAtomValue, useSetAtom } from 'jotai';
import type { Anime, AnimeTitle } from '../../../shared/types';
import { useServices } from '../../../shared/di/context';
import { isAndroidRuntime } from '../../../shared/lib/utils';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as store from '../../../entities/anime';
import * as uiStore from '../../../entities/ui';
import * as playbackStore from '../../../entities/playback';
import * as settingsStore from '../../settings';

export function useLibrary() {
  const { libraryService, settingsService } = useServices();

  // Reactive reads
  const animeListVal = useAtomValue(store.animeList);
  const titlesVal = useAtomValue(store.titles);
  const activeMediaVal = useAtomValue(playbackStore.activeMedia);
  const searchQueryVal = useAtomValue(store.searchQuery);
  const importingVal = useAtomValue(uiStore.importing);
  const vostIdVal = useAtomValue(uiStore.vostId);
  const shikimoriBookmarksVal = useAtomValue(store.shikimoriBookmarks);
  const isLoadingBookmarksVal = useAtomValue(store.isLoadingBookmarks);
  const activeBookmarkFilterVal = useAtomValue(store.activeBookmarkFilter);

  const setAnimeList = useSetAtom(store.animeList);
  const setTitles = useSetAtom(store.titles);
  const setActiveMedia = useSetAtom(playbackStore.activeMedia);
  const setSearchQuery = useSetAtom(store.searchQuery);
  const setImporting = useSetAtom(uiStore.importing);
  const setVostId = useSetAtom(uiStore.vostId);
  const setShikimoriBookmarks = useSetAtom(store.shikimoriBookmarks);
  const setIsLoadingBookmarks = useSetAtom(store.isLoadingBookmarks);
  const setActiveBookmarkFilter = useSetAtom(store.activeBookmarkFilter);

  const loadCatalog = () => {
    libraryService.fetchCatalog()
      .then((episodes: any) => { jotaiStore.set(store.animeList, episodes); })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, "Failed to retrieve catalog: " + err); });
  };

  const loadHistory = () => {
    libraryService.getHistory()
      .then((titles: any) => { jotaiStore.set(store.titles, titles); })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, "Failed to retrieve history: " + err); });
  };

  const loadBookmarks = async () => {
    jotaiStore.set(store.isLoadingBookmarks, true);
    jotaiStore.set(uiStore.globalError, null);
    try {
      const list = await settingsService.shikimoriBookmarks();
      jotaiStore.set(store.shikimoriBookmarks, list);
    } catch (err) {
      console.error("Failed to load Shikimori bookmarks:", err);
      jotaiStore.set(uiStore.globalError, "Не удалось загрузить закладки Shikimori: " + err);
    } finally {
      jotaiStore.set(store.isLoadingBookmarks, false);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadHistory();
  }, []);

  useEffect(() => {
    if (searchQueryVal.trim() === "") {
      loadHistory();
    }
  }, [searchQueryVal]);

  useEffect(() => {
    if (activeMediaVal && !isAndroidRuntime()) {
      document.documentElement.classList.add('playback-active');
      document.body.classList.add('playback-active');
    } else {
      document.documentElement.classList.remove('playback-active');
      document.body.classList.remove('playback-active');
    }
  }, [activeMediaVal]);

  const handleSearch = (overrideQuery?: string) => {
    const query = (overrideQuery !== undefined ? overrideQuery : jotaiStore.get(store.searchQuery)).trim();
    if (!query) return;
    if (query.startsWith("http") && query.includes("jut.su")) {
      const dummyTitle = {
        id: -1,
        title: "Импорт с Jut.su",
        description: query,
        cover_image: ""
      };
      selectTitle(dummyTitle);
      return;
    }
    jotaiStore.set(uiStore.importing, true);
    jotaiStore.set(uiStore.globalError, null);
    libraryService.searchProvider(query, jotaiStore.get(settingsStore.showSettings) ? "animevost" : (jotaiStore.get(settingsStore.searchProvider) || "animevost"))
      .then((titles: any) => { jotaiStore.set(store.titles, titles); })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, "Ошибка поиска: " + err); })
      .finally(() => { jotaiStore.set(uiStore.importing, false); });
  };

  const selectTitle = (title: AnimeTitle) => {
    jotaiStore.set(uiStore.importing, true);
    jotaiStore.set(uiStore.globalError, null);
    libraryService.selectAnime(title)
      .then(() => libraryService.fetchCatalog())
      .then((episodes: any) => {
        jotaiStore.set(store.animeList, episodes);
        if (episodes.length > 0) {
          return episodes;
        } else {
          jotaiStore.set(uiStore.globalError, "Этот провайдер предоставляет только метаданные (поиск/описание) — видеопотоков нет. Используйте AnimeGO, Jut.su или AnimeVost для просмотра.");
          return null;
        }
      })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, "Ошибка при открытии аниме: " + err); })
      .finally(() => { jotaiStore.set(uiStore.importing, false); });
  };

  const importPlaylist = () => {
    const val = jotaiStore.get(uiStore.vostId).trim();
    if (!val) {
      jotaiStore.set(uiStore.globalError, "Укажите числовой ID или URL");
      return;
    }

    const isUrl = val.startsWith("http");
    if (!isUrl) {
      const id = parseInt(val, 10);
      if (isNaN(id) || id <= 0) {
        jotaiStore.set(uiStore.globalError, "Укажите корректный числовой ID или URL");
        return;
      }
    }

    jotaiStore.set(uiStore.importing, true);
    jotaiStore.set(uiStore.globalError, null);
    libraryService.importAnimeVost(val)
      .then(() => {
        jotaiStore.set(uiStore.vostId, "");
        loadCatalog();
      })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, "Ошибка импорта: " + err); })
      .finally(() => { jotaiStore.set(uiStore.importing, false); });
  };

  const isMetadataTitle = (title: AnimeTitle) => {
    return title.description.includes("shikimori.one") ||
           title.description.includes("shikimori.me") ||
           title.description.includes("shikimori") ||
           title.description.includes("bestsimilar.com") ||
           String(title.id).includes("bestsimilar.com") ||
           String(title.id).startsWith("bestsimilar://") ||
           title.description.startsWith("bestsimilar://") ||
           !!(title as any).watch_status;
  };

  const selectTitleWithMetadata = (title: AnimeTitle) => {
    if (isMetadataTitle(title)) {
      jotaiStore.set(uiStore.importing, true);
      jotaiStore.set(uiStore.globalError, null);
      libraryService.selectAnime(title)
        .then((details: any) => {
          jotaiStore.set(uiStore.selectedMetadata, {
            title: details.title || title.title,
            original_title: details.original_title || "",
            cover_image: details.cover_image || title.cover_image,
            description: details.description || title.description || "Нет описания",
            genres: details.genres || [],
            years: details.years || [],
            age_rating: details.age_rating || "",
            recommendations: details.episodes || [],
          });
        })
        .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Ошибка при получении метаданных: ' + err); })
        .finally(() => { jotaiStore.set(uiStore.importing, false); });
      return;
    }
    jotaiStore.set(uiStore.importing, true);
    jotaiStore.set(uiStore.globalError, null);
    libraryService.selectAnime(title)
      .then(() => libraryService.fetchCatalog())
      .then((episodes: any) => {
        jotaiStore.set(store.animeList, episodes);
        if (episodes.length > 0) {
          playbackStore.playAnime(episodes[0].id, {
            anime_title: title.title.split(' - ')[0],
            cover_image: title.cover_image,
            description: title.description,
          });
        } else {
          jotaiStore.set(uiStore.globalError, 'Этот провайдер предоставляет только метаданные — видеопотоков нет. Используйте AnimeGO, Jut.su или AnimeVost для просмотра.');
        }
      })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Ошибка при открытии аниме: ' + err); })
      .finally(() => { jotaiStore.set(uiStore.importing, false); });
  };

  return {
    animeList: animeListVal,
    setAnimeList: (val: Anime[]) => setAnimeList(val),

    titles: titlesVal,
    setTitles: (val: AnimeTitle[]) => setTitles(val),

    activeMedia: activeMediaVal,
    setActiveMedia: (val: string | null) => setActiveMedia(val),

    searchQuery: searchQueryVal,
    setSearchQuery: (val: string) => setSearchQuery(val),

    importing: importingVal,
    setImporting: (val: boolean) => setImporting(val),

    vostId: vostIdVal,
    setVostId: (val: string) => setVostId(val),

    shikimoriBookmarks: shikimoriBookmarksVal,
    setShikimoriBookmarks: (val: any[]) => setShikimoriBookmarks(val),

    isLoadingBookmarks: isLoadingBookmarksVal,
    setIsLoadingBookmarks: (val: boolean) => setIsLoadingBookmarks(val),

    activeBookmarkFilter: activeBookmarkFilterVal,
    setActiveBookmarkFilter: (val: string) => setActiveBookmarkFilter(val),

    loadCatalog,
    loadHistory,
    loadBookmarks,
    handleSearch,
    selectTitle,
    importPlaylist,
    isMetadataTitle,
    selectTitleWithMetadata,
  };
}
