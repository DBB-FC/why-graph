/* 1.36 — detectar la forma del vault (PARA, Zettelkasten, LLM wiki) y proponer su plantilla.
 *   node pruebas/forma.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('forma');
const { interno } = cargarPlugin(process.argv[2]);
const forma = (notas) => interno.detectarForma(vaultSimulado(notas).app);

p.igual('LLM wiki: index.md y log.md', forma({ 'index.md': 'x', 'log.md': 'x', 'wiki/a.md': 'x' })?.id, 'llm');
p.igual('PARA con nombres en inglés', forma({ 'Projects/a.md': 'x', 'Areas/b.md': 'x', 'Resources/c.md': 'x', 'Archive/d.md': 'x' })?.id, 'para');
p.igual('PARA numerado y en español', forma({ '1 - Proyectos/a.md': 'x', '2 - Áreas/b.md': 'x', '3_Recursos/c.md': 'x', '4. Archivo/d.md': 'x' })?.id, 'para');
p.igual('PARA con una carpeta menos igual se reconoce (3 de 4)', forma({ 'Projects/a.md': 'x', 'Areas/b.md': 'x', 'Resources/c.md': 'x' })?.id, 'para');
p.igual('dos de cuatro no alcanza', forma({ 'Projects/a.md': 'x', 'Areas/b.md': 'x', 'otra/c.md': 'x' }), null);
const ids = {}; for (let i = 0; i < 8; i++) ids[`202401011${i}00${i}.md`] = 'x'; ids['inbox/x.md'] = 'x';
p.igual('Zettelkasten por identificadores numéricos', forma(ids)?.id, 'zettel');
p.igual('Zettelkasten por carpetas', forma({ 'Fleeting/a.md': 'x', 'Literature/b.md': 'x', 'Permanent/c.md': 'x' })?.id, 'zettel');
p.igual('un vault sin forma clara no recibe etiqueta', forma({ 'clientes/a.md': 'x', 'ventas/b.md': 'x', 'c.md': 'x' }), null);
p.cierto('la plantilla PARA existe y tiene cuatro capas', interno.PLANTILLAS.find((q) => q[0] === 'para')?.[2].length === 4);
process.exit(p.cerrar() ? 1 : 0);
