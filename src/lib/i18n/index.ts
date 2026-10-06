import { useSyncExternalStore } from 'react';

import { da } from './da';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';
import { uk } from './uk';
import type { Dictionary } from './types';
import Storage from '@/lib/kv-storage';

export type { Dictionary } from './types';
export type Locale = 'en' | 'uk' | 'da' | 'ru' | 'es' | 'de';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'uk', 'da', 'ru', 'es', 'de'];

/** Native display name for each language, used in the language picker. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  uk: 'Українська',
  da: 'Dansk',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
};

/** BCP-47 tag per locale, for Intl/toLocaleDateString calls that should follow the app's chosen
 * language rather than the device's (they'd otherwise silently stay in the device's language). */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  uk: 'uk-UA',
  da: 'da-DK',
  ru: 'ru-RU',
  es: 'es-ES',
  de: 'de-DE',
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, uk, da, ru, es, de };

const STORAGE_KEY = 'locale:v1';

function isSupportedLocale(code: string | null | undefined): code is Locale {
  return !!code && (SUPPORTED_LOCALES as string[]).includes(code);
}

function loadLocale(): Locale {
  try {
    const stored = Storage.getItemSync(STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // Corrupt or unavailable storage — fall through to the default.
  }
  return 'en';
}

let locale: Locale = loadLocale();
const listeners = new Set<() => void>();

export function setLocale(next: Locale) {
  locale = next;
  try {
    Storage.setItemSync(STORAGE_KEY, next);
  } catch {
    // Preference just won't persist across restarts — not worth failing the switch over.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, () => locale);
}

/** The active locale's BCP-47 tag, for `toLocaleDateString`/`toLocaleTimeString` calls. */
export function useLocaleTag(): string {
  return LOCALE_TAGS[useLocale()];
}

/** The active locale's translation dictionary. */
export function useT(): Dictionary {
  return DICTIONARIES[useLocale()];
}

/** Current translation dictionary, outside of React (e.g. for daily-nudge.ts's background scheduling). */
export function getT(): Dictionary {
  return DICTIONARIES[locale];
}

/** Current BCP-47 locale tag, outside of React (e.g. for smart-reminder.ts's background scheduling). */
export function getLocaleTag(): string {
  return LOCALE_TAGS[locale];
}

/** Registers a plain (non-React) listener that fires on every locale change. Returns an unsubscribe function. */
export function onLocaleChange(listener: () => void): () => void {
  return subscribe(listener);
}
