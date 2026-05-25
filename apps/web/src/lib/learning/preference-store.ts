import type { PreferenceModel } from '../agent/agent-types'
import { EMPTY_PREFERENCE_MODEL } from './contextual-bandit'

const STORAGE_KEY = 'pufferpilot.preference-model.v1'

function getStorage(storage?: Storage): Storage | undefined {
  if (storage) {
    return storage
  }
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export function loadPreferenceModel(storage?: Storage): PreferenceModel {
  const resolvedStorage = getStorage(storage)

  if (!resolvedStorage) {
    return EMPTY_PREFERENCE_MODEL
  }

  try {
    const raw = resolvedStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return EMPTY_PREFERENCE_MODEL
    }
    const parsed = JSON.parse(raw) as PreferenceModel
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) {
      return EMPTY_PREFERENCE_MODEL
    }
    return parsed
  } catch {
    return EMPTY_PREFERENCE_MODEL
  }
}

export function savePreferenceModel(model: PreferenceModel, storage?: Storage): void {
  getStorage(storage)?.setItem(STORAGE_KEY, JSON.stringify(model))
}
