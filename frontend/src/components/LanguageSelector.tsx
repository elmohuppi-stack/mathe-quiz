import { useLanguageStore, type Language } from "../i18n/useTranslation";
import { ThemeToggle } from "./ThemeToggle";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="flex items-center gap-2">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-gray-700 transition-colors hover:border-gray-400"
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
      <ThemeToggle />
    </div>
  );
}
