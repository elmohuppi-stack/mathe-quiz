import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";

export function LegalFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-200 bg-white/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Mathe-Quiz</p>
        <nav className="flex items-center gap-4">
          <Link
            to="/impressum"
            className="font-medium text-gray-700 hover:text-blue-700 hover:underline"
          >
            {t("legal.imprint")}
          </Link>
          <Link
            to="/datenschutz"
            className="font-medium text-gray-700 hover:text-blue-700 hover:underline"
          >
            {t("legal.privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
