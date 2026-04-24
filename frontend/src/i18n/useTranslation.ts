import { useCallback } from "react";
import { create } from "zustand";
import en from "./en.json";
import de from "./de.json";

export type Language = "en" | "de";

const translations: Record<Language, Record<string, string>> = {
  en,
  de,
};

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  loadFromStorage: () => void;
}

type LanguageStoreSetter = (partial: Partial<LanguageStore>) => void;

export const useLanguageStore = create<LanguageStore>(
  (set: LanguageStoreSetter) => ({
    language: "en",

    setLanguage: (lang: Language) => {
      localStorage.setItem("language", lang);
      set({ language: lang });
    },

    loadFromStorage: () => {
      const saved = localStorage.getItem("language");
      if (saved === "en" || saved === "de") {
        set({ language: saved });
      } else {
        // Detect browser language
        const browserLang = navigator.language.split("-")[0];
        const lang: Language = browserLang === "de" ? "de" : "en";
        set({ language: lang });
        localStorage.setItem("language", lang);
      }
    },
  }),
);

export function useTranslation() {
  // Subscribe to language changes
  const language = useLanguageStore(
    (state: LanguageStore) => state.language,
  ) as Language;

  // Return a t function that uses the current language
  const t = useCallback(
    (key: string): string => {
      return translations[language][key] ?? key;
    },
    [language],
  );

  return { t };
}
