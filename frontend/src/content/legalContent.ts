import type { Language } from "../i18n/useTranslation";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocumentContent {
  title: string;
  intro: string;
  sections: LegalSection[];
}

const PLACEHOLDER_VALUES = new Set([
  "Bitte Betreibername ergänzen",
  "Bitte Straße und Hausnummer ergänzen",
  "Bitte Postleitzahl und Ort ergänzen",
  "Bitte Land ergänzen",
  "Bitte Kontakt-E-Mail ergänzen",
  "Bitte verantwortliche Person ergänzen",
]);

const legalContact = {
  operatorName:
    import.meta.env.VITE_LEGAL_NAME || "Bitte Betreibername ergänzen",
  addressLines: [
    import.meta.env.VITE_LEGAL_ADDRESS_LINE_1 ||
      "Bitte Straße und Hausnummer ergänzen",
    import.meta.env.VITE_LEGAL_ADDRESS_LINE_2 ||
      "Bitte Postleitzahl und Ort ergänzen",
    import.meta.env.VITE_LEGAL_COUNTRY || "Bitte Land ergänzen",
  ].filter(Boolean),
  email: import.meta.env.VITE_LEGAL_EMAIL || "Bitte Kontakt-E-Mail ergänzen",
  contentResponsible:
    import.meta.env.VITE_LEGAL_CONTENT_RESPONSIBLE ||
    "Bitte verantwortliche Person ergänzen",
  website: "https://mathe-quiz.elmarhepp.de",
  updatedAt: "24.04.2026",
};

export function hasLegalPlaceholderData(): boolean {
  return [
    legalContact.operatorName,
    legalContact.email,
    legalContact.contentResponsible,
    ...legalContact.addressLines,
  ].some((value) => PLACEHOLDER_VALUES.has(value));
}

export function getImprintContent(language: Language): LegalDocumentContent {
  if (language === "de") {
    return {
      title: "Impressum",
      intro: hasLegalPlaceholderData()
        ? "Diese Seite stellt die Anbieterkennzeichnung fuer Mathe-Quiz bereit. Vor dem Livegang muessen eventuell noch Platzhalter fuer Betreiber, Anschrift und E-Mail durch die echten Angaben ersetzt werden."
        : "Diese Seite stellt die Anbieterkennzeichnung fuer Mathe-Quiz bereit.",
      sections: [
        {
          title: "Anbieter",
          paragraphs: [
            legalContact.operatorName,
            ...legalContact.addressLines,
            legalContact.website,
          ],
        },
        {
          title: "Kontakt",
          paragraphs: [
            `E-Mail: ${legalContact.email}`,
            "Bitte ergaenzen Sie hier bei Bedarf weitere Kontaktwege wie Telefonnummer oder Kontaktformular.",
          ],
        },
        {
          title: "Verantwortlich fuer Inhalte",
          paragraphs: [
            `${legalContact.contentResponsible}`,
            ...legalContact.addressLines,
          ],
        },
        {
          title: "Haftung fuer Inhalte",
          paragraphs: [
            "Die Inhalte dieser Website wurden mit groesstmoeglicher Sorgfalt erstellt. Fuer die Richtigkeit, Vollstaendigkeit und Aktualitaet der Inhalte wird jedoch keine Gewaehr uebernommen.",
          ],
        },
        {
          title: "Haftung fuer Links",
          paragraphs: [
            "Sofern diese Website externe Links enthaelt, wird fuer deren Inhalte keine Haftung uebernommen. Fuer die Inhalte der verlinkten Seiten sind ausschliesslich deren Betreiber verantwortlich.",
          ],
        },
        {
          title: "Urheberrecht",
          paragraphs: [
            "Die durch den Betreiber erstellten Inhalte und Werke auf dieser Website unterliegen dem deutschen Urheberrecht. Beitraege Dritter sind als solche zu kennzeichnen.",
          ],
        },
        {
          title: "Verbraucherstreitbeilegung",
          paragraphs: [
            "Es besteht keine Verpflichtung und keine Bereitschaft, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, sofern dies nicht gesetzlich vorgeschrieben ist.",
            `Stand: ${legalContact.updatedAt}`,
          ],
        },
      ],
    };
  }

  return {
    title: "Legal notice",
    intro: hasLegalPlaceholderData()
      ? "This page provides the provider information for Mathe-Quiz. Before going live, replace any remaining placeholders for operator name, address, and email with the real legal details."
      : "This page provides the provider information for Mathe-Quiz.",
    sections: [
      {
        title: "Provider",
        paragraphs: [
          legalContact.operatorName,
          ...legalContact.addressLines,
          legalContact.website,
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          `Email: ${legalContact.email}`,
          "Add any other relevant contact channel here, such as a phone number or contact form.",
        ],
      },
      {
        title: "Responsible for content",
        paragraphs: [
          legalContact.contentResponsible,
          ...legalContact.addressLines,
        ],
      },
      {
        title: "Liability for content",
        paragraphs: [
          "The content of this website has been created with great care. However, no guarantee is given for correctness, completeness, or up-to-dateness.",
        ],
      },
      {
        title: "Liability for links",
        paragraphs: [
          "If this website contains links to external sites, no liability is assumed for their content. The operators of those sites are solely responsible for their content.",
        ],
      },
      {
        title: "Copyright",
        paragraphs: [
          "Content and works created by the operator on this website are subject to German copyright law. Third-party material must be identified as such.",
        ],
      },
      {
        title: "Consumer dispute resolution",
        paragraphs: [
          "There is no obligation and no willingness to participate in dispute resolution proceedings before a consumer arbitration board unless this is required by law.",
          `Last updated: ${legalContact.updatedAt}`,
        ],
      },
    ],
  };
}

export function getPrivacyPolicyContent(
  language: Language,
): LegalDocumentContent {
  if (language === "de") {
    return {
      title: "Datenschutz",
      intro: hasLegalPlaceholderData()
        ? "Diese Datenschutzerklaerung beschreibt die Verarbeitung personenbezogener Daten bei der Nutzung von Mathe-Quiz. Sie basiert auf dem aktuellen technischen Stand dieses Projekts und sollte vor dem Livegang noch mit den finalen Betreiber- und Kontaktdaten geprueft werden."
        : "Diese Datenschutzerklaerung beschreibt die Verarbeitung personenbezogener Daten bei der Nutzung von Mathe-Quiz auf Basis des aktuellen technischen Projektstands.",
      sections: [
        {
          title: "Verantwortliche Stelle",
          paragraphs: [
            legalContact.operatorName,
            ...legalContact.addressLines,
            `Kontakt fuer Datenschutzanfragen: ${legalContact.email}`,
          ],
        },
        {
          title: "Welche Daten verarbeitet werden",
          items: [
            "Kontodaten wie E-Mail-Adresse und das gehashte Passwort fuer Registrierung und Anmeldung.",
            "Trainingsdaten wie Sessions, Antworten, Antwortzeiten und Modulfortschritt.",
            "Technische Verbindungsdaten, die im Rahmen des Serverbetriebs oder von Sicherheitslogs anfallen koennen.",
            "Technisch notwendige lokale Browserdaten wie Sprachpraeferenz und Authentifizierungs-Token im Local Storage.",
          ],
        },
        {
          title: "Zwecke und Rechtsgrundlagen",
          items: [
            "Bereitstellung des Benutzerkontos und der Trainingsfunktionen, Art. 6 Abs. 1 lit. b DSGVO.",
            "Speicherung von Lernfortschritt und Historie zur Nutzung der Anwendung, Art. 6 Abs. 1 lit. b DSGVO.",
            "Sicherer und stabiler Betrieb der Website, Art. 6 Abs. 1 lit. f DSGVO.",
          ],
        },
        {
          title: "Empfaenger und eingesetzte Dienste",
          items: [
            "Hosting der Produktivumgebung ist laut Projektstand bei Hetzner vorgesehen.",
            "Das Backend nutzt einen internen Python-Validierungsdienst fuer Algebraaufgaben. Dieser verarbeitet Aufgabeninhalt nur zur mathematischen Pruefung innerhalb der Anwendung.",
            "Es sind derzeit keine Analyse-, Marketing- oder Trackingdienste im Frontend vorgesehen.",
          ],
        },
        {
          title: "Speicherdauer",
          paragraphs: [
            "Kontodaten und Trainingsdaten werden grundsaetzlich so lange gespeichert, wie das Benutzerkonto aktiv benoetigt wird oder gesetzliche Aufbewahrungspflichten bestehen.",
            "Technische Logs sollten vor dem Produktivbetrieb mit einer klaren, moeglichst kurzen Retention versehen werden.",
          ],
        },
        {
          title: "Cookies und lokale Speicherung",
          paragraphs: [
            "Die Anwendung verwendet nach aktuellem Stand keine nicht notwendigen Tracking-Cookies. Im Browser werden jedoch technisch notwendige Daten wie Spracheinstellung und Authentifizierungs-Token lokal gespeichert, damit Anmeldung und Nutzung der Anwendung funktionieren.",
          ],
        },
        {
          title: "Ihre Rechte",
          items: [
            "Recht auf Auskunft ueber die verarbeiteten personenbezogenen Daten.",
            "Recht auf Berichtigung unrichtiger Daten.",
            "Recht auf Loeschung oder Einschraenkung der Verarbeitung im gesetzlichen Rahmen.",
            "Recht auf Datenuebertragbarkeit, soweit die Voraussetzungen vorliegen.",
            "Recht auf Beschwerde bei einer Datenschutzaufsichtsbehoerde.",
          ],
        },
        {
          title: "Kontakt",
          paragraphs: [
            `Fuer Datenschutzanfragen nutzen Sie bitte folgende E-Mail-Adresse: ${legalContact.email}`,
            `Stand: ${legalContact.updatedAt}`,
          ],
        },
      ],
    };
  }

  return {
    title: "Privacy policy",
    intro: hasLegalPlaceholderData()
      ? "This privacy policy describes how personal data is processed when using Mathe-Quiz. It reflects the current technical state of the project and should be checked once more with the final operator and contact details before production use."
      : "This privacy policy describes how personal data is processed when using Mathe-Quiz based on the current technical project setup.",
    sections: [
      {
        title: "Controller",
        paragraphs: [
          legalContact.operatorName,
          ...legalContact.addressLines,
          `Contact for privacy requests: ${legalContact.email}`,
        ],
      },
      {
        title: "What data is processed",
        items: [
          "Account data such as email address and hashed password for registration and login.",
          "Training data such as sessions, submitted answers, response times, and module progress.",
          "Technical connection data that may occur during server operation or security logging.",
          "Technically required browser storage such as language preference and authentication token in local storage.",
        ],
      },
      {
        title: "Purposes and legal bases",
        items: [
          "Providing the user account and training features, Art. 6(1)(b) GDPR.",
          "Storing learning progress and history to operate the application, Art. 6(1)(b) GDPR.",
          "Operating the website securely and reliably, Art. 6(1)(f) GDPR.",
        ],
      },
      {
        title: "Recipients and services used",
        items: [
          "According to the current project setup, production hosting is planned with Hetzner.",
          "The backend uses an internal Python validation service for algebra tasks. It only processes task content for mathematical validation inside the application.",
          "No analytics, marketing, or tracking services are currently planned in the frontend.",
        ],
      },
      {
        title: "Storage duration",
        paragraphs: [
          "Account and training data are stored as long as the user account is actively required or statutory retention obligations apply.",
          "Technical logs should be given a clear and preferably short retention period before production use.",
        ],
      },
      {
        title: "Cookies and local storage",
        paragraphs: [
          "The current application does not use non-essential tracking cookies. However, technically necessary information such as language preference and authentication token is stored locally in the browser so login and use of the application work correctly.",
        ],
      },
      {
        title: "Your rights",
        items: [
          "Right of access to the personal data processed about you.",
          "Right to rectification of inaccurate data.",
          "Right to erasure or restriction of processing within the legal framework.",
          "Right to data portability where the legal requirements are met.",
          "Right to lodge a complaint with a supervisory authority.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          `For privacy-related requests, please use the following email address: ${legalContact.email}`,
          `Last updated: ${legalContact.updatedAt}`,
        ],
      },
    ],
  };
}
