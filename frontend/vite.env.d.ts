/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LEGAL_NAME?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_LEGAL_ADDRESS_LINE_1?: string;
  readonly VITE_LEGAL_ADDRESS_LINE_2?: string;
  readonly VITE_LEGAL_COUNTRY?: string;
  readonly VITE_LEGAL_CONTENT_RESPONSIBLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
