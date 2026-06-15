import { useState, useEffect } from 'preact/hooks';
import type { Anime, AnimeTitle } from '../types';
import { callNative } from '../lib/ipc';

export function useLibrary(setError: (err: string | null) => void) {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [titles, setTitles] = useState<AnimeTitle[]>([]);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [vostId, setVostId] = useState("");

  const loadCatalog = () => {
    callNative<Anime[]>("fetch_catalog")
      .then(setAnimeList)
      .catch(err => setError("Failed to retrieve catalog: " + err));
  };

  const loadHistory = () => {
    callNative<AnimeTitle[]>("get_history")
      .then(setTitles)
      .catch(err => setError("Failed to retrieve history: " + err));
  };

  useEffect(() => {
    loadCatalog();
    loadHistory();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      loadHistory();
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeMedia) {
      document.body.classList.add('playback-active');
    } else {
      document.body.classList.remove('playback-active');
    }
  }, [activeMedia]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
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
    setImporting(true);
    setError(null);
    callNative<AnimeTitle[]>("search_animevost", query)
      .then(setTitles)
      .catch(err => setError("Ошибка поиска: " + err))
      .finally(() => setImporting(false));
  };

  const selectTitle = (title: AnimeTitle) => {
    setImporting(true);
    setError(null);
    callNative<any>("select_anime", JSON.stringify(title))
      .then(() => callNative<Anime[]>("fetch_catalog"))
      .then(episodes => {
        setAnimeList(episodes);
        if (episodes.length > 0) {
            // Wait for playAnime to be injected or handled separately
            // For now, we return episodes to be handled by the caller
            return episodes;
        } else {
          setError("Этот провайдер предоставляет только метаданные (поиск/описание) — видеопотоков нет. Используйте AnimeGO, Jut.su или AnimeVost для просмотра.");
          return null;
        }
      })
      .catch(err => setError("Ошибка при открытии аниме: " + err))
      .finally(() => setImporting(false));
  };

  const importPlaylist = () => {
    const val = vostId.trim();
    if (!val) {
      setError("Укажите числовой ID или URL");
      return;
    }

    const isUrl = val.startsWith("http");
    if (!isUrl) {
      const id = parseInt(val, 10);
      if (isNaN(id) || id <= 0) {
        setError("Укажите корректный числовой ID или URL");
        return;
      }
    }

    setImporting(true);
    setError(null);
    callNative<any>("import_animevost", val)
      .then(() => {
        setVostId("");
        loadCatalog();
      })
      .catch(err => setError("Ошибка импорта: " + err))
      .finally(() => setImporting(false));
  };

  return {
    animeList, setAnimeList,
    titles, setTitles,
    activeMedia, setActiveMedia,
    searchQuery, setSearchQuery,
    importing, setImporting,
    vostId, setVostId,
    loadCatalog, loadHistory,
    handleSearch, selectTitle, importPlaylist
  };
}
