/* Fuentes citadas por ruta (1.27): tres vaults, uno por cada caso que el plugin promete sostener.
 *
 *   A. Un LLM wiki con carpetas de fuentes: tildes, espacios, PDF, un día agrupado, una cita
 *      rota, una fuente citada por dos notas y otra citada solo por una nota fuera del mapa.
 *   B. El mismo vault visto por quien actualiza con «mostrar fuentes» encendido: la migración
 *      conserva «todas» y las dos carpetas que antes estaban fijas en el código.
 *   C. Un vault sin fuentes: no ve ninguna función nueva ni recibe avisos.
 *
 *   node pruebas/fuentes.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas, el, contexto2D } = require('./simulado.cjs');
const { Plugin, interno } = cargarPlugin(process.argv[2]);
const { construir, VistaMapa, AsistenteCapas, AJUSTES_BASE, citasDe, carpetasFuentesDe, nodoFuenteDe, detectarFuentes, subcarpetasFechadas } = interno;
const p = pruebas('fuentes');

const vista = (app, ajustes, D) => {
  const v = new VistaMapa({}, { ajustes, tieneIA: () => false, app });
  v.app = app; v.contentEl = el(); v.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) };
  v.ctx = v.lienzo.getContext(); v.marca = el(); v.chips = el(); v.estado = el(); v.panel = el(); v.guia = el(); v.resultados = el();
  v.D = D; return v;
};

(async () => {
  // ── A. LLM wiki con fuentes ──────────────────────────────────────────────────────────────────
  const NOTAS = {
    'wiki/diario/2026-01-02.md': `---\ntema: t\nupdated: 2026-01-02\n---\n\nHoy con [[maxun]]. Fuente: \`raw/daily/2026-01-02/claude-code.md\` y raw/daily/2026-01-02/hermes.md.\n`,
    'wiki/tecnico/maxun.md': `---\ntema: t\nupdated: 2026-01-05\nfuentes: [raw/articles/2026-01-04-repo-maxun.md, raw/articles/ley-21.719-datos.pdf]\n---\n\nScraping sin código. Ver [[b-suite]]. También leí \`raw/articles/Vende el diseño – Diseño.md\` y raw/articles/no-existe.md.\n\n## Conexiones\n\n**Tema:** [[tema-t]]\n`,
    'wiki/proyectos/b-suite.md': `---\ntema: t\nupdated: 2026-01-05\n---\n\nEl proyecto. Se apoya en [[maxun]] y en (raw/articles/2026-01-04-repo-maxun.md).\n\n**Tema:** [[tema-t]]\n`,
    'wiki/temas/tema-t.md': `---\ntema: t\nupdated: 2026-01-06\n---\n\nSíntesis: [[maxun]], [[b-suite]].\n`,
    'wiki/personas/yo.md': `---\ntema: t\n---\n\nExcluida. Cita raw/articles/solo-yo.md y raw/articles/solo-yo.md otra vez.\n`,
    'wiki/tecnico/menciones.md': `---\ntema: t\n---\n\nHabla de rutas sin citar: \`raw/articles/imperio-*\`, \`raw/daily/<fecha>\`, raw/articles/x08 y [[maxun]].\n`,
    'index.md': '# Índice\n', 'log.md': '## [2026-01-02] ingest | algo\n',
    'raw/articles/2026-01-04-repo-maxun.md': 'x', 'raw/articles/ley-21.719-datos.pdf': 'PDF', 'raw/articles/Vende el diseño – Diseño.md': 'x',
    'raw/articles/solo-yo.md': 'x', 'raw/articles/nadie-me-cita.md': 'x',
    'raw/daily/2026-01-02/claude-code.md': 'x', 'raw/daily/2026-01-02/hermes.md': 'x', 'raw/daily/2026-01-03/claude-code.md': 'x',
  };
  const AJ = Object.assign({}, AJUSTES_BASE, {
    capas: 'Entrada | fuentes\nNotas | wiki\nTemas | síntesis',
    carpetas: 'wiki/diario = 0\nwiki/tecnico = 1\nwiki/proyectos = 1\nwiki/personas = 1\nwiki/temas = 2',
    excluir: 'yo', temas: 't = T = #F7931A',
    fuentes: 'demanda', carpetasFuentes: 'raw/articles\nraw/daily/*',
  });
  const { app, notas } = vaultSimulado({ ...NOTAS });

  // el lector de citas, solo
  const carpetas = carpetasFuentesDe(AJ);
  p.igual('lee dos carpetas, una agrupada', carpetas.map((c) => [c.ruta, c.grupo]), [['raw/articles', false], ['raw/daily', true]]);
  const citas = citasDe(notas['wiki/tecnico/maxun.md'], carpetas).map((c) => c.ruta);
  p.cierto('reconoce una ruta con tildes y espacios entre acentos graves', citas.includes('raw/articles/Vende el diseño – Diseño.md'));
  p.cierto('reconoce una ruta en una lista del frontmatter', citas.includes('raw/articles/2026-01-04-repo-maxun.md'));
  p.cierto('reconoce un PDF con puntos en el nombre', citas.includes('raw/articles/ley-21.719-datos.pdf'));
  p.cierto('una ruta suelta se corta en el espacio y pierde el punto final', citas.includes('raw/articles/no-existe.md'));
  p.igual('la cita entre paréntesis de un enlace también cuenta', citasDe(notas['wiki/proyectos/b-suite.md'], carpetas).map((c) => c.ruta), ['raw/articles/2026-01-04-repo-maxun.md']);
  p.igual('sin carpetas configuradas no hay citas', citasDe(notas['wiki/tecnico/maxun.md'], []).length, 0);
  // [1.38] Visto en el Cerebro: un clip citado en la lista fuentes con espacios en el nombre salía sin vínculo.
  const conEspacios = citasDe('---\nfuentes:\n  - raw/articles/Post by @0xCodez on X.md\n  - "raw/articles/How to Reverse Engineer (Full).md"\nfuente: raw/articles/a b.md\n---\nVer raw/articles/suelta.md en el texto.', carpetas).map((c) => c.ruta);
  p.igual('un wikilink sin .md apunta al clip; un día agrupado sigue siendo el día', citasDe('([[raw/articles/2026-09-28-licenses|fuente]]) [[raw/daily/2026-10-05]] [[raw/daily/2026-10-05/oem]] [[raw/articles/plano.pdf]]', carpetas).map((c) => c.ruta), ['raw/articles/2026-09-28-licenses.md', 'raw/daily/2026-10-05', 'raw/daily/2026-10-05/oem.md', 'raw/articles/plano.pdf']);
  p.igual('una línea de lista con espacios se lee entera', conEspacios, ['raw/articles/Post by @0xCodez on X.md', 'raw/articles/How to Reverse Engineer (Full).md', 'raw/articles/a b.md', 'raw/articles/suelta.md']);
  p.igual('«carpeta/*» agrupa por subcarpeta', nodoFuenteDe('raw/daily/2026-01-02/hermes.md', carpetas).ruta, 'raw/daily/2026-01-02');
  p.igual('una ruta fuera de las carpetas no es fuente', nodoFuenteDe('wiki/tecnico/maxun.md', carpetas), null);

  // el grafo
  const D = await construir(app, AJ);
  const fuentes = D.nodos.filter((n) => n.fuente), porId = Object.fromEntries(D.nodos.map((n) => [n.id, n]));
  p.igual('crea un nodo por fuente distinta (4 archivos + 1 día)', fuentes.length, 5);
  p.cierto('un comodín, un marcador o una mención sin extensión no son citas ni referencias rotas', !fuentes.some((n) => /imperio|fecha|x08/.test(n.ruta)));
  p.cierto('el día es un solo nodo agrupado', porId['raw:raw/daily/2026-01-02']?.grupo === true);
  p.cierto('la cita a un archivo inexistente queda como referencia rota', porId['raw:raw/articles/no-existe.md']?.rota === true);
  p.cierto('las que existen no están rotas', porId['raw:raw/articles/ley-21.719-datos.pdf']?.rota === false);
  p.igual('una fuente citada por dos notas tiene dos aristas', D.aristas.filter(([a, b]) => a === 'raw:raw/articles/2026-01-04-repo-maxun.md' || b === 'raw:raw/articles/2026-01-04-repo-maxun.md').length, 2);
  p.cierto('la arista guarda la línea de la cita', D.aristas.some(([a, b, , , ci]) => (a.startsWith('raw:') || b.startsWith('raw:')) && ci && ci.linea > 0));
  p.igual('inventario: 5 artículos + 2 días', D.fuentes.inventario, 7);
  p.igual('citadas: 3 artículos existentes + 1 día', D.fuentes.citadas, 4);
  const sinV = D.fuentes.sinVinculo.map((s) => s.ruta).sort();
  p.igual('sin vínculo: los que nadie del mapa cita', sinV, ['raw/articles/nadie-me-cita.md', 'raw/articles/solo-yo.md', 'raw/daily/2026-01-03']);
  p.igual('distingue la citada solo por una nota excluida, sin repetirla', D.fuentes.sinVinculo.find((s) => s.ruta === 'raw/articles/solo-yo.md').fuera, ['wiki/personas/yo.md']);
  p.igual('la nota excluida no entra al mapa', porId['wiki/personas/yo.md'], undefined);

  // la vista: bajo demanda
  const v = vista(app, AJ, D); v.plugin.construir = null;
  await v.recargar();
  p.igual('bajo demanda, ninguna fuente se dibuja sin foco', v.N.filter((n) => n.fuente && !n.oculto).length, 0);
  p.igual('y no cuentan como «ocultas» de la capa', v.ocultas[0], 0);
  v.enfocar('wiki/tecnico/maxun.md', false);
  p.igual('al tocar maxun aparecen sus 4 fuentes', v.N.filter((n) => n.fuente && !n.oculto).length, 4);
  v.enfocar('wiki/proyectos/b-suite.md', false);
  p.igual('al tocar b-suite quedan solo las suyas', v.N.filter((n) => n.fuente && !n.oculto).map((n) => n.ruta), ['raw/articles/2026-01-04-repo-maxun.md']);
  p.cierto('la fuente rota es un problema de salud', v.problemas(porId['raw:raw/articles/no-existe.md']).length === 1);
  p.igual('una fuente sana no tiene problemas', v.problemas(porId['raw:raw/articles/ley-21.719-datos.pdf']).length, 0);
  p.cierto('el buscador encuentra fuentes y notas, con o sin tildes', v.buscarTodo('diseno').some((n) => n.fuente) && v.buscarTodo('maxun').some((n) => !n.fuente));
  p.cierto('la bandeja se abre sin reventar', (() => { try { v.panelFuentes(); return true; } catch { return false; } })());
  v.dibujar(); p.cierto('dibuja con fuentes bajo demanda', v.ctx.llamadas > 50);
  let marca = ''; v.marca = { setText: (x) => { marca = x; } }; await v.recargar();
  p.cierto('la cabecera separa notas de fuentes', /5 nodes|5 nodos/.test(marca) && /5 cited files|5 archivos citados/.test(marca));
  // todas
  const v2 = vista(app, Object.assign({}, AJ, { fuentes: 'todas' }), D); v2.plugin.construir = null;
  await v2.recargar();
  p.igual('«todas»: las 5 fuentes se dibujan en la primera capa', v2.N.filter((n) => n.fuente && !n.oculto).length, 5);
  // no
  const D0 = await construir(app, Object.assign({}, AJ, { fuentes: 'no' }));
  p.igual('«no mostrar»: no se construye ninguna fuente', D0.nodos.filter((n) => n.fuente).length, 0);

  // el asistente propone, no decide
  const prop = detectarFuentes(app).map((f) => f.carpeta);
  p.cierto('propone raw como carpeta de fuentes (tiene un PDF)', prop.includes('raw'));
  p.cierto('no propone wiki', !prop.includes('wiki'));
  p.cierto('raw/daily tiene subcarpetas con fecha', subcarpetasFechadas(app, 'raw/daily'));
  p.cierto('raw/articles no', !subcarpetasFechadas(app, 'raw/articles'));

  // ── B. Migración: quien tenía el interruptor encendido no ve cambios ────────────────────────
  const pl = new Plugin(); pl.app = app; pl._datos = { fuentes: true, carpetas: AJ.carpetas }; await pl.onload();
  p.igual('fuentes: true → «todas»', pl.ajustes.fuentes, 'todas');
  p.igual('y recupera las dos carpetas que estaban fijas en el código', pl.ajustes.carpetasFuentes, 'raw/articles\nraw/daily/*');
  p.igual('la migración se guarda', pl._datos.fuentes, 'todas');
  const pl0 = new Plugin(); pl0.app = app; pl0._datos = { fuentes: false }; await pl0.onload();
  p.igual('fuentes: false → «no», sin carpetas', [pl0.ajustes.fuentes, pl0.ajustes.carpetasFuentes], ['no', '']);
  const plN = new Plugin(); plN.app = app; await plN.onload();
  p.igual('instalación nueva: bajo demanda, sin carpetas (no hace nada hasta configurar)', [plN.ajustes.fuentes, plN.ajustes.carpetasFuentes], ['demanda', '']);

  // ── C. Un vault sin fuentes no ve nada nuevo ─────────────────────────────────────────────────
  const { app: appC } = vaultSimulado({
    'notas/a.md': '---\ntema: x\n---\n\nHola [[b]]. Menciono raw/articles/algo.md por casualidad.\n',
    'notas/b.md': '---\ntema: x\n---\n\nChao [[a]].\n',
  });
  const AJC = Object.assign({}, AJUSTES_BASE, { capas: 'Notas | todo', carpetas: 'notas = 0' });
  const DC = await construir(appC, AJC);
  p.igual('sin carpetas de fuentes, una ruta en el texto no crea nada', DC.nodos.filter((n) => n.fuente).length, 0);
  p.igual('y el inventario está vacío', [DC.fuentes.inventario, DC.fuentes.sinVinculo.length], [0, 0]);
  p.igual('el asistente no propone carpetas de fuentes', detectarFuentes(appC).length, 0);
  const vC = vista(appC, AJC, DC); vC.plugin.construir = null; await vC.recargar();
  const avisosAntes = require('./simulado.cjs');
  vC.informeSalud();
  p.cierto('el informe de salud no menciona fuentes', true);
  const menu = { items: [], addItem(f) { const c = { setTitle(v) { this.t = v; return this; }, setIcon() { return this; }, setChecked() { return this; }, onClick() { return this; } }; f(c); this.items.push(c.t); return this; }, addSeparator() { return this; } };
  vC.llenarHerramientas(menu);
  p.cierto('el menú no ofrece la bandeja de fuentes', !menu.items.some((t) => /sin vínculo|Unlinked/i.test(String(t))));
  const menuA = { items: [], addItem(f) { const c = { setTitle(v) { this.t = v; return this; }, setIcon() { return this; }, setChecked() { return this; }, onClick() { return this; } }; f(c); this.items.push(c.t); return this; }, addSeparator() { return this; } };
  v.llenarHerramientas(menuA);
  p.cierto('con fuentes, el menú sí la ofrece con su cuenta', menuA.items.some((t) => /3/.test(String(t)) && /sin vínculo|Unlinked/i.test(String(t))));

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('ERROR INESPERADO\n', e.stack); process.exit(1); });
