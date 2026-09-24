/* Lo nuevo de la 1.28 sobre un vault falso de cuatro capas: hubs explícitos, validación de la
 * config, cabecera, exportación de datos, recarga de ajustes, baricentro ponderado, plantillas
 * del asistente y el filtro de largo alcance.
 *
 *   npm test                  construye y corre todo
 *   node pruebas/v128.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas, el, contexto2D } = require('./simulado.cjs');
const { Plugin, interno, avisos, ajustesUI } = cargarPlugin(process.argv[2]);
const { construir, VistaMapa, AsistenteCapas, AjustesMapa, AJUSTES_BASE, CAPAS_ESTANDAR, PLANTILLAS, REGLAS, plantillaActual } = interno;
const p = pruebas('v128');

// ── El vault: 4 capas, un tema con dos notas en la última capa (la hub NO es la primera),
//    una carpeta configurada que no existe, una nota suelta sin capa, una excluida y una fuente ──
const NOTAS = {
  'diario/2026-02-01.md': `---\ntema: tienda\nupdated: 2026-02-01\n---\n\nHoy con [[horno]] y leí raw/articles/hornos.md.\n`,
  'proyectos/horno.md': `---\ntema: tienda\nupdated: 2026-02-03\n---\n\nEl horno nuevo. Ver [[idea-calor]].\n\n## Conexiones\n\n- [[idea-calor]] — pidió "más calor", sin dudar\n`,
  'ideas/idea-calor.md': `---\ntema: tienda\nupdated: 2026-02-04\n---\n\nEl calor importa. [[tema-tienda]] y [[tienda-hub]].\n`,
  'temas/tema-tienda.md': `---\ntema: tienda\nupdated: 2026-02-05\n---\n\nPrimera nota de síntesis: [[horno]].\n`,
  'temas/tienda-hub.md': `---\ntema: tienda\nhub: true\nupdated: 2026-02-06\n---\n\nLa hub de la tienda: [[horno]].\n`,
  'suelto/nota-perdida.md': `---\ntema: tienda\n---\n\nNadie me puso en una capa.\n`,
  'suelto/plantilla-x.md': `---\ntema: tienda\n---\n\nExcluida.\n`,
  'raw/articles/hornos.md': 'fuente cruda',
};
const AJUSTES = Object.assign({}, AJUSTES_BASE, {
  capas: 'Entrada | diario\nEntidades | proyectos\nConocimiento | ideas\nTemas | síntesis',
  carpetas: 'diario = 0\nproyectos = 1\nideas = 2\ntemas = 3\ninexistente = 1',
  excluir: 'plantilla-x',
  temas: 'tienda = Tienda = #F7931A',
  fuentes: 'demanda', carpetasFuentes: 'raw/articles',
});
const vista = (app, ajustes, D) => {
  const v = new VistaMapa({}, { ajustes, tieneIA: () => false, app, manifest: { version: '1.28.0' }, recargarAjustes() { v.recargaPedida = true; } });
  v.app = app; v.contentEl = el(); v.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) };
  v.ctx = v.lienzo.getContext(); v.marca = { ...el(), setText(t) { v.textoMarca = t; } }; v.chips = el(); v.estado = el(); v.panel = el(); v.guia = el(); v.resultados = el();
  v.D = D; return v;
};
const menuFalso = () => ({ items: [], addItem(f) { const c = { titulo: '', setTitle(v) { c.titulo = v; return c; }, setIcon: () => c, setChecked: () => c, onClick: () => c }; this.items.push(c); f(c); return this; }, addSeparator() { return this; } });

(async () => {
  const { app, notas, escrituras } = vaultSimulado({ ...NOTAS });

  // ── 1. hub: true llega al nodo ───────────────────────────────────────────────────────────────
  const D = await construir(app, AJUSTES);
  const porId = Object.fromEntries(D.nodos.map((n) => [n.id, n]));
  p.igual('reparte en 4 capas', D.capas.length, 4);
  p.igual('hub: true en el frontmatter marca el nodo', porId['temas/tienda-hub.md'].hub, true);
  p.igual('sin la propiedad, el nodo no es hub', porId['temas/tema-tienda.md'].hub, false);
  p.igual('una nota de otra capa tampoco', porId['proyectos/horno.md'].hub, false);

  // ── 2. Validación de la config ───────────────────────────────────────────────────────────────
  p.igual('lista la carpeta configurada que no existe', D.config.carpetasVacias, ['inexistente']);
  p.igual('lista la nota que no cae en ninguna capa', D.config.sinCapa, ['suelto/nota-perdida.md']);
  p.cierto('la excluida no cuenta como sin capa', !D.config.sinCapa.includes('suelto/plantilla-x.md'));
  p.cierto('una fuente citada no cuenta como sin capa', !D.config.sinCapa.some((r) => r.startsWith('raw/')));
  p.cierto('la nota sin capa no está en el mapa', !porId['suelto/nota-perdida.md']);
  const Dsin = await construir(app, Object.assign({}, AJUSTES, { carpetas: '' }));
  p.igual('sin carpetas configuradas no hay nada que validar', [Dsin.config.carpetasVacias, Dsin.config.sinCapa], [[], []]);
  // Vault anidado (wiki/…): lo que está fuera del árbol mapeado (prompts/, la raíz) no es un
  // hueco; una nota suelta DENTRO de wiki/ sí. En el cerebro real eran 31 avisos falsos.
  const { app: appN } = vaultSimulado({
    'wiki/diario/2026-01-01.md': '---\ntema: t\n---\nx', 'wiki/temas/t.md': '---\ntema: t\n---\ny',
    'wiki/suelta.md': 'sin capa', 'prompts/ingest.md': 'prompt', 'index.md': 'índice', 'docs/guia.md': 'doc',
  });
  const Dn = await construir(appN, Object.assign({}, AJUSTES_BASE, { capas: 'E | e\nT | t', carpetas: 'wiki/diario = 0\nwiki/temas = 1', fuentes: 'no' }));
  p.igual('anidado: solo cuenta lo suelto dentro del árbol mapeado', Dn.config.sinCapa, ['wiki/suelta.md']);

  // ── 1.29.1: asistente con vault anidado — cuentas reales y sin la carpeta madre ──
  {
    const notasN = {}; for (let i = 0; i < 20; i++) notasN[`wiki/diario/d${i}.md`] = 'x'; for (let i = 0; i < 5; i++) notasN[`wiki/temas/t${i}.md`] = 'y';
    notasN['wiki/suelta.md'] = 'z'; notasN['prompts/p.md'] = 'p';
    const { app: aN } = vaultSimulado(notasN);
    const plN = new Plugin(); plN.app = aN; plN.ajustes = Object.assign({}, AJUSTES_BASE, { capas: 'E | e\nT | t', carpetas: 'wiki/diario = 0\nwiki/temas = 1', configurado: true }); plN.guardar = async () => {};
    const asN = new AsistenteCapas(aN, plN); asN.contentEl = el(); ajustesUI.length = 0; asN.onOpen();
    const filaN = (nombre) => { const s = ajustesUI.find((x) => x.nombre === nombre); return s ? s.campos?.[0]?.valor : undefined; };
    const descN = (nombre) => { const s = ajustesUI.find((x) => x.nombre === nombre); return s ? s.desc : undefined; };
    p.igual('wiki/diario aparece con su cuenta real', descN('wiki/diario'), '20 notes');
    p.igual('wiki/temas también', descN('wiki/temas'), '5 notes');
    p.cierto('la carpeta madre wiki queda solo con lo suelto, o desaparece', descN('wiki') === undefined || descN('wiki') === '1 note');
    p.igual('la capa configurada viene marcada', filaN('wiki/temas'), '1');
  }

  // ── 1.31: definiciones de ajustes (Obsidian 1.13) y salud por gravedad ──
  {
    const plD = new Plugin(); plD.app = app; plD.ajustes = Object.assign({}, AJUSTES); let guardado = 0; plD.guardar = async () => { guardado++; };
    const tab = new AjustesMapa(app, plD); tab.plugin = plD;
    // Grupos y páginas (1.32) llevan sus ajustes en items: se aplanan para revisarlos todos.
    const aplanar = (xs) => xs.flatMap((d) => (d.items ? aplanar(d.items) : [d]));
    const grupos = tab.getSettingDefinitions();
    const defs = aplanar(grupos);
    const claves = defs.filter((d) => d.control).map((d) => d.control.key);
    p.cierto('las definiciones cubren los ajustes principales', ['capas', 'carpetas', 'propiedadTema', 'fuentes', 'maxPorCapa', 'animacion', 'dobleVerificacion'].every((k) => claves.includes(k)));
    p.cierto('cada definición con control tiene nombre y tipo', defs.filter((d) => d.control).every((d) => d.name && d.control.type));
    p.cierto('la sección de IA va como render', defs.some((d) => typeof d.render === 'function'));
    p.igual('en cuatro bloques: Mapa, IA (y su control), Novedades y la página Avanzado', grupos.map((g) => g.heading || (g.render ? 'IA' : g.name) || g.type), ['Map', 'IA', 'group', "What's new", 'Advanced']);
    p.cierto('lo raro va en la página Avanzado', grupos.find((g) => g.type === 'page')?.items.some((d) => d.control?.key === 'excluir'));
    p.igual('lee de plugin.ajustes', tab.getControlValue('capas'), AJUSTES.capas);
    await tab.setControlValue('seccionMotivos', '  '); p.igual('sección vacía vuelve a Conexiones', plD.ajustes.seccionMotivos, 'Conexiones');
    await tab.setControlValue('maxPorCapa', '90'); p.igual('el tope se guarda como número', plD.ajustes.maxPorCapa, 90);
    p.igual('cada escritura persiste', guardado, 2);
  }

  // ── 1.29: el chip de tema atenúa, no esconde; y las notas más conectadas llevan rótulo ──
  {
    const { app: a9 } = vaultSimulado({ ...NOTAS });
    const pl9 = new Plugin(); pl9.app = a9; pl9.ajustes = Object.assign({}, AJUSTES, { fuentes: 'no' }); pl9.guardar = async () => {}; pl9.manifest = { version: 't' };
    const v9 = new VistaMapa({}, pl9); v9.app = a9; v9.contentEl = el(); v9.lienzo = el(); v9.lienzo.getContext = () => contexto2D();
    v9.ctx = v9.lienzo.getContext(); v9.marca = el(); v9.chips = el(); v9.estado = el(); v9.panel = el(); v9.guia = el(); v9.resultados = el();
    await v9.recargar();
    v9.solo = 'tienda';
    p.cierto('con un tema elegido, las notas de otros temas siguen visibles', v9.N.every((n) => v9.visible(n) || n.oculto));
    const dest = v9.N.filter((n) => n.destacado);
    p.cierto('hay notas destacadas por grado y ninguna en la última capa', dest.length > 0 && dest.every((n) => n.capa < v9.D.capas.length - 1));
    p.cierto('como mucho tres por capa', [0, 1, 2].every((c) => dest.filter((n) => n.capa === c).length <= 3));
  }

  // ── 3. La vista elige la hub y avisa a sus hermanas ──────────────────────────────────────────
  const v = vista(app, AJUSTES, D);
  v.plugin.construir = null;
  await v.recargar();
  p.igual('la hub del tema es la nota con hub: true, no la primera', v.hubs.tienda, 'temas/tienda-hub.md');
  p.igual('cuenta las hermanas del tema en la última capa', v.hermanas.tienda, 2);
  const hermana = v.base['temas/tema-tienda.md'], hub = v.base['temas/tienda-hub.md'];
  p.cierto('la hermana no-hub recibe el aviso en salud', v.problemas(hermana).some((x) => /1 other note\(s\) of this topic/.test(x)));
  p.cierto('la hub no recibe ese aviso', !v.problemas(hub).some((x) => /other note\(s\)/.test(x)));
  p.igual('esHub solo para la hub', [v.esHub(hub), v.esHub(hermana), v.esHub(v.base['proyectos/horno.md'])], [true, false, false]);
  p.cierto('avisa una vez de la carpeta vacía', avisos.some((a) => /Folder with no notes.*inexistente/.test(a)));
  p.cierto('y de la nota fuera de toda capa', avisos.some((a) => /1 note\(s\) outside every layer/.test(a)));
  const nAvisos = avisos.length; await v.recargar();
  p.igual('la segunda recarga no repite los avisos', avisos.length, nAvisos);
  // Sin hub explícito, gana la primera de la última capa.
  notas['temas/tienda-hub.md'] = notas['temas/tienda-hub.md'].replace('hub: true\n', '');
  const D2 = await construir(app, AJUSTES);
  const v2 = vista(app, AJUSTES, D2); v2.plugin.construir = null; await v2.recargar();
  p.igual('sin hub: true, la hub es la primera de la última capa', v2.hubs.tienda, D2.nodos.filter((n) => n.capa === 3)[0].id);
  notas['temas/tienda-hub.md'] = NOTAS['temas/tienda-hub.md'];

  // ── 4. La cabecera ───────────────────────────────────────────────────────────────────────────
  p.cierto('en inglés dice «cited files»', /1 cited files/.test(v.textoMarca));
  p.cierto('y «off the map»', /1 off the map/.test(v.textoMarca));
  // El idioma se resuelve una sola vez por carga (Obsidian pide reiniciar): se carga el plugin
  // de nuevo en español para leer la misma cabecera.
  global.__idioma = 'es';
  const { interno: internoEs } = cargarPlugin(process.argv[2]);
  const ves = new internoEs.VistaMapa({}, { ajustes: AJUSTES, tieneIA: () => false, app });
  ves.app = app; ves.contentEl = el(); ves.marca = { ...el(), setText(t) { ves.textoMarca = t; } }; ves.chips = el(); ves.estado = el(); ves.panel = el(); ves.guia = el();
  ves.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) }; ves.ctx = ves.lienzo.getContext();
  await ves.recargar();
  global.__idioma = 'en';
  p.cierto('en español dice «archivos citados»', /1 archivos citados/.test(ves.textoMarca));
  p.cierto('y «fuera del mapa»', /1 fuera del mapa/.test(ves.textoMarca));
  const AJ_LIMPIO = Object.assign({}, AJUSTES, { carpetas: 'diario = 0\nproyectos = 1\nideas = 2\ntemas = 3\nsuelto = 2', excluir: 'plantilla-x', fuentes: 'no' });
  const vl = vista(app, AJ_LIMPIO, await construir(app, AJ_LIMPIO)); vl.plugin.construir = null; await vl.recargar();
  p.cierto('sin fuentes ni notas sueltas, la cabecera no lo menciona', !/cited|off the map/.test(vl.textoMarca));

  // ── 5. Exportar datos ────────────────────────────────────────────────────────────────────────
  const d = v.datosExportables();
  const notasMapa = D.nodos.filter((n) => !n.fuente);
  p.igual('resumen.nodos coincide con las notas del mapa', d.resumen.nodos, notasMapa.length);
  p.igual('resumen.enlaces coincide con los enlaces entre notas', d.resumen.enlaces, D.aristas.filter(([a, b]) => !a.startsWith('raw:') && !b.startsWith('raw:')).length);
  p.igual('resumen.fuentes cuenta la fuente citada', d.resumen.fuentes, 1);
  p.cierto('cada enlace trae origen, destino, motivo y frase', d.enlaces.every((e) => ['origen', 'destino', 'motivo', 'frase'].every((k) => typeof e[k] === 'string')));
  p.cierto('las reglas de conteo van en el JSON', d.reglas === REGLAS);
  p.igual('la hub va marcada en el nodo correcto', d.nodos.filter((n) => n.hub).map((n) => n.id), ['temas/tienda-hub.md']);
  p.igual('la versión sale del manifest', d.version, '1.28.0');
  p.cierto('el motivo curado llega al enlace', d.enlaces.some((e) => e.motivo === 'pidió "más calor", sin dudar'));
  await v.exportarDatos();
  const creados = escrituras.filter(([op]) => op === 'create').map(([, r]) => r);
  p.cierto('crea un .json en la carpeta de export', creados.some((r) => /^Mapa neuronal\/mapa-neuronal-\d{4}-\d{2}-\d{2}\.json$/.test(r)));
  p.cierto('crea un .csv en la carpeta de export', creados.some((r) => /^Mapa neuronal\/mapa-neuronal-\d{4}-\d{2}-\d{2}\.csv$/.test(r)));
  const csv = notas[creados.find((r) => r.endsWith('.csv'))], json = JSON.parse(notas[creados.find((r) => r.endsWith('.json'))]);
  p.igual('el CSV lleva la cabecera prometida', csv.split('\n')[0], 'origen,destino,capa_origen,capa_destino,motivo,frase');
  p.igual('el CSV tiene una fila por enlace', csv.split('\n').length - 1, d.resumen.enlaces);
  p.cierto('escapa comas y comillas', csv.includes('"pidió ""más calor"", sin dudar"'));
  p.igual('el JSON se puede leer de vuelta', json.resumen.nodos, d.resumen.nodos);
  await v.exportarDatos();
  p.cierto('la segunda exportación del día no pisa la primera', escrituras.filter(([op, r]) => op === 'create' && /-2\.json$/.test(r)).length === 1);

  // ── 6. Plugin: comandos y recarga de ajustes ─────────────────────────────────────────────────
  const pl = new Plugin(); pl.app = app; await pl.onload();
  p.igual('registra cuatro comandos', pl.comandos.length, 4);
  p.cierto('uno es recargar-ajustes', pl.comandos.some((c) => c.id === 'recargar-ajustes'));
  pl._datos = Object.assign({}, AJUSTES, { capas: 'A | a\nB | b', carpetaExport: 'otra' });
  await pl.recargarAjustes();
  p.igual('vuelve a leer data.json', [pl.ajustes.capas, pl.ajustes.carpetaExport], ['A | a\nB | b', 'otra']);
  p.igual('y completa con los valores base', pl.ajustes.proveedorIA, AJUSTES_BASE.proveedorIA);
  p.cierto('avisa que recargó', avisos.some((a) => /Settings reloaded/.test(a)));
  const mi = menuFalso(); v.llenarHerramientas(mi);
  const ti = mi.items.map((x) => x.titulo);
  p.cierto('el menú ofrece exportar datos', ti.includes('Export data (JSON and CSV)'));
  p.cierto('y recargar ajustes', ti.includes('Reload settings from data.json'));
  await pl.onunload?.();

  // ── 7. Baricentro ponderado: un enlace L0→L2 mueve la capa 0 ─────────────────────────────────
  // Dos notas de entrada con el mismo grado, ambas colgadas de c1. Solo a0 enlaza además a f2,
  // que queda abajo en la capa 2: ese enlace no contiguo debe empujar a a0 por debajo de b0.
  const BARI = {
    'e/a0.md': '\n[[c1]] y [[f2]].\n', 'e/b0.md': '\n[[c1]] y [[g0]].\n', 'e/g0.md': '\nRelleno.\n',
    'm/c1.md': '\nCentro.\n', 'm/d1.md': '\n[[e2]].\n',
    's/e2.md': '\nArriba.\n', 's/f2.md': '\nAbajo.\n',
  };
  const AJ_BARI = Object.assign({}, AJUSTES_BASE, { capas: 'E | e\nM | m\nS | s', carpetas: 'e = 0\nm = 1\ns = 2', temas: '', propiedadTema: '' });
  const ordenCapa0 = async (notasB) => (await construir(vaultSimulado(notasB).app, AJ_BARI)).nodos.filter((n) => n.capa === 0).map((n) => n.id.replace(/^e\/|\.md$/g, ''));
  const con = await ordenCapa0({ ...BARI });
  const sin = await ordenCapa0({ ...BARI, 'e/a0.md': '\n[[c1]] y [[g0]].\n' });
  p.igual('sin el enlace largo, a0 queda arriba', sin.indexOf('a0') < sin.indexOf('b0'), true);
  p.igual('con el enlace largo, a0 baja bajo b0', con.indexOf('a0') > con.indexOf('b0'), true);

  // ── 8. Plantillas y asistente con config existente ───────────────────────────────────────────
  p.igual('hay cinco plantillas, con la de negocio', PLANTILLAS.map((x) => x[0]).join(','), 'llm,negocio,profesional,academico,zettel');
  p.cierto('la primera es la de siempre', PLANTILLAS[0][2] === CAPAS_ESTANDAR);
  p.igual('la profesional tiene cinco capas', PLANTILLAS.find((x) => x[0] === 'profesional')[2].length, 5);
  p.igual('sin carpetas no hay plantilla actual', plantillaActual(Object.assign({}, AJUSTES_BASE, { carpetas: '' })), null);
  p.igual('con carpetas, la actual son las capas del usuario', plantillaActual(AJUSTES)[2], [['Entrada', 'diario'], ['Entidades', 'proyectos'], ['Conocimiento', 'ideas'], ['Temas', 'síntesis']]);
  const pl3 = new Plugin(); pl3.app = app; await pl3.onload(); pl3.ajustes = Object.assign({}, AJUSTES);
  ajustesUI.length = 0;
  const asistente = new AsistenteCapas(app, pl3);
  let errorAsistente = null; try { asistente.onOpen(); } catch (e) { errorAsistente = e.message; }
  p.igual('el asistente abre sin reventar con config existente', errorAsistente, null);
  const fila = (nombre) => (ajustesUI.find((s) => s.nombre === nombre) || {}).campos?.[0]?.valor;
  p.igual('la plantilla arranca en «actual»', fila('Layer template'), 'actual');
  p.igual('temas arranca en su capa configurada (3)', fila('temas'), '3');
  p.igual('ideas arranca en la 2', fila('ideas'), '2');
  p.igual('diario arranca en la 0', fila('diario'), '0');
  p.igual('la carpeta de fuentes arranca como fuente', fila('raw'), '-2');
  p.igual('la carpeta configurada pero inexistente aparece igual', fila('inexistente'), '1');
  p.igual('una carpeta no configurada arranca en «no mostrar»', fila('suelto'), '-1');
  // Sin config previa, las filas arrancan en lo que sugiere el nombre y la plantilla es la LLM.
  const pl4 = new Plugin(); pl4.app = app; await pl4.onload(); pl4.ajustes = Object.assign({}, AJUSTES_BASE, { carpetas: '' });
  ajustesUI.length = 0; new AsistenteCapas(app, pl4).onOpen();
  p.igual('sin config, la plantilla arranca en LLM wiki', fila('Layer template'), 'llm');
  p.igual('sin config, temas va donde sugiere el nombre', fila('temas'), '3');
  // Elegir otra plantilla reparte las carpetas por nombre; volver a «actual» las devuelve.
  const pl5 = new Plugin(); pl5.app = app; await pl5.onload(); pl5.ajustes = Object.assign({}, AJUSTES);
  ajustesUI.length = 0; const as5 = new AsistenteCapas(app, pl5); as5.onOpen();
  const menuPlantilla = () => ajustesUI.find((x) => x.nombre === 'Layer template').campos[0];
  const ultima = (nombre) => ([...ajustesUI].reverse().find((x) => x.nombre === nombre) || {}).campos?.[0]?.valor;
  menuPlantilla().alCambiar('negocio');
  p.igual('con «negocio», proyectos va a clientes y proyectos (1)', ultima('proyectos'), '1');
  p.igual('con «negocio», temas va a la última capa (4)', ultima('temas'), '4');
  p.igual('con «negocio», diario va a la entrada (0)', ultima('diario'), '0');
  p.igual('las fuentes no se tocan', ultima('raw'), '-2');
  p.igual('lo que estaba en «no mostrar» sigue oculto', ultima('suelto'), '-1');
  menuPlantilla().alCambiar('actual');
  p.igual('volver a «actual» devuelve cada carpeta a su capa', `${ultima('temas')},${ultima('ideas')},${ultima('suelto')}`, '3,2,-1');
  // Aplicar lo mismo que ya había avisa que no cambió nada, en vez de quedarse mudo.
  const pl6 = new Plugin(); pl6.app = app; await pl6.onload();
  pl6.ajustes = Object.assign({}, AJUSTES_BASE, { capas: 'Entrada | a\nTemas | b', carpetas: 'diario = 0\ntemas = 1', carpetasFuentes: '' });
  const avisos0 = avisos.length;
  await new AsistenteCapas(app, pl6).aplicar([{ carpeta: 'diario', capa: 0 }, { carpeta: 'temas', capa: 1 }], [['Entrada', 'a'], ['Temas', 'b']], false);
  p.cierto('aplicar sin cambios lo dice', /No changes/.test(avisos.slice(avisos0).join(' ')), avisos.slice(avisos0));

  // ── 9. Filtro de largo alcance ───────────────────────────────────────────────────────────────
  v.largos = true; v.medir();
  let errorDibujo = null; try { v.dibujar(); } catch (e) { errorDibujo = e.message; }
  p.igual('con largo alcance, dibujar no revienta', errorDibujo, null);
  p.cierto('y dibuja algo', v.ctx.llamadas > 50);
  v.pintarEstado();
  const m4 = menuFalso(); v.llenarFiltros(m4);
  p.cierto('con 4 capas el menú de filtros ofrece largo alcance', m4.items.some((x) => x.titulo === 'Only long-range links'));
  const mh = menuFalso(); v.llenarHerramientas(mh);
  p.cierto('el menú principal es corto: filtros y temas son un ítem cada uno', mh.items.length <= 13 && mh.items.some((x) => /^Filter/.test(x.titulo)));
  const AJ_2 = Object.assign({}, AJUSTES, { capas: 'Entrada | diario\nResto | todo', carpetas: 'diario = 0\nproyectos = 1\nideas = 1\ntemas = 1' });
  const v2c = vista(app, AJ_2, await construir(app, AJ_2)); v2c.plugin.construir = null; await v2c.recargar();
  const m2 = menuFalso(); v2c.llenarFiltros(m2);
  p.cierto('con 2 capas no lo ofrece', !m2.items.some((x) => x.titulo === 'Only long-range links'));

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('ERROR INESPERADO\n', e.stack); process.exit(1); });
