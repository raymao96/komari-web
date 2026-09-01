import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import {
  ADMIN_UI_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  readStoredLanguage,
  resolveUiLanguage,
  writeLanguageCookie,
  type AdminUiLanguage,
} from "@/utils/language";

const localeLoaders: Record<
  AdminUiLanguage,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  "en-US": () => import("./locales/en.json"),
  "zh-CN": () => import("./locales/zh_CN.json"),
  "zh-TW": () => import("./locales/zh_TW.json"),
  "ja-JP": () => import("./locales/ja_JP.json"),
};

const localeLoads = new Map<AdminUiLanguage, Promise<Record<string, unknown>>>();

const i18n = i18next;

export async function loadUiLocale(language: string) {
  const lng = resolveUiLanguage(language);
  let pending = localeLoads.get(lng);
  if (!pending) {
    pending = localeLoaders[lng]().then((mod) => mod.default);
    localeLoads.set(lng, pending);
  }
  const data = await pending;
  if (i18n.isInitialized) {
    i18n.addResourceBundle(lng, "translation", data, true, true);
  }
  return lng;
}

export function preloadUiLocales() {
  return Promise.all(
    ADMIN_UI_LANGUAGES.map((item) => loadUiLocale(item.code)),
  );
}

export async function changeUiLanguage(language: string) {
  const lng = await loadUiLocale(language);
  await i18n.changeLanguage(lng);
  writeLanguageCookie(lng);
  return lng;
}

const initialLng = resolveUiLanguage(
  readStoredLanguage() ||
    (typeof navigator !== "undefined" ? navigator.language : "en-US"),
);

i18n.on("languageChanged", (language) => {
  writeLanguageCookie(language);
});

export const i18nReady = loadUiLocale(initialLng).then(async (lng) => {
  const data = await localeLoads.get(lng);
  writeLanguageCookie(lng);
  await i18n.use(LanguageDetector).use(initReactI18next).init({
    lng,
    fallbackLng: lng,
    supportedLngs: ADMIN_UI_LANGUAGES.map((item) => item.code),
    resources: data
      ? {
          [lng]: { translation: data },
        }
      : undefined,
    partialBundledLanguages: true,
    load: "currentOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: (detected) => resolveUiLanguage(detected),
    },
  });
});

export default i18n;
