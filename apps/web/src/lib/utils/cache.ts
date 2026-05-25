function getStorage(storage?: Storage): Storage | undefined {
  if (storage) {
    return storage
  }
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export function readJsonCache<T>(key: string, fallback: T, storage?: Storage): T {
  try {
    const raw = getStorage(storage)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJsonCache<T>(key: string, value: T, storage?: Storage): void {
  getStorage(storage)?.setItem(key, JSON.stringify(value))
}
