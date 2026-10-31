/* F3 — «Preguntar al mapa»: el vecindario a dos saltos como líneas, la IA que cita y lo que no se envía.
 *   node pruebas/preguntar.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('preguntar');
const { Plugin, interno } = cargarPlugin(process.argv[2]);
const { construir, AJUSTES_BASE, subgrafoDe, PreguntarMapa } = interno;
// DOM mínimo que guarda el texto: para leer lo que el modal le dice a la persona.
class Nodo {
  constructor() { this.hijos = []; this.texto = ''; this.value = ''; this.clases = new Set(); }
  _n(o) { const n = new Nodo(); this.hijos.push(n); if (typeof o === 'string') n.clases.add(o); else if (o) { if (o.text !== undefined) n.texto = String(o.text); if (o.cls) String(o.cls).split(' ').forEach((c) => n.clases.add(c)); } return n; }
  createDiv(o) { return this._n(o); } createEl(_t, o) { return this._n(o); } createSpan(o) { return this._n(o); }
  appendText(t) { this._n({ text: t }); } empty() { this.hijos = []; this.texto = ''; } addClass(c) { this.clases.add(c); } focus() {}
  todo() { return [this.texto, ...this.hijos.map((h) => h.todo())].join(' ').replace(/\s+/g, ' '); }
}
const abrirModal = (q, D, id) => {
  const vista = { plugin: q, D, base: Object.fromEntries(D.nodos.map((n) => [n.id, n])), abrirNota() {} };
  const m = new PreguntarMapa(q.app, vista, id); m.contentEl = new Nodo(); m.onOpen(); return m.contentEl.todo();
};

if (!subgrafoDe) { console.log('preguntar: esta versión no tiene «Preguntar al mapa»'); p.cierto('existe subgrafoDe', false); process.exit(p.cerrar() ? 1 : 0); }

const AJ = { ...AJUSTES_BASE, capas: 'Notas | todas', carpetas: '', configurado: true };
// andes → crm → erp → bodega (3 saltos desde andes); tostadora → andes (entrante); suelta sin enlaces.
const NOTAS = {
  'andes.md': '# Ferretería Andes\n\nSECRETO-ANDES: texto que nunca debe salir.\n\n## Conexiones\n\n- [[crm]] — **usa** · sigue sus ventas en el CRM\n',
  'tostadora.md': '# Tostadora Sur\n\n## Conexiones\n\n- [[andes]] — **es proveedor de** · le vende café cada semana\n',
  'crm.md': '# CRM\n\nSECRETO-CRM.\n\n## Conexiones\n\n- [[erp]] — se sincroniza todas las noches\n',
  'erp.md': '# ERP\n\nControla la [[bodega]].\n',
  'bodega.md': '# Bodega\n',
  'suelta.md': '# Suelta\n\nNada la enlaza.\n',
};

(async () => {
  const v = vaultSimulado({ ...NOTAS });
  const D = await construir(v.app, AJ);

  // ── 1. Serialización a dos saltos ─────────────────────────────────────────────────────────────
  const sub = subgrafoDe(D, 'andes.md');
  const textos = sub.lineas.map((l) => l.texto);
  p.cierto('la saliente con verbo y motivo', textos.includes('(andes) --[usa · sigue sus ventas en el CRM]--> (crm)'));
  p.cierto('la entrante, con el sentido en que se escribió', textos.includes('(tostadora) --[es proveedor de · le vende café cada semana]--> (andes)'));
  p.cierto('a dos saltos, sin verbo: «se relaciona con»', textos.includes('(crm) --[se relaciona con · se sincroniza todas las noches]--> (erp)'));
  p.cierto('el tercer salto no entra', !textos.some((t) => /bodega/.test(t)));
  p.cierto('una nota sin relación no entra', !textos.some((t) => /suelta/.test(t)));
  p.igual('ids c1, c2… en orden, las de la nota primero', sub.lineas.map((l) => l.id), ['c1', 'c2', 'c3']);
  p.cierto('las de la nota van primero', sub.lineas.slice(0, 2).every((l) => l.de === 'andes.md' || l.a === 'andes.md'));
  const sinMotivo = subgrafoDe(D, 'bodega.md').lineas.find((l) => l.a === 'bodega.md' || l.de === 'bodega.md');
  p.igual('sin motivo ni verbo: solo «se relaciona con»', sinMotivo.texto, '(erp) --[se relaciona con]--> (bodega)');
  p.igual('con tope, se recorta, se dice y se sabe el total', [subgrafoDe(D, 'andes.md', { max: 1 }).lineas.length, subgrafoDe(D, 'andes.md', { max: 1 }).recortado, subgrafoDe(D, 'andes.md', { max: 1 }).total], [1, true, 3]);

  // ── 2. Grafo vacío: no se llama a la IA ───────────────────────────────────────────────────────
  const q = new Plugin(); q.app = v.app; await q.onload();
  let llamadas = 0, pedido = '', sistema = '';
  q.llamarIA = async (s, u) => { llamadas++; pedido = u; sistema = s; return respuesta; };
  let respuesta = null;
  const vacia = await q.preguntarAlMapa(D, 'suelta.md', '¿quién la usa?');
  p.cierto('una nota sin conexiones no llama a la IA', vacia.vacio === true && vacia.suficiente === false && llamadas === 0);
  let msg = ''; try { await q.preguntarAlMapa(D, 'andes.md', '   '); } catch (e) { msg = e.message; }
  p.cierto('una pregunta vacía no llama a la IA', !!msg && llamadas === 0);

  // ── 3. IA falsa que cita ──────────────────────────────────────────────────────────────────────
  respuesta = { suficiente: true, respuesta: 'Andes usa el CRM, que se sincroniza con el ERP.', citas: ['c1', '[c3]', 'c99'] };
  const r = await q.preguntarAlMapa(D, 'andes.md', '¿Qué sistemas usa Andes?');
  p.igual('una llamada', llamadas, 1);
  p.cierto('a la IA van la pregunta y las líneas del subgrafo', pedido.includes('¿Qué sistemas usa Andes?') && pedido.includes('[c1] (andes) --[usa · sigue sus ventas en el CRM]--> (crm)'));
  p.cierto('y nunca el texto de las notas', !/SECRETO/.test(pedido) && !/Controla la/.test(pedido));
  p.cierto('la instrucción: solo el grafo, citar y decir cuando no alcanza', /SOLO las conexiones/.test(sistema) && /citas/.test(sistema) && /el mapa no tiene datos para responder eso/.test(sistema));
  p.cierto('la respuesta llega con las conexiones citadas', r.suficiente && r.respuesta.startsWith('Andes usa') && r.citas.map((l) => l.id).join() === 'c1,c3');
  p.igual('una cita a una conexión que no existe se ignora y se cuenta', r.inventadas, 1);
  p.cierto('cada cita lleva sus dos notas, para abrirlas', r.citas[0].de === 'andes.md' && r.citas[0].a === 'crm.md');

  // ── 4. La IA dice que no alcanza, o responde sin citar ────────────────────────────────────────
  respuesta = { suficiente: false, respuesta: 'el mapa no tiene datos para responder eso', citas: [] };
  const no = await q.preguntarAlMapa(D, 'andes.md', '¿Cuánto factura Andes?');
  p.cierto('cuando no alcanza, no hay respuesta', no.suficiente === false && no.respuesta === '' && !no.citas.length);
  respuesta = { suficiente: true, respuesta: 'Andes factura 100 millones.', citas: [] };
  const sin = await q.preguntarAlMapa(D, 'andes.md', '¿Cuánto factura Andes?');
  p.cierto('una respuesta sin citas no se muestra como respuesta', sin.suficiente === false && sin.sinCitas === true && sin.respuesta === '');

  // ── 4b. Lo que el modal anuncia es lo que se manda (dos saltos, total real, tope de 200) ─────────
  {
    q.tieneIA = () => true;
    p.cierto('el modal cuenta las conexiones a dos saltos, no a tres', /3 connections among 4 notes/.test(abrirModal(q, D, 'andes.md')));
    respuesta = { suficiente: false, respuesta: '', citas: [] };
    await q.preguntarAlMapa(D, 'andes.md', '¿qué hay?');
    p.cierto('a la IA no va el tercer salto', !/bodega/.test(pedido) && (pedido.match(/^\[c\d+\]/gm) || []).length === 3);
    // Una estrella de 250 notas: se mandan 200 y el modal dice el total real.
    const estrella = { 'centro.md': '# Centro\n\n' + Array.from({ length: 250 }, (_, i) => `[[s${i}]]`).join(' ') + '\n' };
    for (let i = 0; i < 250; i++) estrella[`s${i}.md`] = `# S${i}\n`;
    const we = vaultSimulado(estrella), De = await construir(we.app, AJ);
    const texto = abrirModal(q, De, 'centro.md');
    p.cierto('el modal dice el total real y cuántas se envían', /250 connections among 251 notes · the 200 closest are sent/.test(texto));
    await q.preguntarAlMapa(De, 'centro.md', '¿qué hay?');
    p.igual('a la IA van como mucho 200 líneas', (pedido.match(/^\[c\d+\]/gm) || []).length, 200);
    q.tieneIA = Plugin.prototype.tieneIA;
  }

  // ── 5. No escribe nada en el vault ────────────────────────────────────────────────────────────
  p.igual('preguntar no escribe ninguna nota', v.escrituras.length, 0);

  // ── 6. Sin IA (o «Solo IA local» con un servicio de internet): no sale nada ────────────────────
  {
    const w = vaultSimulado({ ...NOTAS }); const q2 = new Plugin(); q2.app = w.app; await q2.onload();
    let red = 0; global.__req = async () => { red++; return { status: 200, json: {} }; };
    p.cierto('sin llave, el plugin dice que no hay IA', q2.tieneIA() === false);
    q2.ajustes.proveedorIA = 'gemini'; q2.ajustes.modeloIA = 'm'; w.app._ls['mapa-neuronal-key-gemini'] = 'k'; q2.ajustes.soloLocal = true;
    let e2 = ''; try { await q2.preguntarAlMapa(await construir(w.app, AJ), 'andes.md', '¿qué usa?'); } catch (e) { e2 = e.message; }
    p.cierto('con «Solo IA local» y Gemini, se bloquea antes de la red y se dice por qué', red === 0 && /Local AI only|Solo IA local/.test(e2));
    global.__req = null;
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.stack); p.cerrar(); process.exit(1); });
