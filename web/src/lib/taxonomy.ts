import { slugify } from './slug';

export interface TaxoNovel {
  categories: string[];
  tags: string[];
}

export interface TaxoItem {
  name: string;
  slug: string;
  count: number;
}

export function collectTaxonomy(novels: TaxoNovel[], key: 'categories' | 'tags'): TaxoItem[] {
  const map = new Map<string, TaxoItem>();
  for (const n of novels) {
    for (const name of n[key]) {
      const slug = slugify(name);
      const item = map.get(slug) ?? { name, slug, count: 0 };
      item.count += 1;
      map.set(slug, item);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
