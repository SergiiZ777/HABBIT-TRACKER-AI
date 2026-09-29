import { useSyncExternalStore } from 'react';

import Storage from '@/lib/kv-storage';

const STORAGE_KEY = 'onboarding:completed:v1';

function load(): boolean {
  try {
    return Storage.getItemSync(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let completed = load();
const listeners = new Set<() => void>();

export function completeOnboarding() {
  completed = true;
  try {
    Storage.setItemSync(STORAGE_KEY, '1');
  } catch {
    // Worst case onboarding shows again next launch — not destructive.
  }
  listeners.forEach((l) => l());
}

export function useOnboardingCompleted(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => completed
  );
}
