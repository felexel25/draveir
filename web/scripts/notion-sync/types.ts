// Forma mínima de las propiedades de Notion que consumimos.
// No dependemos del SDK aquí para poder testear con fixtures simples.
export interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

export interface SagaData {
  slug: string;
  name: string;
  description: string;
  order: number;
}

// Una fase agrupa historias por momento de publicación, no por mundo: es el eje
// del calendario, mientras que la saga es el eje narrativo.
export interface PhaseData {
  slug: string;
  name: string;
  description: string;
  order: number;
}

export interface NovelData {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  format: string | null;   // Microrrelato | Relato | Relato largo | Novela corta | Novela
  categories: string[];
  tags: string[];
  featured: boolean;
  hidden: boolean;          // fuera de listados y sitemap; solo se llega buscándola o invocándola
  saga: string | null;      // slug de la saga, o null
  sagaOrder: number | null; // posición de lectura dentro de la saga
  phase: string | null;         // slug de la fase del calendario, o null
  phaseOrder: number | null;    // posición dentro de la fase
  releaseWindow: string | null; // texto libre: "Finales de 2027", "Por anunciar"
  related: string[];        // slugs de novelas que se cruzan con esta
}

export interface ChapterMeta {
  novelSlug: string;
  number: number;
  title: string;
  chapterSlug: string;
  publishedAt: string; // ISO 8601
}

export interface ChapterData extends ChapterMeta {
  bodyMarkdown: string;
  unlocked: boolean;
}
