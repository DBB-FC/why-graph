/* Recorridos e2e: una persona usando Why Graph durante días. Ver pruebas/e2e/mundo.cjs.
 *
 *   node pruebas/e2e/recorridos.cjs [ruta/main.js] [--solo nombre] [--detalle]
 *
 * Cada recorrido cuenta una historia de uso real (abrir, pulsar lo que se ve, cerrar sin terminar,
 * reiniciar, volver otro día, otro dispositivo) y termina con lo que la persona espera ver. Los
 * detectores del mundo juntan además todo lo que salió mal por el camino. Sale con código 1 si hay
 * un solo hallazgo: no se publica una versión con un recorrido roto.
 */
const { Mundo, textoDe } = require('./mundo.cjs');
const path = require('path');
const args = process.argv.slice(2);
const MAIN = args.find((a) => a.endsWith('.js')) || path.join(__dirname, '../../main.js');
const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
const DETALLE = args.includes('--detalle');
// --vault <ruta>: los recorridos genéricos sobre una COPIA EN MEMORIA de un vault real (solo se lee
// del disco; nada se escribe) con su data.json y la IA falsa. Encuentra lo que un vault de prueba no tiene.
const VAULT = args.includes('--vault') ? args[args.indexOf('--vault') + 1] : null;
const GENERICOS = ['novedades con cuota diaria', 'aprobar parte', 'material nuevo', 'respeta el tope', 'detener una búsqueda', 'cuota agotada', 'teléfono: tocar', 'aprobar lo mismo'];

// ── El vault de la persona: un LLM wiki con material crudo de varios días ──────────────────────
const parrafos = (tema, n, extra = '') => Array.from({ length: n }, (_, k) => `${tema} ${k + 1}: se acordó con el equipo avanzar en la entrega número ${k + 1} y revisar el presupuesto el jueves ${extra}.`).join('\n\n');
function vault(dias = 5, porDia = 6) {
  const v = {
    'index.md': '# Índice\n\n[[andes]] · [[tostadora]] · [[tema-clientes]]\n',
    'log.md': '# Log\n',
    'wiki/clientes/andes.md': '---\ntema: clientes\nupdated: 2026-09-01\n---\n# Ferretería Andes\n\nCliente de herramientas en Santiago. Trabaja con [[tostadora]].\n\n## Historia\n\n- Primer contacto en agosto.\n\n## Conexiones\n\n',
    'wiki/clientes/tostadora.md': '---\ntema: clientes\nupdated: 2026-09-01\n---\n# Tostadora Sur\n\nTostaduría de café en Valdivia que pide pedidos semanales.\n\n## Soporte\n\n- Sin incidentes.\n',
    'wiki/proyectos/crm.md': '---\ntema: proyectos\nupdated: 2026-09-02\n---\n# CRM\n\nEl sistema donde se siguen las ventas de los clientes. Lo usa [[andes]] y también [[tostadora]].\n',
    'wiki/temas/tema-clientes.md': '---\ntema: clientes\nhub: true\n---\n# Clientes\n\nSíntesis de [[andes]], [[tostadora]] y el [[crm]].\n',
    'wiki/temas/tema-proyectos.md': '---\ntema: proyectos\nhub: true\n---\n# Proyectos\n\nSíntesis del [[crm]].\n',
    'wiki/diario/2026-09-19.md': '---\nupdated: 2026-09-19\n---\n# 19.09\n\nReunión con [[andes]] sobre el [[crm]].\n',
    'wiki/clientes/maderas.md': '---\ntema: clientes\n---\n# Maderas del Sur\n\nCliente de [[andes]] y [[tostadora]], compra junto a [[ferreteria-sur]].\n',
    'wiki/clientes/ferreteria-sur.md': '---\ntema: clientes\n---\n# Ferretería Sur\n\nSocia de [[andes]], [[maderas]] y [[tostadora]].\n',
    'wiki/proyectos/erp.md': '---\ntema: proyectos\n---\n# ERP\n\nSe integra con [[crm]], [[web]] y [[bodega]].\n',
    'wiki/proyectos/web.md': '---\ntema: proyectos\n---\n# Sitio web\n\nPublica lo de [[crm]], [[erp]] y [[bodega]].\n',
    'wiki/proyectos/bodega.md': '---\ntema: proyectos\n---\n# Bodega\n\nInventario conectado a [[erp]] y [[web]].\n',
    'wiki/personas/ana.md': '---\ntema: equipo\n---\n# Ana\n\nAtiende a [[maderas]] y lleva la [[bodega]].\n',
    'recorte suelto de la web.md': '# Un artículo guardado desde el teléfono\n\nTexto del artículo recortado con el Web Clipper sin carpeta.\n',
  };
  for (let d = 0; d < dias; d++) for (let i = 0; i < porDia; i++) {
    const fecha = `2026-09-${String(14 + d).padStart(2, '0')}`, cliente = i % 2 ? 'tostadora' : 'andes';
    v[`raw/daily/${fecha}/sesion-${i}.md`] = `# Sesión ${i} del ${fecha}\n\n` + parrafos(`Nota de ${cliente}`, 4 + ((d + i) % 9), `(${fecha}/${i})`);
  }
  for (let i = 0; i < 4; i++) v[`raw/articles/2026-09-1${i}-articulo-${i}.md`] = `# Artículo ${i}\n\n` + parrafos('Artículo sobre CRM', 30 + i * 10, `(art ${i})`);
  return v;
}
const AJUSTES = {
  configurado: true,
  capas: 'Entrada | notas diarias\nEntidades | clientes y proyectos\nTemas | síntesis',
  carpetas: 'wiki/diario = 0\nwiki/clientes = 1\nwiki/proyectos = 1\nwiki/personas = 1\nwiki/temas = 2',
  propiedadTema: 'tema', temas: 'clientes = Clientes = #F7931A\nproyectos = Proyectos = #34D17A',
  fuentes: 'demanda', carpetasFuentes: 'raw/articles\nraw/daily/*',
  proveedorIA: 'gemini', modeloIA: 'modelo-e2e', dobleVerificacion: true,
  carpetaCrudo: 'raw', carpetaWiki: 'wiki', carpetaAuditoria: 'raw/daily', seccionMotivos: 'Conexiones',
  autoIngesta: false, topeDiario: 30, archivoAlias: '', carpetaRecortes: 'raw/articles', quedanEnRaiz: 'index.md, log.md', animacion: false,
};
function leerVaultReal(raiz) {
  const fs = require('fs'), notas = {};
  (function rec(d) { for (const e of fs.readdirSync(path.join(raiz, d), { withFileTypes: true })) { if (e.name.startsWith('.')) continue; const r = d ? d + '/' + e.name : e.name; if (e.isDirectory()) rec(r); else notas[r] = r.endsWith('.md') ? fs.readFileSync(path.join(raiz, r), 'utf8') : ''; } })('');
  const datos = JSON.parse(fs.readFileSync(path.join(raiz, '.obsidian/plugins/mapa-neuronal/data.json'), 'utf8'));
  const mtimes = {}; for (const r of Object.keys(notas)) mtimes[r] = fs.statSync(path.join(raiz, r)).mtimeMs;
  return { notas, datos, mtimes };
}
// El reloj de verdad, tomado antes de que un mundo lo reemplace por el suyo (global.Date).
const AHORA_REAL = Date.now();
function mundo(extra = {}) {
  if (VAULT) {
    const real = mundo.real || (mundo.real = leerVaultReal(VAULT));
    // Mañana a las 09:00 de Chile: todo el vault real queda en el pasado, y un «día» de recorrido
    // (tres aperturas cada 20 min) no cruza la medianoche. Antes arrancaba en la hora real y en el
    // reloj que dejó el recorrido anterior: de noche «respeta el tope» fallaba sin que el plugin
    // tuviera la culpa.
    const inicio = new Date(AHORA_REAL - 3 * 3600e3 + 864e5).toISOString().slice(0, 10) + 'T09:00:00-03:00';
    const M = new Mundo({ main: MAIN, inicio });
    M.agregarNotas(real.notas); Object.assign(M.mtimes, real.mtimes);
    // La búsqueda automática la enciende cada recorrido que la prueba; si no, correría sola al abrir.
    M.datos = Object.assign({}, real.datos, { proveedorIA: 'gemini', modeloIA: 'modelo-e2e', animacion: false, ultimaIngesta: '', autoIngesta: false });
    M.dispositivos.mac = { ls: { 'mapa-neuronal-key-gemini': 'llave-e2e' }, telefono: false };
    return M;
  }
  const M = new Mundo({ main: MAIN, inicio: '2026-09-20T09:00:00-03:00' });
  M.agregarNotas(vault(extra.dias, extra.porDia));
  M.datos = Object.assign({}, AJUSTES, extra.ajustes || {});
  M.dispositivos.mac = { ls: { 'mapa-neuronal-key-gemini': 'llave-e2e' }, telefono: false };
  return M;
}

// ── Detectores que se aplican al final de cada recorrido ──────────────────────────────────────
function revisarEscrituras(M, inicial) {
  for (const r of M.registro.filter((x) => x.accion === 'escribe' || x.accion === 'mueve')) {
    const ruta = r.accion === 'mueve' ? r.a : r.ruta;
    const permitido = ruta.startsWith('wiki/') || /^raw\/daily\/[^/]+\/mapa-neuronal-motivos\.md$/.test(ruta) || (r.accion === 'mueve' && ruta.startsWith('raw/articles/'));
    if (!permitido) M.hallazgo('escribió fuera de lugar', `${r.accion} ${ruta}`);
  }
  // El crudo solo lo cambia la persona: se compara con su última versión, no con la inicial.
  for (const [ruta, t] of Object.entries(inicial)) if (ruta.startsWith('raw/') && M.notas[ruta] !== undefined && M.notas[ruta] !== (M.dePersona?.[ruta] ?? t)) M.hallazgo('modificó el material crudo', ruta);
  for (const [ruta, t] of Object.entries(M.notas)) if (ruta.startsWith('wiki/')) {
    const lineas = t.split('\n').filter((l) => /^- \S/.test(l)), vistas = new Set();
    for (const l of lineas) { if (vistas.has(l)) M.hallazgo('línea duplicada en el wiki', `${ruta}: ${l.slice(0, 90)}`); vistas.add(l); }
  }
  const ing = M.internos['.obsidian/plugins/mapa-neuronal/ingesta.json'];
  if (ing) { try { JSON.parse(ing); } catch { M.hallazgo('ingesta.json ilegible', ing.slice(0, 80)); } if (ing.length > 2e6) M.hallazgo('ingesta.json crece sin tope', `${ing.length} bytes`); }
}
// Abre el panel desde el chip y lee la lista «Ver archivos» (lo que la persona ve como pendiente).
async function archivosPorLeer(s) {
  const chip = s.chip(); const n = +(chip.match(/(\d+) por leer/)?.[1] || 0);
  if (!n) return { n: 0, lista: [], chip };
  await s.pulsa(/por leer/);
  await s.pulsa(/Ver archivos/, { opcional: true });
  const lista = [...s.vista.panel.recorrer()].filter((x) => s.mundo.visible(x) && x.clases.has('mn-tenue') && /^raw\//.test(x.texto)).map((x) => x.texto);
  await s.pulsa('Cerrar', { opcional: true });
  return { n, lista, chip };
}
function revisarPorLeer(M, porLeer, etapa) {
  const yaLeidos = porLeer.lista.filter((r) => M.leidoEntero(r));
  if (yaLeidos.length) M.hallazgo('vuelve a pedir lo ya leído', `${etapa}: ${yaLeidos.length} de ${porLeer.n} archivos «por leer» ya los leyó la IA entera (y se pagaron). Ej.: ${yaLeidos[0]}`);
}

// ── Los recorridos ────────────────────────────────────────────────────────────────────────────
const RECORRIDOS = {
  // El caso que la auditoría de la 1.33.0 no vio: cuota gratis, varios días, cerrar con ✕.
  async 'novedades con cuota diaria, varios días, sin pulsar Terminar'(M) {
    M.ia.cuotaDiaria = 6;
    const cuentas = [];
    for (let dia = 1; dia <= 4; dia++) {
      const s = await M.abrir('mac'); await s.abrirMapa();
      const antes = await archivosPorLeer(s); revisarPorLeer(M, antes, `día ${dia} al abrir`); cuentas.push(antes.n);
      if (!antes.n) { await M.cerrar(); break; }
      await s.pulsa(/por leer|nuevas/); M.busqueda = 'b' + dia;
      if (!(await s.pulsa('Buscar novedades', { opcional: true }))) { await s.pulsa('Terminar', { opcional: true }); }
      await s.pulsa('Cerrar', { opcional: true });           // cierra con ✕, sin revisar ni Terminar
      await M.cerrar(); M.pasarDias(1);
    }
    const s = await M.abrir('mac'); await s.abrirMapa(); const fin = await archivosPorLeer(s); cuentas.push(fin.n); await M.cerrar();
    if (cuentas.length > 2 && cuentas.every((c, i) => i === 0 || c >= cuentas[i - 1]) && cuentas[0] > 0) M.hallazgo('el contador por leer nunca baja', `días: ${cuentas.join(' → ')}`);
    return `por leer: ${cuentas.join(' → ')}`;
  },
  async 'aprobar parte, reiniciar sin terminar y retomar'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa();
    await s.pulsa(/por leer/); M.busqueda = 'b1'; await s.pulsa('Buscar novedades');
    const aprobables = s.pulsables().filter((n) => n.attrs['aria-label'] === 'Aprobar');
    if (!aprobables.length) { M.hallazgo('no hay nada que aprobar', s.textoVisible().slice(0, 200)); await M.cerrar(); return; }
    M.clicar(aprobables[0]); await s.calma();
    const wikiTras1 = JSON.stringify(Object.entries(M.notas).filter(([r]) => r.startsWith('wiki/')));
    await M.cerrar();                                           // Obsidian se cierra con la revisión a medias
    s = await M.abrir('mac'); await s.abrirMapa();
    const chip = s.chip();
    if (!/nuevas|revisar/.test(chip)) M.hallazgo('la revisión se perdió al reiniciar', `el chip dice «${chip}»; lo pagado ayer ya no se puede revisar`);
    await s.pulsa(/nuevas|por leer/);
    if (s.ve('Buscar novedades') && !s.ve('Terminar')) M.hallazgo('la revisión se perdió al reiniciar', 'el panel ofrece buscar (y pagar) otra vez en vez de retomar');
    await s.pulsa(/Aprobar las \d+ seguras/, { opcional: true }); await s.pulsa('Terminar', { opcional: true });
    await M.cerrar();
    s = await M.abrir('mac'); await s.abrirMapa(); const despues = await archivosPorLeer(s); revisarPorLeer(M, despues, 'tras terminar'); await M.cerrar();
    return `wiki cambió tras el primer aprobar: ${wikiTras1.length > 0}`;
  },
  async 'material nuevo que llega mientras se revisa'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer/); M.busqueda = 'b1'; await s.pulsa('Buscar novedades');
    M.pasarMinutos(30); M.escribir('raw/daily/2026-09-20/llego-despues.md', '# Llegó después\n\n' + parrafos('Nota urgente de andes', 3));
    await s.pulsa('Terminar'); await M.cerrar(); M.pasarDias(1);
    s = await M.abrir('mac'); await s.abrirMapa(); const p = await archivosPorLeer(s); await M.cerrar();
    if (!p.lista.includes('raw/daily/2026-09-20/llego-despues.md') && !M.leidoEntero('raw/daily/2026-09-20/llego-despues.md')) M.hallazgo('material nuevo perdido', 'lo que llegó durante la revisión no quedó por leer');
    return `por leer al día siguiente: ${p.n}`;
  },
  async 'dos dispositivos con el mismo vault'(M) {
    M.datos.autoIngesta = true;
    M.dispositivos.iphone = { ls: { 'mapa-neuronal-key-gemini': 'llave-e2e' }, telefono: true };
    let s = await M.abrir('mac'); M.busqueda = 'mac'; await s.calma(); await M.cerrar();
    M.pasarMinutos(10); s = await M.abrir('iphone', { telefono: true }); M.busqueda = 'iphone'; await s.calma(); await s.abrirMapa();
    const t = s.textoVisible(); await M.cerrar();
    const porDisp = (d) => M.ia.llamadas.filter((x) => x.dispositivo === d && x.tipo === 'material' && x.ok).length;
    return `llamadas de material: mac ${porDisp('mac')}, iphone ${porDisp('iphone')}`;
  },
  async 'al abrir Obsidian varias veces el mismo día, respeta el tope y avanza cada día'(M) {
    Object.assign(M.datos, { autoIngesta: true, topeDiario: 2 });
    const cuentas = [], porDia = [];
    for (let dia = 1; dia <= 3; dia++) {
      const antes = M.ia.llamadas.length;
      for (let i = 0; i < 3; i++) {
        const s = await M.abrir('mac'); M.busqueda = `auto${dia}-${i}`; await s.calma(); await s.abrirMapa();
        if (i === 0) cuentas.push(M.sinLeer().length);
        await s.pulsa(/nuevas/, { opcional: true }); await s.pulsa('Terminar', { opcional: true });   // revisa y termina
        await M.cerrar(); M.pasarMinutos(20);
      }
      const hoy = M.ia.llamadas.length - antes; porDia.push(hoy);   // las de este día del recorrido
      if (hoy > 2) M.hallazgo('pasó el tope diario', `${hoy} llamadas con tope 2 el ${M.hoy()}`);
      M.pasarDias(1);
    }
    if (porDia.every((x) => x === 0) && cuentas[0] > 0) M.hallazgo('la búsqueda automática nunca arranca', `con ${cuentas[0]} archivos por leer y tope 2, 0 llamadas en 3 días`);
    // Si queda material sin leer, un día sin llamadas es un día perdido.
    porDia.forEach((x, i) => { if (!x && (cuentas[i] ?? M.sinLeer().length) > 0) M.hallazgo('un día sin avanzar', `día ${i + 1}: 0 llamadas con ${cuentas[i]} archivos sin leer`); });
    return `llamadas por día: ${porDia.join(', ')} (tope 2) · sin leer (según lo recibido por la IA): ${cuentas.join(' → ')} → ${M.sinLeer().length}`;
  },
  async 'un registro del día que crece: solo se envía lo agregado'(M) {
    M.ia.cuotaDiaria = Infinity;
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer/); M.busqueda = 'b1'; await s.pulsa('Buscar novedades'); await s.pulsa('Terminar'); await M.cerrar();
    const r = 'raw/daily/2026-09-18/sesion-0.md'; M.pasarMinutos(60); M.escribir(r, M.notas[r] + '\n\n' + parrafos('Agregado de la tarde para andes', 2));
    const antes = M.ia.llamadas.length;
    s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer/); M.busqueda = 'b2'; await s.pulsa('Buscar novedades'); await s.pulsa('Terminar'); await M.cerrar();
    const nuevas = M.ia.llamadas.slice(antes).filter((x) => x.tipo === 'material');
    return `segunda búsqueda: ${nuevas.length} llamada(s), ${nuevas.reduce((a, x) => a + x.bytes, 0)} bytes`;
  },
  async 'sugerir un motivo con IA, aprobarlo y verlo después de reiniciar'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa();
    await s.toca('crm');
    if (!(await s.pulsa('Sugerir motivo ✦', { opcional: true }))) { M.hallazgo('botón que no está', 'Sugerir motivo en la nota crm'); await M.cerrar(); return; }
    await s.pulsa('Aprobar y escribir en la nota');
    // Se escribe en la nota de ORIGEN del enlace (puede no ser la tocada), una sola vez, en su sección.
    const conMotivo = Object.keys(M.notas).filter((r) => r.startsWith('wiki/') && /^- \[\[[^\]]+\]\] — las dos notas describen/m.test(M.notas[r]));
    const escrito = conMotivo.length === 1;
    if (!escrito) M.hallazgo('el motivo aprobado no se escribió', `notas con el motivo: ${conMotivo.join(', ') || 'ninguna'}`);
    const log = Object.keys(M.notas).find((r) => /mapa-neuronal-motivos\.md$/.test(r));
    if (!log || !/Motivo aprobado/.test(M.notas[log])) M.hallazgo('aprobó sin dejar registro', 'no hay entrada de auditoría del motivo');
    await M.cerrar(); s = await M.abrir('mac'); await s.abrirMapa(); await s.toca('crm');
    if (!s.ve('las dos notas describen el mismo trabajo')) M.hallazgo('el motivo no aparece tras reiniciar', s.textoVisible().slice(0, 200));
    const ofrece = s.pulsables().filter((n) => textoDe(n) === 'Sugerir motivo ✦').length;
    await M.cerrar();
    return `motivo escrito: ${escrito} · botones «Sugerir» restantes: ${ofrece}`;
  },
  async 'proponer motivo cuando la IA copia la misma cita en las dos notas'(M) {
    // Una vez: el plugin le dice qué cita falló y la segunda respuesta sirve.
    M.ia.citaRepetida = 1;
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.toca('crm');
    await s.pulsa('Sugerir motivo ✦');
    if (!s.ve('Aprobar y escribir en la nota')) M.hallazgo('un motivo verificable queda bloqueado', s.textoVisible().slice(0, 240));
    const llamadas1 = M.ia.llamadas.filter((x) => x.tipo === 'motivo').length;
    await M.cerrar();
    // Siempre: no se escribe nada y se dice por qué, no el mensaje genérico.
    M.ia.citaRepetida = Infinity;
    s = await M.abrir('mac'); await s.abrirMapa(); await s.toca('crm'); await s.pulsa('Sugerir motivo ✦');
    if (s.ve('Aprobar y escribir en la nota')) M.hallazgo('aprobó una cita que no está en su nota', s.textoVisible().slice(0, 240));
    if (!s.ve('la misma frase para las dos notas')) M.hallazgo('no explica por qué se bloqueó', s.textoVisible().slice(0, 240));
    const llamadas2 = M.ia.llamadas.filter((x) => x.tipo === 'motivo').length - llamadas1;
    if (llamadas2 > 2) M.hallazgo('insiste de más con la IA', `${llamadas2} llamadas por un motivo`);
    await M.cerrar(); M.ia.citaRepetida = 0;
    return `llamadas: ${llamadas1} con reintento que sirve, ${llamadas2} cuando no sirve`;
  },
  async 'resumir una nota con IA y verlo después de reiniciar'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.toca('tostadora');
    if (!(await s.pulsa('Resumir con IA', { opcional: true }))) { M.hallazgo('botón que no está', 'Resumir con IA'); await M.cerrar(); return; }
    await s.pulsa('Aprobar y guardar en la nota'); await M.cerrar();
    s = await M.abrir('mac'); await s.abrirMapa(); await s.toca('tostadora');
    if (!s.ve('Nota sobre')) M.hallazgo('el resumen no aparece tras reiniciar', s.textoVisible().slice(0, 200));
    await M.cerrar();
  },
  async 'conexiones que faltan: descartar un par y que no vuelva'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.menu('Conexiones que faltan');
    const antes = s.textoVisible();
    if (!(await s.pulsa('Descartar', { opcional: true }))) { await M.cerrar(); return 'no había pares que revisar'; }
    await M.cerrar(); s = await M.abrir('mac'); await s.abrirMapa(); await s.menu('Conexiones que faltan');
    const despues = s.textoVisible(); await M.cerrar();
    return `pares visibles antes/después: ${(antes.match(/↔/g) || []).length} → ${(despues.match(/↔/g) || []).length}`;
  },
  async 'recortes sueltos: ordenar y dejar'(M) {
    M.escribir('otro recorte.md', '# Otro\n\nTexto recortado que también quedó en la raíz del vault.\n'); M.pasarMinutos(10);
    let s = await M.abrir('mac'); await s.abrirMapa();
    if (!/por ordenar|por leer/.test(s.chip())) M.hallazgo('recortes sin aviso', `chip: «${s.chip()}»`);
    await s.pulsa(/por ordenar|por leer/); await s.pulsa(/Ver notas/, { opcional: true });
    await s.pulsa('Dejar aquí', { opcional: true }); await s.pulsa(/Ordenar \d/, { opcional: true }); await M.cerrar();
    s = await M.abrir('mac'); await s.abrirMapa(); const chip = s.chip(); await M.cerrar();
    const enRaiz = Object.keys(M.notas).filter((r) => !r.includes('/') && !['index.md', 'log.md'].includes(r));
    if (/por ordenar/.test(chip)) M.hallazgo('recortes que vuelven', `tras ordenar y dejar, el chip sigue: «${chip}» (en la raíz: ${enRaiz.join(', ')})`);
    return `en la raíz: ${enRaiz.join(', ') || '—'}`;
  },
  async 'buscar: una nota nueva aparece sin reiniciar, y lo de fuera del mapa se abre'(M) {
    const s = await M.abrir('mac'); await s.abrirMapa();
    M.escribir('wiki/clientes/nueva-cliente.md', '---\ntema: clientes\n---\n# Nueva Cliente\n\nRecién llegada, trabaja con [[andes]].\n'); await s.calma();
    await s.escribeEnBuscador('nueva cliente');
    if (!/nueva-cliente/.test(s.textoVisible())) M.hallazgo('el buscador no ve lo nuevo', 'una nota creada con el mapa abierto no aparece al buscarla');
    await s.escribeEnBuscador('articulo 2');
    const fila = s.pulsables().find((n) => /articulo-2/.test(textoDe(n)));
    if (!fila) M.hallazgo('el buscador no ve el material crudo', 'raw/articles no aparece');
    else { M.clicar(fila); await s.calma(); if (!/articulo-2/.test(s.notaAbierta || '')) M.hallazgo('el resultado no abre la nota', textoDe(fila)); }
    await M.cerrar();
  },
  async 'cambiar un ajuste y que se mantenga'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa();
    await s.ajuste('Notas visibles por capa', 12); await s.ajuste(/tope|llamadas automáticas/i, 7);
    await M.cerrar(); s = await M.abrir('mac');
    const a = s.plugin.ajustes; await M.cerrar();
    if (Number(a.maxPorCapa) !== 12) M.hallazgo('ajuste que no se guarda', `maxPorCapa = ${a.maxPorCapa}`);
    if (Number(a.topeDiario) !== 7) M.hallazgo('ajuste que no se guarda', `topeDiario = ${a.topeDiario}`);
    return `maxPorCapa ${a.maxPorCapa} · topeDiario ${a.topeDiario}`;
  },
  async 'el mapa se actualiza en vivo al enlazar dos notas'(M) {
    const s = await M.abrir('mac'); await s.abrirMapa();
    M.escribir('wiki/clientes/tostadora.md', M.notas['wiki/clientes/tostadora.md'] + '\nAhora también usa el [[crm]] para pedidos.\n'); await s.calma();
    await s.toca('tostadora');
    if (!/\bcrm\b/.test(s.textoVisible())) M.hallazgo('el mapa no se actualiza', 'el enlace nuevo no aparece en el panel sin reiniciar');
    await M.cerrar();
  },
  async 'cuota agotada: la persona ve por qué y se entera antes del próximo intento'(M) {
    M.ia.cuotaDiaria = 0;
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer/); M.busqueda = 'b1'; await s.pulsa('Buscar novedades');
    if (!/cuota diaria|daily quota/i.test(s.textoVisible())) M.hallazgo('error sin explicar', `tras fallar por cuota, el panel dice: ${s.textoVisible().slice(0, 220)}`);
    const llamadas = M.ia.llamadas.length;
    // Hasta 3 tandas salen en paralelo antes de que vuelva el primer 429; más que eso es insistir.
    if (llamadas > 3) M.hallazgo('insiste con la cuota agotada', `${llamadas} llamadas con la cuota en 0`);
    await s.pulsa('Cerrar', { opcional: true }); await M.cerrar(); M.pasarMinutos(30);
    s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer|nuevas/);
    if (s.ve('Buscar novedades') && !/cuota/i.test(s.textoVisible())) M.hallazgo('no avisa de la cuota antes de volver a intentar', 'el panel ofrece buscar sin decir que hoy ya se agotó la cuota');
    await M.cerrar();
    return `llamadas: ${llamadas}`;
  },
  async 'detener una búsqueda a la mitad'(M) {
    M.ia.cuotaDiaria = Infinity;
    let s = await M.abrir('mac'); await s.abrirMapa(); const antes = await archivosPorLeer(s);
    await s.pulsa(/por leer/); M.busqueda = 'b1';
    // Pulsa «Buscar» y, apenas aparece «Detener», lo pulsa.
    const b = s.pulsables().find((n) => textoDe(n) === 'Buscar novedades');
    if (!b) { M.hallazgo('botón que no está', 'Buscar novedades'); await M.cerrar(); return; }
    M.clicar(b);
    // Espera a que se lea al menos una tanda y recién ahí detiene: lo leído tiene que quedar.
    for (let i = 0; i < 400 && !/Leídas [1-9]\d* de/.test(s.textoVisible()) && s.ve('Detener'); i++) await s.esperar(1);
    await s.pulsa('Detener', { opcional: true }); await s.calma(); await s.pulsa('Cerrar', { opcional: true }); await M.cerrar();
    s = await M.abrir('mac'); await s.abrirMapa(); const despues = await archivosPorLeer(s); revisarPorLeer(M, despues, 'tras detener'); await M.cerrar();
    return `por leer: ${antes.n} → ${despues.n}`;
  },
  async 'la IA se cae un rato y vuelve'(M) {
    M.ia.caida = 2;
    const s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer/); M.busqueda = 'b1'; await s.pulsa('Buscar novedades');
    if (/no se pudo leer nada/i.test(s.textoVisible())) M.hallazgo('se rinde ante una caída pasajera', '503 dos veces y ya no lee nada');
    await M.cerrar();
  },
  async 'elegir el modelo de una lista, sin escribir su nombre'(M) {
    M.dispositivos.mac = { ls: {}, telefono: false };
    let s = await M.abrir('mac');
    await s.ajuste('Proveedor', 'openrouter');
    await s.verAjustes();
    let lista = s.fila('Modelo')?.campos.find((c) => c.tipo === 'lista');
    if (!lista) { M.hallazgo('hay que escribir el modelo a mano', `OpenRouter: ${s.fila('Modelo')?.desc || 'sin fila Modelo'}`); await M.cerrar(); return; }
    const etiquetas = Object.values(lista.opciones);
    // Solo lo que sirve: con esquema JSON, que responda texto, en el momento (no «:batch») y con precio.
    for (const malo of ['viejo/sin-esquema', ':batch', 'openrouter/', 'flash-image'])
      if (Object.keys(lista.opciones).some((k) => k.includes(malo))) M.hallazgo('la lista ofrece modelos que no sirven', malo);
    const estrella = Object.keys(lista.opciones).find((k) => lista.opciones[k].startsWith('★'));
    // Lo primero que se ve después de la estrella no puede ser un gratis: se traba al día.
    const modelos = Object.keys(lista.opciones).filter((k) => k && k !== '__otro__' && k !== estrella);
    if (/:free$/.test(modelos[0])) M.hallazgo('la lista empieza por modelos gratis con límite diario', modelos.slice(0, 3).join(', '));
    if (!estrella) M.hallazgo('no dice cuál conviene', etiquetas.slice(0, 3).join(' | '));
    if (!etiquetas.some((e) => /US\$[\d,.]+ por millón/.test(e))) M.hallazgo('la lista no muestra el precio', etiquetas.slice(0, 3).join(' | '));
    const precios = Object.keys(lista.opciones).map((k) => M.ia.modelos.openrouter.find((m) => m.id === k)?.precio).filter((x) => x > 0);
    // Elige la estrella, pega la llave y prueba.
    await lista.alCambiar(estrella);
    await s.ajuste('Llave de la API', 'llave-e2e');
    await s.verAjustes(); await s.botonAjuste('Probar la conexión', 'Probar');
    if (!M.avisos.some((a) => /Funciona/.test(a.texto))) M.hallazgo('la prueba de conexión no funciona con el modelo elegido', M.avisos.slice(-1)[0]?.texto || 'sin aviso');
    await M.cerrar();
    // Al volver, el modelo sigue elegido y la lista no se pidió de más.
    s = await M.abrir('mac'); await s.verAjustes();
    lista = s.fila('Modelo')?.campos.find((c) => c.tipo === 'lista');
    if (lista?.valor !== estrella || M.datos.modeloIA !== estrella) M.hallazgo('el modelo elegido no se mantiene', `${lista?.valor} / ${M.datos.modeloIA}`);
    // Un modelo que no está en la lista: «Otro» deja escribirlo.
    await lista.alCambiar('__otro__'); await s.verAjustes();
    const texto = s.fila('Modelo')?.campos.find((c) => c.tipo === 'texto');
    if (!texto) M.hallazgo('no se puede escribir un modelo que no está en la lista', s.fila('Modelo')?.desc || '');
    else { await texto.alCambiar('proveedor/modelo-nuevo'); if (M.datos.modeloIA !== 'proveedor/modelo-nuevo') M.hallazgo('el modelo escrito no se guardó', M.datos.modeloIA); }
    // Gemini sin llave: no se pide nada; con llave, aparece la lista.
    await s.ajuste('Proveedor', 'gemini'); await s.verAjustes();
    const sinLlave = M.ia.listas.filter((x) => x.prov === 'gemini').length;
    if (sinLlave) M.hallazgo('pidió la lista sin llave', `${sinLlave} pedidos a Gemini`);
    await s.ajuste('Llave de la API', 'llave-gemini'); await s.verAjustes();
    const g = s.fila('Modelo')?.campos.find((c) => c.tipo === 'lista');
    if (!g) M.hallazgo('hay que escribir el modelo a mano', `Gemini con llave: ${s.fila('Modelo')?.desc}`);
    else if (Object.keys(g.opciones).some((k) => /embedding|image/.test(k))) M.hallazgo('la lista ofrece modelos que no sirven', Object.keys(g.opciones).join(', '));
    // La lista no carga (sin internet): se puede escribir igual, y «Ver la lista» vuelve a intentar.
    await s.ajuste('Proveedor', 'openai'); M.ia.listasCaidas = 5;
    await s.ajuste('Llave de la API', 'llave-openai'); await s.verAjustes();
    if (!s.fila('Modelo')?.campos.some((c) => c.tipo === 'texto')) M.hallazgo('sin lista no queda cómo elegir modelo', s.fila('Modelo')?.desc || '');
    M.ia.listasCaidas = 0; await s.botonAjuste('Modelo', 'Ver la lista'); await s.verAjustes();
    if (!s.fila('Modelo')?.campos.some((c) => c.tipo === 'lista')) M.hallazgo('«Ver la lista» no vuelve a intentar', s.fila('Modelo')?.desc || '');
    await M.cerrar();
    const porSesion = {}; for (const x of M.ia.listas) porSesion[x.sesion + x.prov] = (porSesion[x.sesion + x.prov] || 0) + 1;
    const max = Math.max(0, ...Object.values(porSesion));
    if (max > 7) M.hallazgo('pide la lista de modelos de más', `${max} pedidos del mismo proveedor en una sesión`);
    return `elegido: ${estrella} · opciones OpenRouter: ${etiquetas.length} · pedidos de lista: ${M.ia.listas.length} · más barato ofrecido: US$${Math.min(...precios)}`;
  },
  async 'el teléfono sin llave de IA'(M) {
    M.dispositivos.iphone = { ls: {}, telefono: true };
    const s = await M.abrir('iphone', { telefono: true }); await s.abrirMapa();
    const chip = s.chip();
    if (/por leer/.test(chip)) { await s.pulsa(/por leer/); if (s.ve('Buscar novedades')) { M.busqueda = 'tel'; await s.pulsa('Buscar novedades'); } }
    await M.cerrar();
    if (M.ia.llamadas.length) M.hallazgo('llamó a la IA sin llave', `${M.ia.llamadas.length} llamadas`);
    return `chip en el teléfono: «${chip || '—'}»`;
  },
  async 'teléfono: tocar una nota la deja a la vista con su panel'(M) {
    M.dispositivos.iphone = { ls: {}, telefono: true };
    const s = await M.abrir('iphone', { telefono: true }); await s.abrirMapa();
    const v = s.vista, n = v.N.filter((x) => !x.oculto && x.capa === 1).sort((a, b) => b.y - a.y)[0];
    await s.toca(n.titulo);
    const y = n.y * v.vista.k + v.vista.y, panel = v.panel.getBoundingClientRect();
    if (!v.panel.hasClass('abierto')) M.hallazgo('tocar no abre el panel', n.titulo);
    else if (y > panel.top) M.hallazgo('la nota tocada queda bajo el panel', `${n.titulo}: y=${Math.round(y)} y el panel empieza en ${Math.round(panel.top)}`);
    await M.cerrar();
  },
  async 'aprobar lo mismo otra vez no duplica'(M) {
    let s = await M.abrir('mac'); await s.abrirMapa(); await s.pulsa(/por leer/); M.busqueda = 'b1'; await s.pulsa('Buscar novedades');
    await s.pulsa(/Aprobar las \d+ seguras/, { opcional: true }); await s.pulsa('Terminar', { opcional: true }); await M.cerrar();
    // El mismo material vuelve a aparecer (lo copian a otro archivo): lo aprobado no se escribe dos veces.
    M.pasarDias(1);
    const r = Object.keys(M.notas).filter((x) => x.startsWith('raw/daily/') && x.endsWith('.md') && M.notas[x].length > 400)[0];
    if (r) M.escribir(`raw/daily/${M.hoy()}/copia-de-${r.split('/').pop()}`, M.notas[r]);
    // Si la copia no trae nada nuevo (sus párrafos ya se leyeron), no hay nada que buscar: eso
    // también es no duplicar. El detector de líneas duplicadas del final hace el resto.
    s = await M.abrir('mac'); await s.abrirMapa();
    if (await s.pulsa(/por leer/, { opcional: true })) { M.busqueda = 'b2'; await s.pulsa('Buscar novedades', { opcional: true }); await s.pulsa(/Aprobar las \d+ seguras/, { opcional: true }); await s.pulsa('Terminar', { opcional: true }); }
    await M.cerrar();
  },
  async 'la interfaz en inglés no muestra textos en español'(M) {
    const vistos = new Set();
    const juntar = (s) => { for (const n of s.pulsables()) if (n.tag === 'button' || n.tag === 'summary') vistos.add(textoDe(n)); const c = s.chip(); if (c) vistos.add(c); for (const n of s.vista.contentEl.querySelectorAll('.mn-ojo, .mn-cab, .mn-nov-titulo, .mn-resumen, .mn-grupo2-fila, .mn-ayuda')) if (M.visible(n)) vistos.add(n.texto); };
    M.idioma = 'en'; const e = await M.abrir('mac');
    await e.abrirMapa(); juntar(e); await e.toca('crm'); juntar(e);
    await e.pulsa(/to read|new|por leer/, { opcional: true }); juntar(e); await e.pulsa(/Find what|Buscar/, { opcional: true }); juntar(e);
    await e.menu(/Missing connections|Conexiones/); juntar(e);
    for (const a of M.avisos) vistos.add(a.texto);
    await M.cerrar(); M.idioma = 'es';
    const espanol = /\b(por leer|nuevas|Buscar|Terminar|Aprobar|Descartar|Sugerir|motivo|novedades|salto|conexiones|notas|archivos|enlaces|Cerrar|Abrir|Camino|Resumir|Detener|herramientas|Revisar|seguras|Ver )\b/;
    for (const t of vistos) if (espanol.test(t)) M.hallazgo('texto en español con la interfaz en inglés', t.slice(0, 120));
    return `${vistos.size} textos de interfaz revisados`;
  },
};

module.exports = { mundo, vault, AJUSTES, RECORRIDOS, archivosPorLeer, revisarPorLeer, revisarEscrituras };
if (require.main === module) (async () => {
  const resultados = [];
  for (const [nombre, fn] of Object.entries(RECORRIDOS)) {
    if (SOLO && !nombre.includes(SOLO)) continue;
    if (VAULT && !GENERICOS.some((g) => nombre.includes(g))) continue;
    const M = mundo(); const inicial = { ...M.notas };
    let nota = '';
    try { nota = (await fn(M)) || ''; } catch (e) { M.error('recorrido', e); }
    try { await M.cerrar(); } catch (e) { M.error('cerrar', e); }
    revisarEscrituras(M, inicial);
    resultados.push({ nombre, nota, hallazgos: M.hallazgos, llamadas: M.ia.llamadas.length });
    const ok = !M.hallazgos.length;
    console.log(`${ok ? '✓' : '✕'} ${nombre}${nota ? ' — ' + nota : ''}`);
    // Agrupados por tipo: cuántos y hasta tres ejemplos (un fallo que se repite por archivo no tapa a los demás).
    const porTipo = new Map(); for (const h of M.hallazgos) (porTipo.get(h.tipo) || porTipo.set(h.tipo, []).get(h.tipo)).push(h);
    for (const [tipo, hs] of porTipo) { console.log(`     · [${tipo}] ×${hs.length}`); for (const h of hs.slice(0, DETALLE ? 20 : 3)) console.log(`         ${h.detalle}`); }
    if (DETALLE && M.errores.length) console.log(M.errores.slice(0, 3).join('\n'));
  }
  const malos = resultados.filter((r) => r.hallazgos.length);
  console.log(`\nrecorridos: ${resultados.length - malos.length} bien${malos.length ? `, ${malos.length} con hallazgos` : ''}`);
  process.exit(malos.length ? 1 : 0);
})();
