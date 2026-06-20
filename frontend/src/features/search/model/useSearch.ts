import { useAtomValue, useSetAtom } from 'jotai';
import { useServices } from '../../../shared/di/context';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as store from './store';
import * as uiStore from '../../../entities/ui';

export function useAltSearch() {
  const { libraryService } = useServices();

  // Reactive reads
  const showAltSearchVal = useAtomValue(store.showAltSearch);
  const altSearchTitleVal = useAtomValue(store.altSearchTitle);
  const altSearchResultsVal = useAtomValue(store.altSearchResults);
  const isLoadingAltSearchVal = useAtomValue(store.isLoadingAltSearch);

  const setShowAltSearch = useSetAtom(store.showAltSearch);
  const setAltSearchTitle = useSetAtom(store.altSearchTitle);
  const setAltSearchResults = useSetAtom(store.altSearchResults);
  const setIsLoadingAltSearch = useSetAtom(store.isLoadingAltSearch);

  const triggerAltSearch = async (titleName: string) => {
    const query = titleName.split(" / ")[0].split(" - ")[0].trim();
    jotaiStore.set(store.altSearchTitle, query);
    jotaiStore.set(store.showAltSearch, true);
    jotaiStore.set(store.isLoadingAltSearch, true);
    jotaiStore.set(store.altSearchResults, []);
    try {
      const results = await libraryService.searchAll(query);
      jotaiStore.set(store.altSearchResults, results);
    } catch (err) {
      console.error("Failed to fetch alternatives:", err);
      jotaiStore.set(uiStore.globalError, "Ошибка поиска видеопотоков: " + err);
    } finally {
      jotaiStore.set(store.isLoadingAltSearch, false);
    }
  };

  return {
    showAltSearch: showAltSearchVal,
    setShowAltSearch,

    altSearchTitle: altSearchTitleVal,
    setAltSearchTitle,

    altSearchResults: altSearchResultsVal,
    setAltSearchResults,

    isLoadingAltSearch: isLoadingAltSearchVal,
    setIsLoadingAltSearch,

    triggerAltSearch,
  };
}
