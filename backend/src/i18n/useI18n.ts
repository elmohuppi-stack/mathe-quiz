import en from "./en.json" assert { type: "json" };
import de from "./de.json" assert { type: "json" };

export type Language = "en" | "de";

const translations = { en, de };

/**
 * Detects language from Accept-Language header
 * Falls back to 'en' if not supported
 */
export function detectLanguage(acceptLanguageHeader?: string): Language {
  if (!acceptLanguageHeader) return "en";

  const languages = acceptLanguageHeader
    .split(",")
    .map((lang) => lang.split(";")[0].trim().split("-")[0].toLowerCase());

  if (languages.includes("de")) return "de";
  if (languages.includes("en")) return "en";

  return "en";
}

/**
 * Get translation for a given path (e.g., "errors.auth.invalid_credentials")
 */
export function getTranslation(
  language: Language,
  path: string,
  fallback?: string,
): string {
  const keys = path.split(".");
  let current: any = translations[language];

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return fallback || path;
    }
  }

  return typeof current === "string" ? current : fallback || path;
}

/**
 * Create a translator function for a specific language
 */
export function createTranslator(language: Language) {
  return (path: string, fallback?: string): string => {
    return getTranslation(language, path, fallback);
  };
}

/**
 * Extract language from request and return translator
 */
export function getLanguageFromRequest(request: any): Language {
  return detectLanguage(request.headers["accept-language"]);
}

export function getTranslatorFromRequest(request: any) {
  const language = getLanguageFromRequest(request);
  return createTranslator(language);
}
