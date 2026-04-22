import { create } from "zustand";
import en from "./en.json";
import de from "./de.json";

export type Language = "en" | "de";

const translations = {
  en,
  de,
};

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  loadFromStorage: () => void;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  language: "en",

  setLanguage: (lang: Language) => {
    localStorage.setItem("language", lang);
    set({ language: lang });
  },

  t: (key: string) => {
    const state = get();
    const keys = key.split(".");
    let value: any = translations[state.language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
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
}));

export function useTranslation() {
  // Subscribe to language changes to trigger re-renders
  useLanguageStore((state) => state.language);
  // Return the current t function which reads from the store
  return { t: useLanguageStore.getState().t };
}
