const API_BASE = import.meta.env.VITE_API_URL || "/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...options.headers,
    },
  });
  return res;
}

export async function searchManga(query) {
  const res = await apiFetch(`/manga/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Search failed");
  }
  return (await res.json()).data;
}

export async function fetchTracked() {
  const res = await apiFetch(`/tracked`);
  if (!res.ok) throw new Error("Could not load your list");
  return (await res.json()).data;
}

export async function addTrackedApi(manga) {
  const res = await apiFetch(`/tracked`, {
    method: "POST",
    body: JSON.stringify(manga),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Could not save");
  }
}

export async function removeTrackedApi(id) {
  const res = await apiFetch(`/tracked/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not remove manga");
}

export async function getLatestChapter(mangaId) {
  const res = await apiFetch(`/manga/${mangaId}/latest-chapter`);
  if (!res.ok) return null;
  return (await res.json()).data;
}

export async function updateProgressApi(id, currentChapter) {
  const res = await apiFetch(`/tracked/${id}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ currentChapter }),
  });
  if (!res.ok) throw new Error("Could not update progress");
}

export async function updateReadingStatusApi(id, readingStatus) {
  const res = await apiFetch(`/tracked/${id}/reading-status`, {
    method: "PATCH",
    body: JSON.stringify({ readingStatus }),
  });
  if (!res.ok) throw new Error("Could not update status");
}

export async function fetchActivityStats() {
  const res = await apiFetch("/activity/stats");
  if (!res.ok) throw new Error("Could not fetch activity stats");
  return (await res.json()).data;
}

export async function fetchRecentActivity(limit = 15) {
  const res = await apiFetch(`/activity/recent?limit=${limit}`);
  if (!res.ok) throw new Error("Could not fetch recent activity");
  return (await res.json()).data;
}

export async function fetchDayActivity(date) {
  const res = await apiFetch(`/activity/day?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error("Could not fetch day activity");
  return (await res.json()).data;
}

export async function fetchAllLatestChapters(mangaList) {
  const CONCURRENCY = 6;
  const map = {};

  for (let i = 0; i < mangaList.length; i += CONCURRENCY) {
    const batch = mangaList.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((m) => getLatestChapter(m.id)),
    );
    results.forEach((result, j) => {
      map[batch[j].id] = result.status === "fulfilled" ? result.value : null;
    });
  }

  return map;
}
