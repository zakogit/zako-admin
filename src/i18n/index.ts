import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGES = [
  // Language names are endonyms — shown in their own language on purpose.
  { code: 'uz', label: "O'zbekcha", short: 'UZ', intl: 'uz-UZ' }, // i18n-ignore
  { code: 'ru', label: 'Русский', short: 'RU', intl: 'ru-RU' }, // i18n-ignore
  { code: 'en', label: 'English', short: 'EN', intl: 'en-GB' }, // i18n-ignore
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: LanguageCode = 'uz';
const STORAGE_KEY = 'zako-admin-lang';

const isLanguage = (v: unknown): v is LanguageCode => LANGUAGES.some((l) => l.code === v);

function readStoredLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode) — fall through to default
  }
  return DEFAULT_LANGUAGE;
}

// Every `locales/<lang>/<namespace>.json` is bundled eagerly, so adding a page's
// translations never needs a registration step — drop the three JSON files in place.
const modules = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>;

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, json] of Object.entries(modules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  (resources[match[1]] ??= {})[match[2]] = json;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: Object.keys(resources[DEFAULT_LANGUAGE] ?? { common: {} }),
  interpolation: { escapeValue: false }, // React already escapes
  react: { useSuspense: false },
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore — the choice just won't persist
  }
});
document.documentElement.lang = i18n.language;

export function setLanguage(code: LanguageCode) {
  return i18n.changeLanguage(code);
}

/** BCP-47 tag for `Intl` / `toLocale*String` matching the active UI language. */
export function getIntlLocale(): string {
  return LANGUAGES.find((l) => l.code === i18n.language)?.intl ?? 'en-GB';
}

export default i18n;
