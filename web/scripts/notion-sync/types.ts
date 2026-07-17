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

export interface NovelData {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  format: string | null;   // Microrrelato | Relato | Relato largo | Novela corta | Novela
  categories: string[];
  tags: string[];
  featured: boolean;
  saga: string | null;      // slug de la saga, o null
  sagaOrder: number | null; // posición de lectura dentro de la saga
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
