const GRADIENTS: Record<string, [string, string]> = {
  'Fantasía': ['#26314a', '#3b4e7a'],
  'Ciencia ficción': ['#1e3340', '#2e6e7e'],
  'Terror': ['#241a22', '#5a2431'],
  'Misterio': ['#22283c', '#3e3a66'],
  'Aventura': ['#2a2620', '#6e5326'],
  'Acción': ['#2a2620', '#6e5326'],
  'Romance': ['#2a2230', '#6e3450'],
};

const FALLBACK: [string, string] = ['#26303f', '#3a4658'];

export function coverGradient(categories: string[]): string {
  const match = categories.map((c) => GRADIENTS[c]).find(Boolean);
  const [from, to] = match ?? FALLBACK;
  return `linear-gradient(135deg, ${from}, ${to})`;
}
