export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export interface SearchableNovel {
  title: string;
  synopsis: string;
  categories: string[];
  tags: string[];
}

export function novelHaystack(n: SearchableNovel): string {
  return normalizeText([n.title, n.synopsis, ...n.categories, ...n.tags].join(' '));
}

export function novelMatchesQuery(n: SearchableNovel, query: string): boolean {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const hay = novelHaystack(n);
  return q.split(/\s+/).every((term) => hay.includes(term));
}
