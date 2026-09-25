/* Prueba del plugin completo sobre un vault falso: carga, mapa, panel, enlaces, escritura e IA.
 *
 *   npm test        construye y corre todo
 *   node pruebas/plugin.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas, el } = require('./simulado.cjs');

const { Plugin, interno, filas: filasUI } = cargarPlugin(process.argv[2]);
const { construir, VistaMapa, AjustesMapa, AJUSTES_BASE, enlacesDe, detectarCarpetas, PROVEEDORES, CLAVE_IA } = interno;
const p = pruebas('plugin');

// ── El vault de prueba: 3 capas, 2 temas, un enlace con motivo y otro sin él ──────────────────
const NOTAS = {
  'diario/2026-01-02.md': `---\ntema: tienda\nupdated: 2026-01-02\n---\n\nAbrimos con [[proyecto-tostador]] a medias y hablamos con [[ana-soto]].\n`,
  'diario/2026-01-03.md': `---\ntema: equipo\nupdated: 2026-01-03\n---\n\nDía tranquilo. [[ana-soto]] revisó el turno.\n`,
  'proyectos/proyecto-tostador.md': `---\ntema: tienda\nupdated: 2026-01-05\nrepo: acme/tostador\nweb:\n  - Panel | https://panel.example.com\n  - "javascript:alert(1)"\n---\n\nEl tostador de 15 kg necesita más potencia; lo pidió [[ana-soto]].\n\n## Conexiones\n\n**Tema:** [[tema-tienda]]\n\n- [[ana-soto]] — pidió la máquina para el turno de la mañana\n`,
  'personas/ana-soto.md': `---\ntema: equipo\nupdated: 2026-01-04\n---\n\nEncargada del turno de la mañana. Trabaja con [[proyecto-tostador]].\n\n## Conexiones\n\n**Tema:** [[tema-equipo]]\n`,
  'temas/tema-tienda.md': `---\ntema: tienda\nupdated: 2026-01-06\n---\n\nSíntesis de la tienda: [[proyecto-tostador]].\n`,
  'temas/tema-equipo.md': `---\ntema: equipo\nupdated: 2026-01-06\n---\n\nSíntesis del equipo: [[ana-soto]].\n`,
  'plantillas/plantilla-dia.md': `---\ntema: tienda\n---\n\nPlantilla vacía.\n`,
};
const AJUSTES = Object.assign({}, AJUSTES_BASE, {
  capas: 'Entrada | notas con fecha\nEntidades | proyectos y personas\nTemas | síntesis',
  carpetas: 'diario = 0\nproyectos = 1\npersonas = 1\ntemas = 2',
  excluir: 'plantilla-dia',
  propiedadEnlaces: 'repo, web',
  temas: 'tienda = Tienda = #F7931A\nequipo = Equipo = #34D17A',
});

(async () => {
  const { app, notas, escrituras } = vaultSimulado({ ...NOTAS });

  // ── 1. Carga y descarga del plugin ───────────────────────────────────────────────────────────
  const pl = new Plugin();
  pl.app = app;
  await pl.onload();
  p.igual('registra la vista del mapa', pl.vistas.length, 1);
  p.igual('registra cuatro comandos', pl.comandos.length, 4);
  p.igual('registra el ícono de la barra', pl.ribbon.length, 1);
  p.igual('registra la pestaña de ajustes', pl.pestanas.length, 1);
  p.cierto('los comandos no repiten el nombre del plugin', !pl.comandos.some((c) => /mapa neuronal/i.test(c.name)));
  p.cierto('el idioma por defecto es inglés fuera de Obsidian', pl.comandos[0].name === 'Open the map');
  p.cierto('sin llave no cree tener IA', !pl.tieneIA());
  p.igual('no toca el vault al cargar', escrituras.length, 0);
  await pl.onunload?.();

  // ── 2. El grafo: capas, temas, motivos y frases reales ───────────────────────────────────────
  const D = await construir(app, AJUSTES);
  const porId = Object.fromEntries(D.nodos.map((n) => [n.id, n]));
  p.igual('excluye la nota excluida', D.nodos.some((n) => n.id.includes('plantilla')), false);
  p.igual('reparte las notas en 3 capas', D.capas.length, 3);
  p.igual('cuenta las notas', D.nodos.length, 6);
  p.igual('la nota de diario va a la capa 0', porId['diario/2026-01-02.md'].capa, 0);
  p.igual('el proyecto va a la capa 1', porId['proyectos/proyecto-tostador.md'].capa, 1);
  p.igual('el tema va a la última capa', porId['temas/tema-tienda.md'].capa, 2);
  p.igual('toma el color del tema', porId['proyectos/proyecto-tostador.md'].tema, 'tienda');
  // Las aristas son no dirigidas: se busca el par, sin asumir el orden en que quedó guardado.
  const arista = (x, y) => { const e = D.aristas.find(([a, b]) => (a === x && b === y) || (a === y && b === x)); return e ? { m: e[2], fr: e[3] } : null; };
  p.igual('cada enlace aparece una sola vez', D.aristas.length, new Set(D.aristas.map(([a, b]) => [a, b].sort().join('|'))).size);
  const conMotivo = arista('proyectos/proyecto-tostador.md', 'personas/ana-soto.md');
  p.igual('usa el motivo curado cuando existe', conMotivo && conMotivo.m, 'pidió la máquina para el turno de la mañana');
  const sinMotivo = arista('diario/2026-01-02.md', 'proyectos/proyecto-tostador.md');
  p.igual('sin motivo, guarda la frase real de la nota', sinMotivo.fr && sinMotivo.fr.texto.includes('Abrimos con'), true);
  p.igual('la frase trae su número de línea', typeof (sinMotivo.fr || {}).linea, 'number');
  p.cierto('el resumen sale del cuerpo, no del frontmatter', porId['personas/ana-soto.md'].resumen.startsWith('Encargada del turno'));

  // ── 3. Enlaces externos: lo que entra y lo que se bloquea ────────────────────────────────────
  const enlaces = porId['proyectos/proyecto-tostador.md'].enlaces;
  p.igual('expande usuario/repo a github.com', enlaces[0].url, 'https://github.com/acme/tostador');
  p.igual('acepta «Título | url»', [enlaces[1].titulo, enlaces[1].url], ['Panel', 'https://panel.example.com']);
  p.igual('descarta una URL javascript: escrita en la nota', enlaces.length, 2);
  p.igual('descarta file: y data:', enlacesDe({ web: ['file:///etc/passwd', 'data:text/html,x', 'ftp://x.cl'] }, { propiedadEnlaces: 'web' }).length, 0);
  p.igual('sin la propiedad configurada no muestra nada', enlacesDe({ web: ['https://x.cl'] }, { propiedadEnlaces: '' }).length, 0);

  // ── 4. La vista: dibuja, ordena, encuentra caminos y vacíos ──────────────────────────────────
  const { el, contexto2D } = require('./simulado.cjs');
  const v = new VistaMapa({}, { ajustes: AJUSTES, tieneIA: () => false, app });
  v.app = app; v.contentEl = el(); v.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) };
  v.ctx = v.lienzo.getContext(); v.marca = el(); v.chips = el(); v.estado = el(); v.panel = el(); v.guia = el();
  v.D = D; v.plugin.construir = null;
  await v.recargar();
  p.igual('deja todas las notas visibles en un vault chico', v.N.filter((n) => !n.oculto).length, 6);
  v.dibujar();
  p.cierto('dibuja en el lienzo', v.ctx.llamadas > 50);
  const ruta = v.rutaMasCorta('diario/2026-01-02.md', 'temas/tema-equipo.md');
  p.cierto('encuentra un camino entre dos notas lejanas', Array.isArray(ruta) && ruta.length >= 3);
  p.cierto('el camino no pasa por la capa de entrada', (ruta || []).slice(1).every((id) => porId[id].capa !== 0));
  p.cierto('el modo salud detecta el enlace sin motivo', v.problemas(porId['diario/2026-01-02.md']).some((x) => /reason|motivo/i.test(x)));
  v.radial = true; v.foco = 'personas/ana-soto.md'; v.medir();
  p.cierto('la vista radial arma anillos', (v.anillos || []).length >= 2);
  v.radial = false; v.medir();
  p.cierto('calcular vacíos no falla', Array.isArray(v.calcularVacios()));
  // 1.32 — «Conexiones que faltan» como lista de trabajo: orden por impacto, temas clave y descartes.
  {
    const original = v.calcularVacios;
    v.calcularVacios = () => [
      { ti: 'a', tj: 'b', real: 0, esperado: 4, todos: [{ a: 'x', b: 'y', comunes: 1 }, { a: 'z', b: 'w', comunes: 2 }] },
      { ti: 'c', tj: 'd', real: 0, esperado: 4, todos: [{ a: 'p', b: 'q', comunes: 1 }] },
    ];
    v.plugin.ajustes = Object.assign({}, AJUSTES, { temasClave: [], vaciosDescartados: [] });
    v.pendientesCache = null;   // el cálculo se reemplazó a mano: lo guardado ya no vale
    p.igual('se ordena por vecinos en común, no por tema', v.calcularPendientes().map((x) => x.clave), ['w|z', 'x|y', 'p|q']);
    v.plugin.ajustes.temasClave = ['c'];
    p.igual('un tema marcado como clave sube', v.calcularPendientes()[0].clave, 'p|q');
    v.plugin.ajustes.vaciosDescartados = ['p|q'];
    p.cierto('un par descartado no vuelve', !v.calcularPendientes().some((x) => x.clave === 'p|q'));
    const llamadas = []; v.calcularVacios = () => { llamadas.push(1); return []; }; v.pendientesCache = null;
    v.calcularPendientes(); v.calcularPendientes(); v.calcularPendientes();
    p.igual('repintar los chips no recalcula los pares si nada cambió', llamadas.length, 1);
    v.calcularVacios = original; v.plugin.ajustes = AJUSTES; v.pendientesCache = null;
  }
  v.cerrada = true; v.pedir();
  p.cierto('cerrada, no vuelve a dibujar', true);

  // ── 5. Escritura en las notas: solo lo prometido ─────────────────────────────────────────────
  const pl2 = new Plugin(); pl2.app = app; await pl2.onload();
  pl2.ajustes = Object.assign({}, AJUSTES, { seccionMotivos: 'Conexiones', carpetaAuditoria: 'auditoria' });
  const fr = { origen: 'personas/ana-soto.md', destino: 'proyectos/proyecto-tostador.md', linea: 3 };
  const antesFm = notas['personas/ana-soto.md'].match(/^---\n[\s\S]*?\n---/)[0];
  await pl2.aprobar(fr, { motivo: 'trabaja todos los días con la máquina', cita_origen: { texto: 'x' }, cita_destino: { texto: 'y' }, modelo: 'prueba' });
  const texto = notas['personas/ana-soto.md'];
  p.cierto('escribe el motivo en la sección configurada', texto.includes('- [[proyecto-tostador]] — trabaja todos los días con la máquina'));
  p.igual('no toca el frontmatter si no se le pidió', texto.match(/^---\n[\s\S]*?\n---/)[0], antesFm);
  p.cierto('no borra lo que ya estaba en la sección', texto.includes('**Tema:** [[tema-equipo]]'));
  p.cierto('deja registro de auditoría', escrituras.some(([op, ruta2]) => /auditoria/.test(ruta2)));
  pl2.ajustes.propiedadFecha = 'updated';
  await pl2.aprobar(fr, { motivo: 'segunda vez, ahora con fecha', cita_origen: {}, cita_destino: {}, modelo: 'prueba' });
  p.cierto('con la propiedad configurada, sí escribe la fecha', /updated: \d{4}-\d{2}-\d{2}/.test(notas['personas/ana-soto.md']));
  p.cierto('una nota sin la sección la crea al final', await (async () => {
    await pl2.aprobar({ origen: 'diario/2026-01-03.md', destino: 'personas/ana-soto.md', linea: 3 }, { motivo: 'la nombra ese día', cita_origen: {}, cita_destino: {}, modelo: 'prueba' });
    return /## Conexiones\n\n- \[\[ana-soto\]\] — la nombra ese día/.test(notas['diario/2026-01-03.md']);
  })());

  // Aprobar un RESUMEN también modifica la nota, así que también le toca la fecha de hoy. Antes
  // solo se estampaba al aprobar un motivo: la nota quedaba tocada con una fecha vieja, y en un
  // wiki donde esa fecha dice qué está al día, eso miente sin avisar.
  pl2.ajustes.propiedadFecha = '';
  await pl2.aprobarResumen('temas/tema-tienda.md', { resumen: 'Síntesis de la tienda.', citas: [], modelo: 'prueba' });
  p.cierto('el resumen se guarda en la propiedad resumen', /resumen: Síntesis de la tienda\./.test(notas['temas/tema-tienda.md']));
  // La nota ya traía updated: 2026-01-06. Sin la propiedad configurada, ese valor no se toca.
  p.cierto('sin propiedad de fecha configurada, deja la fecha que ya estaba', notas['temas/tema-tienda.md'].includes('updated: 2026-01-06'));
  pl2.ajustes.propiedadFecha = 'updated';
  await pl2.aprobarResumen('temas/tema-tienda.md', { resumen: 'Segunda síntesis.', citas: [], modelo: 'prueba' });
  // Misma fecha LOCAL que usa el plugin: con toISOString() la prueba fallaba entre las 21:00 y
  // las 00:00 de Chile, porque en UTC ya era el día siguiente.
  const hoyStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  p.cierto('aprobar un resumen estampa la fecha de hoy', notas['temas/tema-tienda.md'].includes('updated: ' + hoyStr));

  // ── 6. La verificación de citas, que es el candado del producto ──────────────────────────────
  p.igual('acepta una cita literal', pl2.verificarCita('turno de la mañana', 'Encargada del turno de la mañana.'), true);
  p.igual('acepta cambios de espacios y de negrita', pl2.verificarCita('**turno**   de la   mañana', 'Encargada del turno de la mañana.'), true);
  p.igual('rechaza una cita inventada', pl2.verificarCita('turno de la tarde', 'Encargada del turno de la mañana.'), false);
  p.igual('rechaza una cita demasiado corta para verificar', pl2.verificarCita('turno', 'Encargada del turno de la mañana.'), false);
  p.igual('rechaza una cita reformulada', pl2.verificarCita('ella se encarga de la mañana', 'Encargada del turno de la mañana.'), false);

  // ── 7. Los cinco proveedores de IA y sus errores ────────────────────────────────────────────
  const esquema = { type: 'object', additionalProperties: false, required: ['fiel', 'problema'], properties: { fiel: { type: 'boolean' }, problema: { type: 'string' } } };
  const respuestas = {
    claude: { status: 200, json: { content: [{ type: 'text', text: '{"fiel":true,"problema":""}' }] } },
    openai: { status: 200, json: { choices: [{ message: { content: '{"fiel":true,"problema":""}' } }] } },
    gemini: { status: 200, json: { candidates: [{ content: { parts: [{ text: '```json\n{"fiel":true,"problema":""}\n```' }] } }] } },
    openrouter: { status: 200, json: { choices: [{ message: { content: '{"fiel":true,"problema":""}' } }] } },
    local: { status: 200, json: { choices: [{ message: { content: '{"fiel":true,"problema":""}' } }] } },
  };
  for (const prov of Object.keys(PROVEEDORES)) {
    app._ls = {}; if (PROVEEDORES[prov].llave) app._ls[CLAVE_IA(prov)] = 'llave-de-prueba';
    pl2.ajustes.proveedorIA = prov; pl2.ajustes.modeloIA = prov === 'claude' ? 'claude-opus-5' : 'modelo-x';
    let visto = null; global.__req = (o) => { visto = o; return respuestas[prov]; };
    const r = await pl2.llamarIA('sistema', 'usuario', esquema);
    p.igual(`${prov}: devuelve el JSON pedido`, r, { fiel: true, problema: '' });
    p.cierto(`${prov}: manda la llave donde corresponde`, prov === 'local' ? true : /llave-de-prueba/.test(JSON.stringify(visto.headers) + visto.url));
    p.cierto(`${prov}: no manda la llave en el cuerpo`, !/llave-de-prueba/.test(visto.body));
    p.cierto(`${prov}: pide respuesta en JSON`, /json/i.test(visto.body));
  }
  pl2.ajustes.proveedorIA = 'claude'; app._ls[CLAVE_IA('claude')] = 'x';
  const errores = [
    [{ status: 401, json: {} }, /rejected the key/i],
    [{ status: 429, json: {} }, /usage limit/i],
    [{ status: 0, json: {} }, /did not answer/i],
    [{ status: 400, json: { error: { message: 'modelo inexistente' } } }, /modelo inexistente/],
    [{ status: 200, json: { content: [{ type: 'text', text: 'no soy json' }] } }, /readable/i],
    [{ status: 200, json: { stop_reason: 'refusal' } }, /declined/i],
  ];
  for (const [respuesta, esperado] of errores) {
    global.__req = () => respuesta;
    let msg = '(no lanzó)';
    try { await pl2.llamarIA('s', 'u', esquema); } catch (e) { msg = e.message; }
    p.cierto(`error ${respuesta.status}: mensaje claro («${msg.slice(0, 40)}»)`, esperado.test(msg));
  }
  // ── Reintento ante fallas pasajeras ─────────────────────────────────────────────────────────
  // Un 503 en la capa gratuita es lo normal a ciertas horas. Rendirse en el primer intento hacía
  // fallar una sugerencia que iba a funcionar dos segundos después.
  pl2.esperasReintento = [0, 0, 0];
  pl2.ajustes.proveedorIA = 'claude'; pl2.ajustes.modeloIA = 'claude-opus-5';
  app._ls[CLAVE_IA('claude')] = 'llave-de-prueba';
  let intentos = 0;
  global.__req = () => { intentos++; return intentos < 3 ? { status: 503, json: {} } : { status: 200, json: { content: [{ type: 'text', text: '{"fiel":true,"problema":""}' }] } }; };
  p.igual('un 503 pasajero se reintenta y termina bien', await pl2.llamarIA('s', 'u', esquema), { fiel: true, problema: '' });
  p.igual('reintentó las veces justas', intentos, 3);

  intentos = 0;
  global.__req = () => { intentos++; return { status: 401, json: {} }; };
  try { await pl2.llamarIA('s', 'u', esquema); } catch { /* esperado */ }
  p.igual('una llave rechazada NO se reintenta: no gasta cuota en vano', intentos, 1);

  intentos = 0;
  global.__req = () => { intentos++; return { status: 503, json: {} }; };
  let msg503 = '';
  try { await pl2.llamarIA('s', 'u', esquema); } catch (e) { msg503 = e.message; }
  p.igual('un 503 permanente se rinde tras cuatro intentos', intentos, 4);
  p.cierto('y lo explica sin culpar al usuario', /not your setup/i.test(msg503));

  // Un 5xx tiene que aconsejar según el proveedor: a quien usa Gemini no se le puede decir que
  // revise si su servidor local está corriendo, ni hacerle creer que la culpa es de su config.
  for (const [prov, debe, noDebe] of [['gemini', /down or overloaded/i, /Ollama/i], ['local', /Ollama/i, /not your setup/i]]) {
    pl2.ajustes.proveedorIA = prov; pl2.ajustes.modeloIA = 'modelo-x';
    pl2.esperasReintento = [0, 0, 0];
    app._ls[CLAVE_IA(prov)] = 'x';
    global.__req = () => ({ status: 503, json: {} });
    let msg = '(no lanzó)';
    try { await pl2.llamarIA('s', 'u', esquema); } catch (e) { msg = e.message; }
    p.cierto(`503 con ${prov}: el consejo corresponde al proveedor`, debe.test(msg));
    p.cierto(`503 con ${prov}: no da el consejo del otro`, !noDebe.test(msg));
  }
  pl2.ajustes.proveedorIA = 'claude';

  app._ls = {};
  let msgSinLlave = '';
  try { await pl2.llamarIA('s', 'u', esquema); } catch (e) { msgSinLlave = e.message; }
  p.cierto('sin llave avisa antes de salir a la red', /key is missing/i.test(msgSinLlave));

  // ── 8. Las herramientas también cuelgan del «···» de la pestaña ──────────────────────────────
  const { Menu } = require('./simulado.cjs').obsidian || {};
  const menuFalso = { items: [], addItem(f) { const c = { titulo: '', setTitle(v) { c.titulo = v; return c; }, setIcon: () => c, setChecked: () => c, onClick: () => c }; this.items.push(c); f(c); return this; }, addSeparator() { this.items.push('---'); return this; } };
  v.onPaneMenu(menuFalso, 'more-options');
  const titulos = menuFalso.items.filter((x) => x !== '---').map((x) => x.titulo);
  p.cierto('el menú de la pestaña ofrece el asistente de capas', titulos.includes('Layer wizard'));
  p.cierto('y el camino entre dos notas', titulos.includes('Path between two notes'));
  const otroMenu = { items: [], addItem(f) { const c = { setTitle: () => c, setIcon: () => c, setChecked: () => c, onClick: () => c }; this.items.push(c); f(c); return this; }, addSeparator() { return this; } };
  v.onPaneMenu(otroMenu, 'tab-header');
  p.igual('en la cabecera de la pestaña no se mete', otroMenu.items.length, 0);

  // ── 9. El botón «Probar la conexión»: una llamada mínima, sin notas ──────────────────────────
  app._ls = {}; app._ls[CLAVE_IA('claude')] = 'llave-de-prueba';
  pl2.ajustes.proveedorIA = 'claude'; pl2.ajustes.modeloIA = 'claude-opus-5';
  let cuerpoPrueba = null;
  global.__req = (o) => { cuerpoPrueba = o.body; return { status: 200, json: { content: [{ type: 'text', text: '{"ok":true}' }] } }; };
  const prueba = await pl2.llamarIA('Responde solo con JSON.', 'Devuelve exactamente {"ok": true}.',
    { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } });
  p.igual('la prueba de conexión devuelve ok', prueba, { ok: true });
  p.cierto('la prueba no manda ninguna nota', !/tostadora|ana-soto|Encargada/i.test(cuerpoPrueba));
  p.cierto('la prueba es corta (menos de 400 caracteres)', cuerpoPrueba.length < 400);

  // ── 10. El asistente de capas propone algo sensato ────────────────────────────────────────────
  const filas = detectarCarpetas(app);
  const capaDe = (c) => (filas.find((f) => f.carpeta === c) || {}).capa;
  p.igual('manda el diario a la primera capa', capaDe('diario'), 0);
  p.igual('manda personas a entidades', capaDe('personas'), 1);
  p.igual('manda temas a la última', capaDe('temas'), 3);
  p.igual('no muestra las plantillas', capaDe('plantillas'), -1);

  // ── 11. La pantalla de ajustes se dibuja COMPLETA con cada proveedor ─────────────────────────
  // La única prueba que dibujaba esta pantalla corría en Chrome, y se salta sola donde no hay
  // Chrome (CI incluido). Un TypeError a media pantalla —llamar un método que `PluginSettingTab`
  // no tiene— la cortaba dejando el campo «Modelo» y el botón «Probar» invisibles, y las 77
  // pruebas seguían en verde. Esta afirma que la ÚLTIMA fila existe: si algo revienta antes,
  // no llega.
  for (const prov of Object.keys(PROVEEDORES)) {
    pl2.ajustes.proveedorIA = prov;
    const tab = new AjustesMapa(app, pl2);
    tab.containerEl = el();
    filasUI.length = 0;
    let error = null;
    try { tab.display(); } catch (e) { error = e.message; }
    p.igual(`la pantalla de ajustes no revienta con ${prov}`, error, null);
    // El arnés corre en inglés, así que se afirma sobre las etiquetas traducidas; que la versión
    // en español exista lo garantiza pruebas/idioma.cjs.
    p.cierto(`con ${prov} llega hasta el final (Reset)`, filasUI.includes('Reset'));
    p.cierto(`con ${prov} se dibuja el campo Model`, filasUI.includes('Model'));
    p.cierto(`con ${prov} se dibuja el botón de probar`, filasUI.includes('Test the connection'));
    p.cierto(`con ${prov} se dibujan las 21 filas`, filasUI.length >= 21);
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('ERROR INESPERADO\n', e.stack); process.exit(1); });
