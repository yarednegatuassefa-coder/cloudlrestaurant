const storageKey = "cloud-l-favorites-v1";
const emptyFavorites: string[] = [];
let favoriteSnapshot = emptyFavorites;
let initialized = false;
let storageListenerAttached = false;
const subscribers = new Set<() => void>();

function readStoredFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) return emptyFavorites;
    return [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
  } catch {
    return emptyFavorites;
  }
}

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function initialize() {
  if (initialized) return;
  initialized = true;
  if (typeof window !== "undefined") favoriteSnapshot = readStoredFavorites();
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== null && event.key !== storageKey) return;
  const next = readStoredFavorites();
  if (next.length === favoriteSnapshot.length && next.every((id, index) => id === favoriteSnapshot[index])) return;
  favoriteSnapshot = next;
  notifySubscribers();
}

export function getFavoriteIdsSnapshot() {
  return favoriteSnapshot;
}

export function getServerFavoriteIdsSnapshot() {
  return emptyFavorites;
}

export function subscribeToFavoriteIds(subscriber: () => void) {
  subscribers.add(subscriber);
  const wasInitialized = initialized;
  initialize();
  if (!wasInitialized) subscriber();

  if (typeof window !== "undefined" && !storageListenerAttached) {
    window.addEventListener("storage", handleStorageChange);
    storageListenerAttached = true;
  }

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && typeof window !== "undefined" && storageListenerAttached) {
      window.removeEventListener("storage", handleStorageChange);
      storageListenerAttached = false;
    }
  };
}

export function toggleFavoriteId(id: string) {
  if (!id.trim()) return;
  initialize();
  favoriteSnapshot = favoriteSnapshot.includes(id)
    ? favoriteSnapshot.filter((favoriteId) => favoriteId !== id)
    : [...favoriteSnapshot, id];
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(favoriteSnapshot));
  } catch {
    // Keep the favorite available for this page view if browser storage is unavailable.
  }
  notifySubscribers();
}
