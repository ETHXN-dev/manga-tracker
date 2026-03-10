import { useState, useEffect, useCallback, useMemo } from "react";
import {
  searchManga,
  fetchTracked,
  addTrackedApi,
  removeTrackedApi,
  getLatestChapter,
  updateProgressApi,
  fetchAllLatestChapters,
} from "./api";
import { useDebounce } from "./hooks/useDebounce";
import KanjiBackground from "./components/KanjiBackground";
import Header from "./components/Header";
import NowReadingTicker from "./components/NowReadingTicker";
import Toolbar from "./components/Toolbar";
import MangaGrid from "./components/MangaGrid";
import SearchBar from "./components/SearchBar";
import SearchResultCard from "./components/SearchResultCard";
import NotifierStatus from "./components/NotifierStatus";
import ActivityHeatmap from "./components/ActivityHeatmap";
import ActivityStats from "./components/ActivityStats";
import RecentReads from "./components/RecentReads";
import Toast from "./components/Toast";

export default function App() {
  const [query, setQuery] = useState("");
  const [searchResults, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [activeTab, setActiveTab] = useState("reading");

  const [trackedManga, setTracked] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [chapterMap, setChapterMap] = useState({});
  const [cachedCount, setCachedCount] = useState(() =>
    parseInt(localStorage.getItem("mangalog_count") || "6"),
  );

  const [listQuery, setListQuery] = useState("");
  const [sortBy, setSortBy] = useState("added");
  const [toast, setToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = useCallback(
    (msg, type = "error") => setToast({ msg, type }),
    [],
  );

  // ── Data loading ───────────────────────────────────────────────────────────

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

  // ── Search ─────────────────────────────────────────────────────────────────

  const debouncedQuery = useDebounce(query, 500);

  const performSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      setResults(await searchManga(q));
    } catch (e) {
      setSearchError(e.message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const list = await fetchTracked();
      setTracked(list);
      const map = await fetchAllLatestChapters(list);
      setChapterMap(map);
      showToast("Chapters refreshed", "success");
    } catch {
      showToast("Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, showToast]);

  const handleAdd = useCallback(
    async (manga) => {
      try {
        await addTrackedApi(manga);
        setTracked((p) => [{ ...manga, readingStatus: "reading" }, ...p]);
        setRecentlyAdded(manga.id);
        setTimeout(() => setRecentlyAdded(null), 2000);
        setActiveTab("reading");
        showToast(`"${manga.title}" added`, "success");
        getLatestChapter(manga.id).then(async (ch) => {
          if (ch) {
            setChapterMap((prev) => ({ ...prev, [manga.id]: ch }));
            await updateProgressApi(manga.id, ch.chapter);
          }
        });
      } catch (e) {
        showToast(e.message || "Could not add manga");
      }
    },
    [showToast],
  );

  const handleRemove = useCallback(
    async (id) => {
      const prev = trackedManga;
      setTracked((p) => p.filter((m) => m.id !== id)); // optimistic
      try {
        await removeTrackedApi(id);
      } catch {
        setTracked(prev); // rollback
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

  // ── Derived state ──────────────────────────────────────────────────────────

  const trackedIds = useMemo(
    () => new Set(trackedManga.map((m) => m.id)),
    [trackedManga],
  );

  const { reading, completed } = useMemo(() => {
    const applySort = (list) => {
      let result = !listQuery.trim()
        ? list
        : list.filter((m) =>
            m.title.toLowerCase().includes(listQuery.toLowerCase().trim()),
          );

      switch (sortBy) {
        case "alpha":
          return [...result].sort((a, b) => a.title.localeCompare(b.title));
        case "behind":
          return [...result].sort((a, b) => {
            const aGap =
              (chapterMap[a.id]?.chapter || 0) - (a.currentChapter || 0);
            const bGap =
              (chapterMap[b.id]?.chapter || 0) - (b.currentChapter || 0);
            return bGap - aGap;
          });
        case "latest":
          return [...result].sort(
            (a, b) =>
              (chapterMap[b.id]?.chapter || 0) -
              (chapterMap[a.id]?.chapter || 0),
          );
        default:
          return [...result].sort((a, b) => {
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

  // ── Shared grid props ──────────────────────────────────────────────────────

  const sharedGridProps = {
    listLoading,
    cachedCount,
    listQuery,
    chapterMap,
    onRemove: handleRemove,
    onProgressUpdate: handleProgressUpdate,
    onStatusChange: handleStatusChange,
    onSwitchToSearch: () => setActiveTab("search"),
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app" style={{ position: "relative", zIndex: 1 }}>
      <KanjiBackground />

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <Header />

      <NowReadingTicker manga={trackedManga} />

      <Toolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reading={reading}
        completed={completed}
        listQuery={listQuery}
        setListQuery={setListQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        listLoading={listLoading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <main className="main">
        <div className="grid-section">
          {listError && <p className="error-msg">{listError}</p>}

          {activeTab === "reading" && (
            <MangaGrid
              {...sharedGridProps}
              list={reading}
              emptyMessage="You're not reading anything yet."
              showAddButton
              recentlyAddedId={recentlyAdded}
            />
          )}

          {activeTab === "completed" && (
            <MangaGrid
              {...sharedGridProps}
              list={completed}
              emptyMessage="No completed manga yet."
              showAddButton={false}
              recentlyAddedId={null}
            />
          )}

          {activeTab === "activity" && (
            <>
              <ActivityStats />
              <ActivityHeatmap />
              <RecentReads />
              <NotifierStatus />
            </>
          )}

          {activeTab === "search" && (
            <section>
              <SearchBar
                value={query}
                onChange={setQuery}
                isSearching={isSearching}
              />
              {searchError && <p className="error-msg">{searchError}</p>}
              {searchResults.length > 0 && (
                <div className="results-list">
                  {searchResults.map((m) => (
                    <SearchResultCard
                      key={m.id}
                      manga={m}
                      onAdd={handleAdd}
                      isTracked={trackedIds.has(m.id)}
                    />
                  ))}
                </div>
              )}
              {!isSearching &&
                query &&
                searchResults.length === 0 &&
                !searchError && (
                  <p className="no-results">No results for "{query}"</p>
                )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
