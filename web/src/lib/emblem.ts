// Generado desde docs/tarot-emblems-wip.html: los 22 arcanos mayores.
// Cada cuerpo va escalado para que los 22 midan lo mismo (lado mayor 60 de 100)
// y su stroke-width raiz esta dividido por esa escala, de modo que el grosor
// renderizado sea 2.2 en todos.

export const EMBLEMS = [
  'el-loco',
  'el-mago',
  'la-sacerdotisa',
  'la-emperatriz',
  'el-emperador',
  'el-hierofante',
  'los-enamorados',
  'el-carro',
  'la-fuerza',
  'el-ermitano',
  'la-rueda',
  'la-justicia',
  'el-colgado',
  'la-muerte',
  'la-templanza',
  'el-diablo',
  'la-torre',
  'la-estrella',
  'la-luna',
  'el-sol',
  'el-juicio',
  'el-mundo',
] as const;

export type Emblem = (typeof EMBLEMS)[number];

export const EMBLEM_STROKE: Record<Emblem, number> = {
  'el-loco': 1.86,
  'el-mago': 2.2,
  'la-sacerdotisa': 1.47,
  'la-emperatriz': 1.33,
  'el-emperador': 1.45,
  'el-hierofante': 1.69,
  'los-enamorados': 1.54,
  'el-carro': 2.56,
  'la-fuerza': 1.69,
  'el-ermitano': 1.76,
  'la-rueda': 1.91,
  'la-justicia': 1.83,
  'el-colgado': 2.06,
  'la-muerte': 1.96,
  'la-templanza': 1.62,
  'el-diablo': 1.38,
  'la-torre': 1.76,
  'la-estrella': 2.06,
  'la-luna': 2.12,
  'el-sol': 2.14,
  'el-juicio': 2.2,
  'el-mundo': 1.76,
};

export const EMBLEM_BODY: Record<Emblem, string> = {
  'el-loco':
    "<g transform=\"translate(50 50) scale(1.18) translate(-51.5 -52.5)\"><path d=\"M26 78 L64 32\"/><path d=\"M64 32 q-7 1 -7 9 q0 9 10 9 q10 0 10 -9 q0 -8 -7 -9\"/><path d=\"M61 31 l-2 -4\" stroke-width=\"1.11\"/><path d=\"M67 31 l2 -4\" stroke-width=\"1.11\"/></g>",
  'el-mago':
    "<g transform=\"translate(50 50) scale(1) translate(-50 -48)\"><path d=\"M20 74 L34 56 L42 66 L50 44 L58 66 L66 56 L80 74 Z\"/><path d=\"M44 40 L38 32 L42 31 L36 22\" stroke-width=\"1.6\"/><path d=\"M56 40 L62 32 L58 31 L64 22\" stroke-width=\"1.6\"/></g>",
  'la-sacerdotisa':
    "<g transform=\"translate(50 50) scale(1.5) translate(-50 -43)\"><path d=\"M30 40 Q50 74 70 40\"/><path d=\"M37 41 Q50 65 63 41\"/><path d=\"M30 40 L37 41\" stroke-width=\"0.93\"/><path d=\"M70 40 L63 41\" stroke-width=\"0.93\"/><circle cx=\"50\" cy=\"38\" r=\"9\"/></g>",
  'la-emperatriz':
    "<g transform=\"translate(50 50) scale(1.65) translate(-50 -57.8)\"><path d=\"M34 60 L38 46 L44 55 L50 41 L56 55 L62 46 L66 60\"/><path d=\"M33 63 L67 63\" stroke-width=\"0.91\"/><circle cx=\"38\" cy=\"46\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"50\" cy=\"41\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"62\" cy=\"46\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M50 70 q-3 -4 -6 -1 q-2 2 6 7 q8 -5 6 -7 q-3 -3 -6 1 z\" stroke-width=\"0.85\"/></g>",
  'el-emperador':
    "<g transform=\"translate(50 50) scale(1.52) translate(-50 -58.3)\"><path d=\"M32 60 L32 42 L40 55 L50 40 L60 55 L68 42 L68 60\"/><path d=\"M32 63 L68 63\" stroke-width=\"0.98\"/><circle cx=\"32\" cy=\"42\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"50\" cy=\"40\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"68\" cy=\"42\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M43 68 L57 68 L50 78 Z\" stroke-width=\"0.92\"/></g>",
  'el-hierofante':
    "<g transform=\"translate(50 50) scale(1.3) translate(-50 -51)\"><path d=\"M50 28 L50 74\"/><path d=\"M45 38 L55 38\" stroke-width=\"1.15\"/><path d=\"M42 47 L58 47\" stroke-width=\"1.3\"/><path d=\"M39 56 L61 56\"/></g>",
  'los-enamorados':
    "<g transform=\"translate(50 50) scale(1.43) translate(-50 -47)\"><circle cx=\"43\" cy=\"55\" r=\"13\"/><circle cx=\"57\" cy=\"55\" r=\"13\"/><path d=\"M50 26 l1.6 4.5 4.8 .3 -3.7 3 1.3 4.6 -4 -2.7 -4 2.7 1.3 -4.6 -3.7 -3 4.8 -.3 z\" stroke-width=\"0.84\"/></g>",
  'el-carro':
    "<g transform=\"translate(50 50) scale(0.86) translate(-50 -50)\"><circle cx=\"50\" cy=\"50\" r=\"15\"/><circle cx=\"50\" cy=\"50\" r=\"4\"/><g stroke-width=\"1.4\"><path d=\"M55 50 L63.5 50\"/><path d=\"M45 50 L36.5 50\"/><path d=\"M50 55 L50 63.5\"/><path d=\"M50 45 L50 36.5\"/><path d=\"M53.5 53.5 L59.6 59.6\"/><path d=\"M46.5 46.5 L40.4 40.4\"/><path d=\"M53.5 46.5 L59.6 40.4\"/><path d=\"M46.5 53.5 L40.4 59.6\"/></g><g stroke-width=\"1.64\"><circle cx=\"50\" cy=\"21.5\" r=\"6.5\"/><circle cx=\"66.75\" cy=\"26.94\" r=\"6.5\"/><circle cx=\"77.11\" cy=\"41.19\" r=\"6.5\"/><circle cx=\"77.11\" cy=\"58.81\" r=\"6.5\"/><circle cx=\"66.75\" cy=\"73.06\" r=\"6.5\"/><circle cx=\"50\" cy=\"78.5\" r=\"6.5\"/><circle cx=\"33.25\" cy=\"73.06\" r=\"6.5\"/><circle cx=\"22.89\" cy=\"58.81\" r=\"6.5\"/><circle cx=\"22.89\" cy=\"41.19\" r=\"6.5\"/><circle cx=\"33.25\" cy=\"26.94\" r=\"6.5\"/></g><g stroke-width=\"0.93\"><path d=\"M45.4 21.5 L54.6 21.5 M50 16.9 L50 26.1\"/><path d=\"M62.15 26.94 L71.35 26.94 M66.75 22.34 L66.75 31.54\"/><path d=\"M72.51 41.19 L81.71 41.19 M77.11 36.59 L77.11 45.79\"/><path d=\"M72.51 58.81 L81.71 58.81 M77.11 54.21 L77.11 63.41\"/><path d=\"M62.15 73.06 L71.35 73.06 M66.75 68.46 L66.75 77.66\"/><path d=\"M45.4 78.5 L54.6 78.5 M50 73.9 L50 83.1\"/><path d=\"M28.65 73.06 L37.85 73.06 M33.25 68.46 L33.25 77.66\"/><path d=\"M18.29 58.81 L27.49 58.81 M22.89 54.21 L22.89 63.41\"/><path d=\"M18.29 41.19 L27.49 41.19 M22.89 36.59 L22.89 45.79\"/><path d=\"M28.65 26.94 L37.85 26.94 M33.25 22.34 L33.25 31.54\"/></g><g fill=\"currentColor\" stroke=\"none\"><circle cx=\"50\" cy=\"21.5\" r=\"1.3\"/><circle cx=\"66.75\" cy=\"26.94\" r=\"1.3\"/><circle cx=\"77.11\" cy=\"41.19\" r=\"1.3\"/><circle cx=\"77.11\" cy=\"58.81\" r=\"1.3\"/><circle cx=\"66.75\" cy=\"73.06\" r=\"1.3\"/><circle cx=\"50\" cy=\"78.5\" r=\"1.3\"/><circle cx=\"33.25\" cy=\"73.06\" r=\"1.3\"/><circle cx=\"22.89\" cy=\"58.81\" r=\"1.3\"/><circle cx=\"22.89\" cy=\"41.19\" r=\"1.3\"/><circle cx=\"33.25\" cy=\"26.94\" r=\"1.3\"/></g></g>",
  'la-fuerza':
    "<g transform=\"translate(50 50) scale(1.3) translate(-50 -50)\"><g stroke-width=\"0.92\"><g transform=\"translate(68 50) rotate(90)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(62.73 62.73) rotate(45)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(50 68) rotate(0)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(37.27 62.73) rotate(135)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(32 50) rotate(90)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(37.27 37.27) rotate(45)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(50 32) rotate(0)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g><g transform=\"translate(62.73 37.27) rotate(135)\"><rect x=\"-9\" y=\"-5\" width=\"18\" height=\"10\" rx=\"5\"/><rect x=\"-5.6\" y=\"-2\" width=\"11.2\" height=\"4\" rx=\"2\"/></g></g></g>",
  'el-ermitano':
    "<g transform=\"translate(50 50) scale(1.25) translate(-50 -50)\"><circle cx=\"50\" cy=\"50\" r=\"24\"/><path d=\"M50 30 L57 50 L50 70 L43 50 Z\"/><path d=\"M43 50 L57 50\" stroke-width=\"0.8\"/><g stroke-width=\"1.04\"><path d=\"M50 26 L50 30\"/><path d=\"M50 70 L50 74\"/><path d=\"M26 50 L30 50\"/><path d=\"M70 50 L74 50\"/></g></g>",
  'la-rueda':
    "<g transform=\"translate(50 50) scale(1.15) translate(-50 -50)\"><circle cx=\"50\" cy=\"50\" r=\"26\"/><circle cx=\"50\" cy=\"50\" r=\"6\"/><g stroke-width=\"1.3\"><line x1=\"50\" y1=\"30\" x2=\"50\" y2=\"44\"/><line x1=\"50\" y1=\"56\" x2=\"50\" y2=\"70\"/><line x1=\"30\" y1=\"50\" x2=\"44\" y2=\"50\"/><line x1=\"56\" y1=\"50\" x2=\"70\" y2=\"50\"/><line x1=\"37\" y1=\"37\" x2=\"46\" y2=\"46\"/><line x1=\"54\" y1=\"54\" x2=\"63\" y2=\"63\"/><line x1=\"63\" y1=\"37\" x2=\"54\" y2=\"46\"/><line x1=\"46\" y1=\"54\" x2=\"37\" y2=\"63\"/></g></g>",
  'la-justicia':
    "<g transform=\"translate(50 50) scale(1.2) translate(-50 -47.5)\"><path d=\"M50 24 L50 44\"/><path d=\"M45 30 L55 30\" stroke-width=\"1.25\"/><path d=\"M30 46 L70 46\"/><path d=\"M50 46 L50 64\"/><path d=\"M50 64 L43 71 L57 71 Z\"/><path d=\"M32 46 L32 53\"/><path d=\"M25 53 Q32 60 39 53\" stroke-width=\"1.25\"/><path d=\"M68 46 L68 53\"/><path d=\"M61 53 Q68 60 75 53\" stroke-width=\"1.25\"/></g>",
  'el-colgado':
    "<g transform=\"translate(50 50) scale(1.07) translate(-50 -48)\"><path d=\"M50 20 L50 32\" stroke-width=\"1.68\"/><rect x=\"43\" y=\"32\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M43 36 L57 36\" stroke-width=\"1.03\"/><path d=\"M43 39.5 L57 39.5\" stroke-width=\"1.03\"/><ellipse cx=\"50\" cy=\"60\" rx=\"13\" ry=\"16\"/></g>",
  'la-muerte':
    "<g transform=\"translate(50 50) scale(1.12) translate(-48 -51.26)\"><path d=\"M38 76 L66 26\"/><path d=\"M66 26 C48 21 34 29 30 45 C43 39 56 35 66 26 Z\"/><path d=\"M34 73 L42 78\" stroke-width=\"1.52\"/></g>",
  'la-templanza':
    "<g transform=\"translate(50 50) scale(1.36) translate(-50 -50)\"><path d=\"M34 28 L66 28 L50 50 Z\"/><path d=\"M50 50 L66 72 L34 72 Z\"/><path d=\"M30 28 L70 28\" stroke-width=\"1.25\"/><path d=\"M30 72 L70 72\" stroke-width=\"1.25\"/></g>",
  'el-diablo':
    "<g transform=\"translate(50 50) scale(1.6) translate(-50 -48.28)\"><path d=\"M40 40 C35 32 41 26 45 32\"/><path d=\"M60 40 C65 32 59 26 55 32\"/><path d=\"M50 67 L58.8 39.9 L35.7 56.6 L64.3 56.6 L41.2 39.9 Z\" stroke-width=\"1\"/></g>",
  'la-torre':
    "<g transform=\"translate(50 50) scale(1.25) translate(-50 -52)\"><path d=\"M32 28 L40 28 L40 34 L46 34 L46 28 L54 28 L54 34 L60 34 L60 28 L68 28 L68 42 L63 46 L63 62 L68 68 L68 76 L32 76 L32 68 L37 62 L37 46 L32 42 Z\"/><g stroke-width=\"0.8\"><path d=\"M32 38 L68 38\"/><path d=\"M43 34 L43 38\"/><path d=\"M57 34 L57 38\"/><path d=\"M36 38 L36 42\"/><path d=\"M50 38 L50 42\"/><path d=\"M64 38 L64 42\"/><path d=\"M37 51 L63 51\"/><path d=\"M37 57 L63 57\"/><path d=\"M50 46 L50 51\"/><path d=\"M43 51 L43 57\"/><path d=\"M57 51 L57 57\"/><path d=\"M50 57 L50 62\"/><path d=\"M32 72 L68 72\"/><path d=\"M44 68 L44 72\"/><path d=\"M56 68 L56 72\"/><path d=\"M38 72 L38 76\"/><path d=\"M50 72 L50 76\"/><path d=\"M62 72 L62 76\"/></g></g>",
  'la-estrella':
    "<g transform=\"translate(50 50) scale(1.07) translate(-50 -50)\"><path d=\"M50 22 L54 46 L78 50 L54 54 L50 78 L46 54 L22 50 L46 46 Z\"/></g>",
  'la-luna':
    "<g transform=\"translate(50 50) scale(1.04) translate(-41.73 -50)\"><path d=\"M60 22 A29 29 0 1 0 60 78 A22 22 0 1 1 60 22 Z\"/></g>",
  'el-sol':
    "<g transform=\"translate(50 50) scale(1.03) translate(-50 -50)\"><circle cx=\"50\" cy=\"50\" r=\"15\"/><circle cx=\"50\" cy=\"50\" r=\"3\" fill=\"currentColor\" stroke=\"none\"/><g stroke-width=\"1.54\"><path d=\"M50 29 L50 21\"/><path d=\"M50 71 L50 79\"/><path d=\"M29 50 L21 50\"/><path d=\"M71 50 L79 50\"/><path d=\"M35 35 L31 31\"/><path d=\"M65 65 L69 69\"/><path d=\"M65 35 L69 31\"/><path d=\"M35 65 L31 69\"/></g></g>",
  'el-juicio':
    "<g transform=\"translate(50 50) scale(1) translate(-50 -50)\"><path d=\"M45 20 L55 20 L55 34 L72 34 L72 44 L55 44 L55 80 L45 80 L45 44 L28 44 L28 34 L45 34 Z\"/></g>",
  'el-mundo':
    "<g transform=\"translate(50 50) scale(1.25) translate(-50 -50)\"><circle cx=\"50\" cy=\"50\" r=\"24\"/><g fill=\"currentColor\" stroke=\"none\"><path d=\"M30 43 L33 37 L40 36 L41 43 L37 47 L34 45 Z\"/><path d=\"M36 50 L40 49 L40 57 L37 63 L35 56 Z\"/><path d=\"M46 34 L53 33 L54 37 L47 39 Z\"/><path d=\"M47 41 L57 39 L58 47 L54 57 L50 64 L47 55 L45 47 Z\"/><path d=\"M56 33 L67 37 L69 42 L63 44 L57 41 Z\"/><path d=\"M62 58 L68 57 L66 62 Z\"/></g></g>",
};

// Hash estable de un slug de novela. Mismo slug -> mismo numero.
export function emblemHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h % EMBLEMS.length;
}

// El emblema de una novela. El offset lo sortea el navegador una vez por carga,
// asi que cada recarga rota el set entero: como todas las novelas comparten el
// mismo offset, nunca se repite un emblema entre dos novelas de la misma pagina.
export function pickEmblem(slug: string, offset = 0): Emblem {
  return EMBLEMS[(emblemHash(slug) + offset) % EMBLEMS.length];
}
