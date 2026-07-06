// Forma mínima de las propiedades de Notion que consumimos.
// No dependemos del SDK aquí para poder testear con fixtures simples.
export interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

export interface NovelData {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  categories: string[];
  tags: string[];
  featured: boolean;
}

export interface ChapterMeta {
  novelSlug: string;
  number: number;
  title: string;
  slug: string;
  publishedAt: string; // ISO 8601
}

export interface ChapterData extends ChapterMeta {
  bodyMarkdown: string;
}
