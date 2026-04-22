import { useLanguageStore, type Language } from "../i18n/useTranslation";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className="px-3 py-2 border border-gray-300 rounded hover:border-gray-400 cursor-pointer bg-white"
    >
      <option value="en">English</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
