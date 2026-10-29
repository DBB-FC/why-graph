/* 1.36 — procedencia por nota: origen (human|ai|mixed) y rol (thought|resource|work|system).
 *   node pruebas/procedencia.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('procedencia');
const { interno } = cargarPlugin(process.argv[2]);

(async () => {
  const { app } = vaultSimulado({
    'a.md': '---\norigen: ia\nrol: recurso\n---\nTexto.',
    'b.md': '---\norigin: human\nrole: work\n---\nTexto.',
    'c.md': '---\norigen: mixto\n---\nTexto.',
    'wiki/ia/d.md': 'Sin propiedades, pero en carpeta marcada.',
    'wiki/ia/e.md': '---\norigen: humano\n---\nDeclara humano dentro de carpeta marcada.',
    'f.md': 'Sin nada.',
    'g.md': '---\norigen: marciano\nrol: otro\n---\nValores desconocidos.',
  });
  const D = await interno.construir(app, Object.assign({}, interno.AJUSTES_BASE, { carpetas: '', capas: 'Entrada | x\nNotas | y', carpetasIA: 'wiki/ia' }));
  const n = (r) => { const x = D.nodos.find((q) => q.id === r); return x ? [x.origen, x.rol] : 'sin nodo'; };
  p.igual('lee origen y rol en español', n('a.md'), ['ai', 'resource']);
  p.igual('y en inglés', n('b.md'), ['human', 'work']);
  p.igual('mixto', n('c.md'), ['mixed', null]);
  p.igual('una carpeta marcada vale para notas sin declarar', n('wiki/ia/d.md'), ['ai', null]);
  p.igual('lo que la nota declara gana a la carpeta', n('wiki/ia/e.md'), ['human', null]);
  p.igual('sin pruebas no se acusa a nadie', n('f.md'), [null, null]);
  p.igual('valores desconocidos se ignoran', n('g.md'), [null, null]);
  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
