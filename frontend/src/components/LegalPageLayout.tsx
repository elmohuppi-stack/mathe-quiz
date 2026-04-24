import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../store/authStore";

interface LegalPageLayoutProps {
  title: string;
  intro: string;
  children: ReactNode;
  showDraftNotice?: boolean;
}

export function LegalPageLayout({
  title,
  intro,
  children,
  showDraftNotice = false,
}: LegalPageLayoutProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  className="inline-flex text-sm font-medium text-blue-700 hover:underline"
                >
                  {t("legal.back_to_app")}
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    {intro}
                  </p>
                </div>
              </div>
              <LanguageSelector />
            </div>
          </div>

          {showDraftNotice ? (
            <div className="border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900 sm:px-8">
              <p className="font-semibold">{t("legal.draft_notice_title")}</p>
              <p className="mt-1 leading-6">{t("legal.draft_notice_body")}</p>
            </div>
          ) : null}

          <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
