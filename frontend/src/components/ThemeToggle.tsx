import { useLanguageStore } from "../i18n/useTranslation";
import { useThemeStore } from "../store/themeStore";

const buttonCopy = {
  en: {
    dark: "Dark",
    light: "Light",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
  },
  de: {
    dark: "Dunkel",
    light: "Hell",
    switchToDark: "Zu dunklem Modus wechseln",
    switchToLight: "Zu hellem Modus wechseln",
  },
} as const;

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const language = useLanguageStore((state) => state.language);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const copy = buttonCopy[language];
  const title = nextTheme === "dark" ? copy.switchToDark : copy.switchToLight;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-button inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition"
      aria-label={title}
      title={title}
    >
      {nextTheme === "dark" ? copy.dark : copy.light}
    </button>
  );
}
