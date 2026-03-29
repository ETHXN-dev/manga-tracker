import { useState, useEffect, useCallback } from "react";
import { searchManga } from "./api";
import { useDebounce } from "./hooks/useDebounce";
import { useTrackedManga } from "./hooks/useTrackedManga";
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
  // ── UI state ──────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState("reading");
  const [listQuery, setListQuery] = useState("");
  const [sortBy, setSortBy] = useState("added");
  const [toast, setToast] = useState(null);

  // ── Toast helper ──────────────────────────────────────────────────────────────

  const showToast = useCallback(
    (msg, type = "error") => setToast({ msg, type }),
    [],
  );

  // ── Tracked manga (all state + handlers live in the hook) ─────────────────────

  const {
    trackedManga,
    chapterMap,
    listLoading,
    listError,
    isRefreshing,
    recentlyAdded,
    cachedCount,
    trackedIds,
    reading,
    completed,
    handleAdd,
    handleRemove,
    handleRefresh,
    handleProgressUpdate,
    handleStatusChange,
  } = useTrackedManga({ listQuery, sortBy, onToast: showToast });

  // Switch to reading tab after adding so the user sees their new manga
  const handleAddAndSwitch = useCallback(
    async (manga) => {
      await handleAdd(manga);
      setActiveTab("reading");
    },
    [handleAdd],
  );

  // ── Search ────────────────────────────────────────────────────────────────────

  const [query, setQuery] = useState("");
  const [searchResults, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

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

  // ── Shared grid props ─────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────────

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
                      onAdd={handleAddAndSwitch}
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
