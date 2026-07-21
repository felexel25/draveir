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

// Una historia oculta solo asoma si la buscan por su nombre: la consulta tiene
// que ir dentro del título y medir al menos 4 caracteres. Sin el mínimo, teclear
// una sola letra destaparía el catálogo entero y no habría secreto que valga.
export const HIDDEN_MIN_QUERY = 4;

export function revealsHidden(title: string, query: string): boolean {
  const q = normalizeText(query).trim();
  return q.length >= HIDDEN_MIN_QUERY && normalizeText(title).includes(q);
}

export function novelMatchesQuery(n: SearchableNovel, query: string): boolean {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const hay = novelHaystack(n);
  return q.split(/\s+/).every((term) => hay.includes(term));
}
