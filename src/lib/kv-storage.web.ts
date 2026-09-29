// expo-sqlite's web backend needs cross-origin-isolation headers (SharedArrayBuffer)
// that a plain dev/static server doesn't send. Our storage needs are a single JSON
// blob, so plain localStorage is simpler and needs no special headers.
const Storage = {
  getItemSync(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItemSync(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage unavailable (e.g. private browsing) — state stays in-memory for this session.
    }
  },
};

export default Storage;
