/* Prueba de la ingesta: de lo crudo al wiki.
 *
 * Lo que se protege aquí es el vault de quien instala el plugin: la ingesta le propone
 * ESCRIBIR páginas. Si el modelo devuelve una ruta fuera de la carpeta del wiki, o si algo
 * se guarda sin que la persona apruebe, el daño no se deshace solo.
 *
 *   node pruebas/ingesta.cjs        prueba el main.js ya construido
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('ingesta');
const { Plugin, interno } = cargarPlugin(process.argv[2]);
const { CLAVE_IA } = interno;

const DIA = 24 * 3600 * 1000;
const NOTAS = {
  'raw/daily/2026-09-22/sesion.md': 'Se decidió cobrar la auditoría de código como servicio.',
  'raw/daily/2026-09-10/viejo.md': 'Material anterior a la última ingesta.',
  'wiki/negocio/precios.md': '# Precios\n\nSin definir.',
  'wiki/cliente.md': '# Cliente\n\n## Pendientes\n\n- uno\n\n## Historia\n\n- x',
  'notas/otra.md': 'Fuera de las carpetas configuradas.',
};

// Proponer como lo hace la ventana: primero se filtra lo ya enviado, después se llama a la IA.
async function proponer(pl, archivos) {
  const material = await pl.prepararMaterial(archivos || pl.reunirCrudo());
  return Object.assign(await pl.proponerIngesta(material.piezas), { material });
}

// IA falsa con los dos pasos: A (buscar novedades) y B (comparar con las páginas).
function conIA2(pl, a, b) {
  pl.llamarIA = async (sistema, usuario) => {
    const r = /^Comparas/.test(sistema) ? b : a;
    return typeof r === 'function' ? r(usuario) : (r || { resultados: [] });
  };
}

// IA falsa: devuelve lo que se le diga, sin red.
function conIA(pl, respuesta) {
  pl.llamarIA = async () => (typeof respuesta === 'function' ? respuesta() : respuesta);
}

(async () => {
  const { app, notas, escrituras, mtimes } = vaultSimulado({ ...NOTAS });
  mtimes['raw/daily/2026-09-22/sesion.md'] = Date.now() - 1 * DIA;
  mtimes['raw/daily/2026-09-10/viejo.md'] = Date.now() - 20 * DIA;
  mtimes['notas/otra.md'] = Date.now() - 1 * DIA;

  const pl = new Plugin();
  pl.app = app;
  await pl.onload();

  // ── 1. Sin configurar, la función no existe ────────────────────────────────────────────────
  p.cierto('sin carpetas configuradas, la ingesta no está lista', !pl.ingestaLista());
  const cmd = pl.comandos.find((c) => c.id === 'ingerir');
  p.cierto('el comando de ingesta existe', !!cmd);
  p.cierto('el comando no aparece si no hay nada configurado', cmd.checkCallback(true) === false);

  pl.ajustes.carpetaCrudo = 'raw/daily';
  pl.ajustes.carpetaWiki = 'wiki';
  p.cierto('con carpetas pero sin IA, sigue sin estar lista', !pl.ingestaLista());
  app.saveLocalStorage(CLAVE_IA('claude'), 'llave-de-prueba');
  p.cierto('con carpetas y llave, la ingesta está lista', pl.ingestaLista());

  // ── 2. Qué material entra ──────────────────────────────────────────────────────────────────
  let crudo = pl.reunirCrudo().map((f) => f.path);
  p.igual('sin sello previo toma los últimos 7 días', crudo, ['raw/daily/2026-09-22/sesion.md']);
  p.cierto('no toma archivos fuera de la carpeta configurada', !crudo.includes('notas/otra.md'));

  pl.ajustes.ultimaIngesta = new Date(Date.now() + DIA).toISOString().slice(0, 10);
  p.igual('con el sello al día, no hay material pendiente', pl.reunirCrudo().length, 0);
  pl.ajustes.ultimaIngesta = '';

  // ── 3. Buscar novedades: destinos dentro del wiki y citas comprobadas ──────────────────────
  const SESION = 'raw/daily/2026-09-22/sesion.md';
  let llamadasB = 0;
  conIA2(pl, {
    novedades: [
      { texto: 'La auditoría de código se cobra como servicio', cita: 'Se decidió cobrar la **auditoría de código**\ncomo servicio', fuente: SESION, destino: 'wiki/negocio/precios.md', crear: false },
      { texto: 'Algo fuera', cita: 'Se decidió cobrar la auditoría', fuente: SESION, destino: '../fuera.md', crear: true },
      { texto: 'Otra fuera', cita: 'Se decidió cobrar la auditoría', fuente: SESION, destino: 'notas/otra.md', crear: false },
      { texto: 'El precio es un peso', cita: 'el precio acordado es de un peso chileno', fuente: SESION, destino: 'wiki/negocio/precios.md', crear: false },
      { texto: 'Cliente nuevo pide cotizar', cita: 'Se decidió cobrar la auditoría de código', fuente: SESION, destino: 'wiki/clientes/nuevo.md', crear: true },
      { texto: 'Ruta con ..', cita: 'Se decidió cobrar la auditoría', fuente: SESION, destino: 'wiki/../raw/daily/x.md', crear: true },
      { texto: 'Ruta oculta', cita: 'Se decidió cobrar la auditoría', fuente: SESION, destino: 'wiki/.obsidian/x.md', crear: true },
    ],
    contradicciones: [{ afirmacion: 'El precio cambia', fuenteA: 'raw/a.md', fuenteB: 'raw/b.md' }],
  }, (u) => {
    llamadasB++;
    return { resultados: [
      { id: 'n0', estado: 'nuevo', seccion: pl.ajustes.seccionMotivos, texto: 'Auditoría de código: se cobra como servicio aparte.', detalle: '' },
      { id: 'n3', estado: 'choca', seccion: '', texto: '', detalle: 'La página dice: Sin definir.' },
      { id: 'n99', estado: 'nuevo', seccion: '', texto: 'id inventado', detalle: '' },
    ] };
  });
  const prop = await proponer(pl);
  const N = prop.novedades;
  p.igual('se leen todas las novedades', N.length, 7);
  p.igual('los destinos fuera del wiki, con «..» u ocultos quedan sin página', [N[1], N[2], N[5], N[6]].map((x) => x.destino), ['', '', '', '']);
  p.cierto('una cita con otros saltos de línea o negritas igual se verifica', N[0].verificada);
  p.cierto('una cita que no está en el archivo no se verifica', !N[3].verificada);
  p.igual('solo se compara la página que ya existe, en una llamada', llamadasB, 1);
  p.igual('la comparación redacta la línea al estilo de la página', N[0].texto, 'Auditoría de código: se cobra como servicio aparte.');
  p.igual('si la IA elige la sección de conexiones, no se muestra como destino', N[0].seccion, '');
  p.igual('lo que choca con la página queda marcado', N[3].estado, 'choca');
  p.cierto('una página nueva no se compara y queda para crear', N[4].crear && N[4].estado === 'nuevo');
  p.cierto('un id inventado en la comparación no crea novedades', !N.some((x) => x.texto === 'id inventado'));
  p.igual('las contradicciones del material se conservan', prop.contradicciones.length, 1);
  p.igual('buscar novedades no escribe nada en el vault', escrituras.length, 0);

  // ── 4. Aprobar inserta; nunca borra; no duplica ────────────────────────────────────────────
  p.igual('aprobar inserta', await pl.aplicarNovedad(N[0]), 'insertada');
  const precios = notas['wiki/negocio/precios.md'];
  p.cierto('lo que la página tenía sigue ahí', precios.startsWith('# Precios\n\nSin definir.'));
  p.cierto('sin sección conocida, va a una sección fechada con su fuente', /## \d{4}-\d{2}-\d{2} · (ingesta|ingestion)/.test(precios) && precios.includes('[[raw/daily/2026-09-22/sesion|'));
  p.igual('aprobar dos veces lo mismo no lo repite', await pl.aplicarNovedad(N[0]), 'ya_estaba');
  p.igual('…y la página no cambia', notas['wiki/negocio/precios.md'], precios);
  let fallo = false; try { await pl.aplicarNovedad(N[3]); } catch { fallo = true; }
  p.cierto('una novedad sin cita verificada no se puede aprobar', fallo);
  p.cierto('queda registro de la aprobación', Object.keys(notas).some((k) => k.includes('mapa-neuronal-motivos.md')));
  await pl.aplicarNovedad({ destino: 'wiki/cliente.md', seccion: 'Pendientes', texto: 'Enviar propuesta', verificada: true, fuente: SESION, cita: 'x' });
  p.cierto('con sección conocida, la línea va al final de esa sección', notas['wiki/cliente.md'].includes('- uno\n- Enviar propuesta ([[raw/daily/2026-09-22/sesion|') && notas['wiki/cliente.md'].includes('\n\n## Historia'));

  // La sección de motivos es del mapa: una novedad nunca se mete ahí aunque la IA la elija.
  await pl.aplicarNovedad({ destino: 'wiki/cliente.md', seccion: 'Conexiones', texto: 'Línea que no va en conexiones', verificada: true, fuente: SESION, cita: 'x' });
  const cli = notas['wiki/cliente.md'];
  p.cierto('una novedad nunca se inserta en la sección de conexiones', !(cli.split(/## (Conexiones|Connections)/)[2] || '').includes('Línea que no va') && cli.includes('Línea que no va'));

  // ── 5. Una IA sin novedades no rompe ni escribe ────────────────────────────────────────────
  const antes = escrituras.length;
  conIA2(pl, { novedades: [], contradicciones: [] });
  const vacia = await proponer(pl);
  p.igual('sin novedades, no hay nada que aprobar', vacia.novedades.length, 0);
  p.igual('y no se escribió nada más', escrituras.length, antes);

  // ── 7. La ingesta no se ingiere a sí misma ─────────────────────────────────────────────────
  // En el vault real carpetaAuditoria = carpetaCrudo = raw/daily: el registro cae dentro del material.
  pl.ajustes.carpetaAuditoria = 'raw/daily';
  await pl.registrar('\n- prueba\n');
  const pendientes = pl.reunirCrudo().map((f) => f.path);
  p.cierto('el registro de aprobaciones no cuenta como material', !pendientes.some((x) => x.endsWith('mapa-neuronal-motivos.md')));

  // ── 8. Una tanda que falla no se lleva a las demás; cerrar corta las llamadas ──────────────
  mtimes['raw/daily/2026-09-22/otra.md'] = Date.now(); notas['raw/daily/2026-09-22/otra.md'] = 'Otro material con una decisión importante del proyecto.';
  let n = 0;
  conIA2(pl, () => { n++; if (n === 1) throw new Error('cuota agotada'); return { novedades: [{ texto: 'B', cita: 'una decisión importante del proyecto', fuente: 'raw/daily/2026-09-22/otra.md', destino: 'wiki/b.md', crear: true }], contradicciones: [] }; });
  const lote = [{ path: SESION, stat: { mtime: 1000 } }, { path: 'raw/daily/2026-09-22/otra.md', stat: { mtime: 2000 } }];
  const limites = pl.limitesIngesta;
  pl.limitesIngesta = () => ({ trozo: 20000, tanda: 1, paralelo: 1 });   // una tanda por archivo, en orden
  const mixta = await proponer(pl, lote);
  p.igual('el archivo que falla queda como aviso', mixta.avisos.length, 1);
  p.igual('y el siguiente igual trae sus novedades', mixta.novedades.map((x) => x.destino), ['wiki/b.md']);
  p.igual('el sello avanza hasta el archivo más nuevo leído', mixta.material.hasta, 2000);
  n = 0; conIA2(pl, () => { n++; return { novedades: [], contradicciones: [] }; });
  await pl.proponerIngesta((await pl.prepararMaterial(lote)).piezas, () => false);
  pl.limitesIngesta = limites;
  p.igual('si se cierra la ventana, no se hace ninguna llamada más', n, 0);

  // ── 9. Dos novedades para la misma página nueva ───────────────────────────────────────────
  const nueva = { destino: 'wiki/dup.md', crear: true, seccion: '', texto: 'uno', verificada: true, fuente: 'raw/daily/a.md', cita: 'x' };
  await pl.aplicarNovedad(nueva);
  await pl.aplicarNovedad({ ...nueva, texto: 'dos', fuente: 'raw/daily/b.md' });
  const d = notas['wiki/dup.md'];
  p.cierto('la primera crea la página y la segunda agrega', d.startsWith('# dup') && d.includes('- uno') && d.includes('- dos'));

  // ── 10. Sello antiguo (solo fecha) sigue funcionando ───────────────────────────────────────
  pl.ajustes.ultimaIngesta = '2099-01-01';
  p.igual('un sello con solo la fecha se sigue entendiendo', pl.reunirCrudo().length, 0);

  // ── 11. Etapa 1: nunca dos veces lo mismo ──────────────────────────────────────────────────
  {
    const LARGO = 'Se decidió cobrar la auditoría de código como un servicio aparte del desarrollo.';
    const v = vaultSimulado({
      'raw/d1/claude-code.md': `# Sesión\n\n${LARGO}`,
      'raw/d1/claude-code.mini.md': `# Sesión\n\n${LARGO}`,
      'raw/d1/00-digest.md': 'Resumen del día.',
      'raw/d2/otra.md': `Nota de otro día.\n\n${LARGO}\n\nY algo realmente nuevo que no estaba en ningún archivo anterior.`,
      'raw/d3/largo.md': Array.from({ length: 70 }, (_, i) => `Párrafo ${i}: ${'contenido de relleno distinto '.repeat(30)}${i}`).join('\n\n'),
      'wiki/x.md': '# X',
    });
    const q = new Plugin(); q.app = v.app; await q.onload();
    Object.assign(q.ajustes, { carpetaCrudo: 'raw', carpetaWiki: 'wiki' });
    v.app.saveLocalStorage(CLAVE_IA('claude'), 'llave');
    q.llamarIA = async () => ({ novedades: [], contradicciones: [] });

    const rutas = q.reunirCrudo().map((f) => f.path);
    p.cierto('las copias .mini no entran', !rutas.some((r) => r.endsWith('.mini.md')));
    p.cierto('los digest no entran', !rutas.some((r) => r.includes('digest')));

    const m1 = await q.prepararMaterial(q.reunirCrudo());
    const deOtra = m1.piezas.filter((x) => x.ruta === 'raw/d2/otra.md').map((x) => x.texto).join('');
    p.cierto('un párrafo que ya viene en otro archivo del lote no se repite', !deOtra.includes(LARGO) && deOtra.includes('realmente nuevo'));
    const partes = m1.piezas.filter((x) => x.ruta === 'raw/d3/largo.md');
    p.cierto('un archivo largo se parte en trozos en vez de omitirse', partes.length >= 2 && partes.every((x) => x.texto.length <= 20000));
    await q.proponerIngesta(m1.piezas);
    await q.confirmarIngesta(m1);
    p.cierto('lo revisado queda en ingesta.json', Object.keys(v.internos).some((k) => k.endsWith('ingesta.json')));

    // (a) el mismo archivo abierto y guardado otra vez (cambia la fecha, no el texto) → nada
    q.ajustes.ultimaIngesta = '';
    const m2 = await q.prepararMaterial(q.reunirCrudo());
    p.igual('lo ya ingerido no se vuelve a enviar', m2.piezas.length, 0);
    p.igual('y cuenta como repetido', m2.repetidos, 3);

    // (b) un archivo que creció → solo lo agregado
    v.notas['raw/d1/claude-code.md'] += '\n\nAgregado en la tarde: se aprobó el precio de la auditoría con el cliente.';
    const m3 = await q.prepararMaterial(q.reunirCrudo());
    p.igual('de un archivo que creció sale una sola pieza', m3.piezas.length, 1);
    p.cierto('y lleva solo lo agregado', m3.piezas[0].texto.includes('Agregado en la tarde') && !m3.piezas[0].texto.includes('# Sesión'));

    // Cerrar sin terminar → sigue pendiente; una llamada que falla → el archivo vuelve
    const m4 = await q.prepararMaterial(q.reunirCrudo());
    p.igual('sin «Terminar», lo nuevo sigue pendiente', m4.piezas.length, 1);
    q.llamarIA = async () => { throw new Error('cuota'); };
    await q.proponerIngesta(m4.piezas);
    await q.confirmarIngesta(m4);
    p.igual('si la llamada falló, el archivo no se marca como ingerido', (await q.prepararMaterial(q.reunirCrudo())).piezas.length, 1);

    // Un registro dañado no rompe: se parte de cero
    for (const k of Object.keys(v.internos)) v.internos[k] = '{roto';
    p.cierto('un ingesta.json dañado no rompe la ingesta', (await q.prepararMaterial(q.reunirCrudo())).piezas.length > 1);
  }

  // ── 12. Etapa 2: rápido ────────────────────────────────────────────────────────────────────
  {
    const notas50 = {};
    for (let i = 0; i < 50; i++) notas50[`raw/d/${String(i).padStart(2, '0')}.md`] = `Archivo ${i}. ` + `Material distinto número ${i} para la prueba de velocidad. `.repeat(140);
    const v = vaultSimulado(notas50);
    const q = new Plugin(); q.app = v.app; await q.onload();
    Object.assign(q.ajustes, { carpetaCrudo: 'raw', carpetaWiki: 'wiki', proveedorIA: 'claude' });
    const total = Object.values(notas50).join('').length;
    let llamadas = 0, enVuelo = 0, maxVuelo = 0;
    q.llamarIA = async (s, u) => {
      llamadas++; enVuelo++; maxVuelo = Math.max(maxVuelo, enVuelo);
      await new Promise((ok) => setTimeout(ok, 5));
      enVuelo--;
      const fuente = (u.match(/fuente="([^"]+)"/g) || []).pop().slice(8, -1);
      return { novedades: [{ texto: 'V', cita: 'Material distinto número', fuente, destino: 'wiki/v.md', crear: true }], contradicciones: [] };
    };
    const m = await q.prepararMaterial(q.reunirCrudo());
    const prop = await q.proponerIngesta(m.piezas);
    p.cierto(`50 archivos / ${Math.round(total / 1024)} KB → 10 llamadas o menos (${llamadas})`, llamadas <= 10);
    p.cierto(`nunca más de 3 llamadas a la vez (${maxVuelo})`, maxVuelo <= 3 && maxVuelo > 1);
    p.cierto('todas las piezas quedan leídas', m.piezas.every((x) => x.ok));
    p.cierto('la fuente que dice la IA se respeta si es uno de los archivos enviados', prop.novedades.every((x) => /^raw\/d\/\d\d\.md$/.test(x.fuente) && x.verificada));

    // Detener a mitad: no se empiezan más tandas y lo recibido se conserva
    const m2 = await q.prepararMaterial(q.reunirCrudo());
    llamadas = 0;
    const parcial = await q.proponerIngesta(m2.piezas, (hechas) => (hechas >= 2 ? false : undefined));
    p.cierto('detener corta las llamadas pendientes', parcial.leidas < parcial.tandas && llamadas < parcial.tandas);
    p.igual('y lo ya recibido se muestra', parcial.novedades.length, parcial.leidas);
    await q.confirmarIngesta(m2);
    const resto = await q.prepararMaterial(q.reunirCrudo());
    p.cierto('lo no leído queda para la próxima vez', resto.piezas.length > 0 && resto.piezas.length < m2.piezas.length);

    // Una fuente inventada por la IA no se acepta
    q.llamarIA = async () => ({ novedades: [{ texto: 'I', cita: 'uno dos tres cuatro cinco', fuente: 'raw/inventado.md', destino: 'wiki/i.md', crear: true }], contradicciones: [] });
    const inv = await q.proponerIngesta([{ ruta: 'raw/d/00.md', texto: 'uno', parte: 1, partes: 1, hs: [] }, { ruta: 'raw/d/01.md', texto: 'dos', parte: 1, partes: 1, hs: [] }]);
    p.cierto('con una fuente inventada, la novedad no se puede aprobar', inv.novedades[0].fuente === '' && !inv.novedades[0].verificada);

    // IA local: tandas chicas y de a una
    q.ajustes.proveedorIA = 'local';
    p.igual('con IA local: tandas de 8.000 caracteres, una a la vez', q.limitesIngesta(), { trozo: 6000, tanda: 8000, paralelo: 1 });

    // Esperar lo que pide el servicio
    const e = (r) => q.esperaPedida(r);
    p.igual('Retry-After en segundos', e({ headers: { 'retry-after': '7' } }), 7000);
    p.igual('retryDelay de Gemini', e({ headers: {}, json: { error: { details: [{ '@type': 'RetryInfo', retryDelay: '13s' }] } } }), 13000);
    p.igual('nunca más de 60 s', e({ headers: { 'retry-after': '900' } }), 60000);
    p.igual('sin indicación, no inventa una espera', e({ headers: {}, json: {} }), null);
  }

  // ── 13. Etapa 5: al abrir Obsidian ─────────────────────────────────────────────────────────
  {
    const crear = () => {
      const v = vaultSimulado({ 'raw/hoy.md': 'Se aprobó el presupuesto del proyecto de despacho para octubre.', 'wiki/x.md': '# X' });
      const q = new Plugin(); q.app = v.app;
      return { v, q };
    };
    let { v, q } = crear(); await q.onload();
    Object.assign(q.ajustes, { carpetaCrudo: 'raw', carpetaWiki: 'wiki' });
    v.app.saveLocalStorage(CLAVE_IA('claude'), 'llave');
    let llamadas = 0;
    q.llamarIA = async () => { llamadas++; return { novedades: [{ texto: 'Presupuesto aprobado', cita: 'Se aprobó el presupuesto del proyecto', fuente: 'raw/hoy.md', destino: 'wiki/despacho.md', crear: true }], contradicciones: [] }; };

    p.igual('apagado (por defecto): al abrir no se llama a la IA', [await q.alAbrirObsidian(), llamadas], ['apagado', 0]);

    q.ajustes.autoIngesta = true;
    p.igual('encendido: prepara las novedades en segundo plano', await q.alAbrirObsidian(), 'hecho');
    p.cierto('y quedan esperando revisión', llamadas === 1 && q.nov?.fase === 'revisar' && q.nov.prop.novedades.length === 1);
    p.igual('mientras esperan, abrir de nuevo no vuelve a llamar', [await q.alAbrirObsidian(), llamadas], ['revision-pendiente', 1]);
    const reg = JSON.parse(Object.values(v.internos)[0]);
    // [1.33.1] Lo leído se sella al terminar la búsqueda y el bloqueo se suelta; la revisión queda guardada.
    p.cierto('se anotan las llamadas del día, lo leído queda sellado y la revisión guardada', reg.uso?.llamadas === 1 && !reg.bloqueo && reg.revision?.novedades?.length === 1);

    // Otro dispositivo (mismo vault por Sync) ve el bloqueo y no paga de nuevo
    const otro = new Plugin(); otro.app = Object.assign({}, v.app, { _ls: {}, loadLocalStorage: (k) => otro.app._ls[k], saveLocalStorage: (k, x) => { otro.app._ls[k] = x; } });
    await otro.onload(); Object.assign(otro.ajustes, { carpetaCrudo: 'raw', carpetaWiki: 'wiki', autoIngesta: true });
    otro.app.saveLocalStorage(CLAVE_IA('claude'), 'llave'); otro.llamarIA = q.llamarIA;
    p.igual('otro dispositivo no vuelve a pagar: retoma la revisión guardada', [await otro.alAbrirObsidian(), llamadas, !!otro.nov?.recuperada], ['revision-pendiente', 1, true]);

    // Terminar suelta el bloqueo
    await q.confirmarIngesta(q.nov.material); q.nov = null;
    p.cierto('al terminar, el bloqueo se suelta', !JSON.parse(Object.values(v.internos)[0]).bloqueo);

    // Tope diario
    ({ v, q } = crear()); await q.onload();
    Object.assign(q.ajustes, { carpetaCrudo: 'raw', carpetaWiki: 'wiki', autoIngesta: true, topeDiario: 5 });
    v.app.saveLocalStorage(CLAVE_IA('claude'), 'llave');
    llamadas = 0; q.llamarIA = async () => { llamadas++; return { novedades: [], contradicciones: [] }; };
    await q.anotarUso(5);
    p.igual('con el tope del día alcanzado, no llama y lo dice', [await q.alAbrirObsidian(), llamadas], ['tope', 0]);
  }

  // ── 14. Etapa 6: alias y «Permitir crear páginas» ──────────────────────────────────────────
  {
    const v = vaultSimulado({
      'raw/hoy.md': 'Llamada con Ferretería Andes SpA: aceptaron la propuesta de facturación electrónica.',
      'alias.md': '# Entidades\n\n- **Ferretería Andes** | `clientes/ferreteria-andes` | cliente | ferretería de barrio\n  - aliases: "Ferretería Andes SpA", "HQ"\n- **Sin página** | `[pendiente]` | persona\n  - aliases: "Nadie"\n- [[proyectos/despacho]]\n  - alias: Despacho en bici, Bici',
      'wiki/clientes/ferreteria-andes.md': '# Ferretería Andes\n\n## Estado\n\n- Prospecto',
      'wiki/proyectos/despacho.md': '# Despacho',
    });
    const q = new Plugin(); q.app = v.app; await q.onload();
    Object.assign(q.ajustes, { carpetaCrudo: 'raw', carpetaWiki: 'wiki', archivoAlias: 'alias.md' });
    const alias = await q.leerAlias();
    p.igual('lee las entradas con página (formato con negritas y con [[enlace]])', alias.map((e) => e.ruta), ['wiki/clientes/ferreteria-andes.md', 'wiki/proyectos/despacho.md']);
    p.cierto('con sus alias entre comillas o separados por coma', alias[0].alias.includes('Ferretería Andes SpA') && alias[1].alias.includes('Despacho en bici'));

    let promptA = '', llamadasB = 0;
    q.llamarIA = async (sistema, usuario) => {
      if (/^Comparas/.test(sistema)) { llamadasB++; return { resultados: [{ id: 'n0', estado: 'nuevo', seccion: 'Estado', texto: 'Aceptó la propuesta de facturación electrónica.', detalle: '' }] }; }
      promptA = usuario;
      return { novedades: [{ texto: 'Aceptaron la propuesta', cita: 'aceptaron la propuesta de facturación electrónica', fuente: 'raw/hoy.md', destino: 'wiki/clientes/ferreteria-andes-spa.md', crear: true }], contradicciones: [] };
    };
    const prop = await q.proponerIngesta((await q.prepararMaterial(q.reunirCrudo())).piezas);
    p.cierto('la IA recibe la lista de alias', promptA.includes('Ferretería Andes SpA') && promptA.includes('wiki/clientes/ferreteria-andes.md'));
    const n = prop.novedades[0];
    p.igual('«Ferretería Andes SpA» → la página que ya existe, no una nueva', [n.destino, n.crear, n.porAlias], ['wiki/clientes/ferreteria-andes.md', false, 'Ferretería Andes']);
    p.igual('y entonces se compara con esa página', llamadasB, 1);
    await q.aplicarNovedad(n);
    p.cierto('se inserta en su sección', v.notas['wiki/clientes/ferreteria-andes.md'].includes('- Prospecto\n- Aceptó la propuesta'));

    q.ajustes.permitirCrear = false;
    let fallo = '';
    try { await q.aplicarNovedad({ destino: 'wiki/otra.md', crear: true, texto: 'x', verificada: true, fuente: 'raw/hoy.md', cita: 'x' }); } catch (e) { fallo = e.message; }
    p.cierto('con «Permitir crear páginas» apagado, no se crea ninguna página', !!fallo && v.notas['wiki/otra.md'] === undefined);
  }

  // ── 15. Etapa 7b: proponer el motivo de un par que todavía no se enlaza ───────────────────
  {
    const v = vaultSimulado({ 'a.md': 'La tostadora nueva llega en octubre para el hotel.', 'b.md': 'El hotel pide más café desde octubre.' });
    const q = new Plugin(); q.app = v.app; await q.onload();
    let pedido = '';
    q.llamarIA = async (s, u) => { pedido = u; return { suficiente: true, motivo: 'El hotel necesita más café cuando llegue la tostadora', cita_origen: 'La tostadora nueva llega en octubre', cita_destino: 'El hotel pide más café desde octubre' }; };
    q.ajustes.dobleVerificacion = false;
    const res = await q.sugerir({ origen: 'a.md', destino: 'b.md', linea: 0, nuevo: true });
    p.cierto('para un par sin enlace, la IA sabe que el enlace todavía no existe', /TODAVÍA NO se enlazan/.test(pedido) && !/está en la línea/.test(pedido));
    p.cierto('y el motivo se verifica con las mismas citas literales', res.aprobable === true);
    await q.aprobar({ origen: 'a.md', destino: 'b.md', linea: 0, nuevo: true }, res);
    p.cierto('aprobar crea el enlace en la sección de conexiones', /## (Conexiones|Connections)[\s\S]*- \[\[b\]\] — El hotel necesita/.test(v.notas['a.md']));
  }

  // ── 16. Nada queda en «Leyendo…» para siempre ──────────────────────────────────────────────
  {
    const v = vaultSimulado({ 'a.md': 'x' });
    const q = new Plugin(); q.app = v.app; await q.onload();
    q.plazoIA = 50;
    global.__req = () => new Promise(() => {});
    let msg = ''; const t0 = Date.now();
    try { await q.pedirReintentando({ url: 'https://x' }, 'Gemini'); } catch (e) { msg = e.message; }
    p.cierto('una llamada que no responde se corta con un aviso', /did not answer|no respondió/.test(msg) && Date.now() - t0 < 2000);
    q.plazoIA = 5000;
    global.__req = () => ({ status: 429, headers: {}, json: { error: { details: [{ retryDelay: '45s' }] } } });
    msg = ''; const t1 = Date.now();
    try { await q.pedirReintentando({ url: 'https://x' }, 'Gemini'); } catch (e) { msg = e.message; }
    p.cierto('si la IA pide esperar 45 s, se avisa ya en vez de quedar pegado', /429/.test(msg) && Date.now() - t1 < 1000);
    global.__req = null;
  }

  // ── 17. Recortes sueltos: se proponen, se mueven sin tocarlos, lo repetido a la papelera ─────
  {
    const v = vaultSimulado({
      'Recorte.md': 'Un artículo guardado desde el teléfono.',
      'Dup.md': 'Mismo texto',
      'Choque.md': 'Versión nueva',
      'Home.md': 'Portada',
      'CLAUDE.md': 'Contrato',
      'log-2026.md': 'Registro',
      'Recien.md': 'Se está escribiendo',
      'wiki/a.md': '# A\n[[Home]]',
      'raw/articles/viejo.md': 'Mismo texto',
      'raw/articles/Choque.md': 'Versión vieja',
    });
    const q = new Plugin(); q.app = v.app; await q.onload();
    for (const r of ['Recorte.md', 'Dup.md', 'Choque.md', 'Home.md', 'CLAUDE.md', 'log-2026.md']) v.mtimes[r] = Date.now() - DIA;
    p.igual('sin carpeta de recortes no se propone nada', q.recortesSueltos().length, 0);
    q.ajustes.carpetaRecortes = 'raw/articles/';
    q.ajustes.quedanEnRaiz = 'claude.md, log*.md';
    const nombres = q.recortesSueltos().map((f) => f.name);
    p.igual('solo las sueltas, sin enlaces, fuera de la lista y quietas', nombres.join(','), 'Choque.md,Dup.md,Recorte.md');
    q.ajustes.carpetas = '/ = 0\nwiki = 1';
    p.igual('si la raíz es una capa del mapa, sus notas no son recortes', q.recortesSueltos().length, 0);
    q.ajustes.carpetas = 'wiki = 1';
    const r = await q.ordenarRecortes(q.recortesSueltos());
    p.igual('movidas y repetidas se cuentan', `${r.movidos}/${r.repetidos}/${r.fallos.length}`, '2/1/0');
    p.cierto('la nota se mueve con su contenido intacto', v.notas['raw/articles/Recorte.md'] === 'Un artículo guardado desde el teléfono.' && v.notas['Recorte.md'] === undefined);
    p.cierto('la repetida va a la papelera y el original queda', v.notas['Dup.md'] === undefined && v.notas['raw/articles/viejo.md'] === 'Mismo texto' && v.escrituras.some((e) => e[0] === 'trash' && e[1] === 'Dup.md'));
    p.cierto('mismo nombre y otro contenido: no se pisa, se numera', v.notas['raw/articles/Choque.md'] === 'Versión vieja' && v.notas['raw/articles/Choque 2.md'] === 'Versión nueva');
    p.cierto('nada se escribe ni se edita: solo se mueve', !v.escrituras.some((e) => ['process', 'append', 'create'].includes(e[0])));
    p.igual('después de ordenar no queda nada suelto', q.recortesSueltos().length, 0);
  }

  // ── 18. Desactivar y reactivar al tiro no paga dos ingestas ────────────────────────────────
  {
    const v = vaultSimulado({ 'a.md': 'x' });
    const pendientes = [], stOrig = global.window.setTimeout, ctOrig = global.window.clearTimeout;
    global.window.setTimeout = (f, ms) => { const h = { f, ms, vivo: true }; pendientes.push(h); return h; };
    global.window.clearTimeout = (h) => { if (h) h.vivo = false; };
    v.app.workspace.onLayoutReady = (cb) => cb();
    let corridas = 0;
    const vieja = new Plugin(); vieja.app = v.app; await vieja.onload(); vieja.alAbrirObsidian = async () => { corridas++; };
    vieja.unload();
    const nueva = new Plugin(); nueva.app = v.app; await nueva.onload(); nueva.alAbrirObsidian = async () => { corridas++; };
    for (const h of pendientes.filter((x) => x.ms === 8000 && x.vivo)) h.f();
    p.igual('la copia desactivada no corre la ingesta automática', corridas, 1);
    global.window.setTimeout = stOrig; global.window.clearTimeout = ctOrig; delete v.app.workspace.onLayoutReady;
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('ERROR INESPERADO\n', e.stack); process.exit(1); });
