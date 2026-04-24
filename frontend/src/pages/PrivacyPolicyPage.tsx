import { LegalPageLayout } from "../components/LegalPageLayout";
import {
  getPrivacyPolicyContent,
  hasLegalPlaceholderData,
} from "../content/legalContent";
import { useLanguageStore } from "../i18n/useTranslation";

export function PrivacyPolicyPage() {
  const language = useLanguageStore((state) => state.language);
  const content = getPrivacyPolicyContent(language);

  return (
    <LegalPageLayout
      title={content.title}
      intro={content.intro}
      showDraftNotice={hasLegalPlaceholderData()}
    >
      {content.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {section.title}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-7 text-gray-700">
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </LegalPageLayout>
  );
}
