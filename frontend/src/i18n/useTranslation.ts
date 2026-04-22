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
  loadFromStorage: () => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
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
}));

export function useTranslation() {
  // Subscribe to language changes
  const language = useLanguageStore((state) => state.language);

  // Return a t function that uses the current language
  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return { t };
}
