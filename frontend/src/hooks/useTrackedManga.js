import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchTracked,
  addTrackedApi,
  removeTrackedApi,
  getLatestChapter,
  updateProgressApi,
  fetchAllLatestChapters,
} from "../api";

export function useTrackedManga({ listQuery, sortBy, onToast }) {
  const [trackedManga, setTracked] = useState([]);
  const [chapterMap, setChapterMap] = useState({});
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [cachedCount, setCachedCount] = useState(() =>
    parseInt(localStorage.getItem("mangalog_count") || "6"),
  );

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTracked()
      .then(async (list) => {
        setTracked(list);
        setCachedCount(list.length);
        localStorage.setItem("mangalog_count", String(list.length));
        const map = await fetchAllLatestChapters(list);
        setChapterMap(map);
      })
      .catch((e) => setListError(e.message))
      .finally(() => setListLoading(false));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const list = await fetchTracked();
      setTracked(list);
      const map = await fetchAllLatestChapters(list);
      setChapterMap(map);
      onToast("Chapters refreshed", "success");
    } catch {
      onToast("Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onToast]);

  const handleAdd = useCallback(
    async (manga) => {
      try {
        await addTrackedApi(manga);
        setTracked((prev) => [{ ...manga, readingStatus: "reading" }, ...prev]);
        setRecentlyAdded(manga.id);
        setTimeout(() => setRecentlyAdded(null), 2000);
        onToast(`"${manga.title}" added`, "success");
        getLatestChapter(manga.id).then(async (ch) => {
          if (ch) {
            setChapterMap((prev) => ({ ...prev, [manga.id]: ch }));
            await updateProgressApi(manga.id, ch.chapter);
          }
        });
      } catch (e) {
        onToast(e.message || "Could not add manga");
      }
    },
    [onToast],
  );

  const handleRemove = useCallback(
    async (id) => {
      const prev = trackedManga;
      setTracked((p) => p.filter((m) => m.id !== id));
      try {
        await removeTrackedApi(id);
      } catch {
        setTracked(prev);
      }
    },
    [trackedManga],
  );

  const handleProgressUpdate = useCallback((id, currentChapter) => {
    setTracked((p) =>
      p.map((m) => (m.id === id ? { ...m, currentChapter } : m)),
    );
  }, []);

  const handleStatusChange = useCallback((id, readingStatus) => {
    setTracked((p) =>
      p.map((m) => (m.id === id ? { ...m, readingStatus } : m)),
    );
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const trackedIds = useMemo(
    () => new Set(trackedManga.map((m) => m.id)),
    [trackedManga],
  );

  const { reading, completed } = useMemo(() => {
    const applySort = (list) => {
      const filtered = !listQuery.trim()
        ? list
        : list.filter((m) =>
            m.title.toLowerCase().includes(listQuery.toLowerCase().trim()),
          );

      switch (sortBy) {
        case "alpha":
          return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        case "behind":
          return [...filtered].sort((a, b) => {
            const aGap =
              (chapterMap[a.id]?.chapter || 0) - (a.currentChapter || 0);
            const bGap =
              (chapterMap[b.id]?.chapter || 0) - (b.currentChapter || 0);
            return bGap - aGap;
          });
        case "latest":
          return [...filtered].sort(
            (a, b) =>
              (chapterMap[b.id]?.chapter || 0) -
              (chapterMap[a.id]?.chapter || 0),
          );
        default:
          return [...filtered].sort((a, b) => {
            const aUnread =
              (chapterMap[a.id]?.chapter || 0) > (a.currentChapter || 0)
                ? 1
                : 0;
            const bUnread =
              (chapterMap[b.id]?.chapter || 0) > (b.currentChapter || 0)
                ? 1
                : 0;
            if (bUnread !== aUnread) return bUnread - aUnread;
            return a.title.localeCompare(b.title);
          });
      }
    };

    return {
      reading: applySort(
        trackedManga.filter((m) => m.readingStatus !== "completed"),
      ),
      completed: applySort(
        trackedManga.filter((m) => m.readingStatus === "completed"),
      ),
    };
  }, [trackedManga, chapterMap, listQuery, sortBy]);

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    // State
    trackedManga,
    chapterMap,
    listLoading,
    listError,
    isRefreshing,
    recentlyAdded,
    cachedCount,
    // Derived
    trackedIds,
    reading,
    completed,
    // Handlers
    handleAdd,
    handleRemove,
    handleRefresh,
    handleProgressUpdate,
    handleStatusChange,
  };
}
