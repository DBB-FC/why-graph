/* El mundo de las pruebas e2e: una persona usando Why Graph durante días.
 *
 * Por qué existe (25.09.2026): la «auditoría e2e» de la 1.33.0 probó funciones sueltas y publicó
 * con un error que la persona veía a diario —«61 por leer» nunca bajaba— porque el script llamaba
 * a mano al paso que ella no daba («Terminar»). Aquí nada se llama por dentro: se pulsa lo que se
 * ve, por su texto, y lo que se mide es lo que la pantalla muestra.
 *
 * Lo que persiste entre sesiones es lo mismo que en Obsidian: las notas, data.json, ingesta.json
 * (el adapter) y el almacenamiento local de CADA dispositivo. Reiniciar = cargar main.js de nuevo.
 * El reloj es falso: pasar un día es una línea. La IA es un servidor falso con cuota diaria que
 * lleva la cuenta de todo lo que se le pagó.
 *
 * Los detectores corren solos después de cada paso y juntan «hallazgos»: errores tragados,
 * pagar dos veces por lo mismo, pasar el tope, escribir donde no corresponde, duplicar líneas,
 * contadores que no cuadran con la realidad.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const sha = (t) => crypto.createHash('sha1').update(String(t)).digest('hex').slice(0, 12);
const DIA = 864e5;

// ── DOM falso: guarda texto, clases, visibilidad y manejadores; se puede leer y pulsar ─────────
class Nodo {
  constructor(tag, mundo) { this.tag = tag; this.mundo = mundo; this.hijos = []; this.padre = null; this.clases = new Set(); this.texto = ''; this.attrs = {}; this.style = { display: '' }; this.value = ''; this.disabled = false; this.eventos = {}; this.onclick = null; this.open = false; this._rect = null; this.scrollWidth = 0; this.scrollLeft = 0; this.clientWidth = 0; this.width = 0; this.height = 0; }
  _nuevo(tag, o) {
    const n = new Nodo(tag, this.mundo); n.padre = this; this.hijos.push(n);
    if (typeof o === 'string') n.addClass(o);
    else if (o) { if (o.cls) n.addClass(...[].concat(o.cls)); if (o.text !== undefined) n.texto = String(o.text); if (o.attr) for (const [k, v] of Object.entries(o.attr)) n.attrs[k] = String(v); if (o.type) n.attrs.type = o.type; if (o.placeholder) n.attrs.placeholder = o.placeholder; if (o.value !== undefined) n.value = o.value; }
    return n;
  }
  createEl(tag, o) { return this._nuevo(tag, o); }
  createDiv(o) { return this._nuevo('div', o); }
  createSpan(o) { return this._nuevo('span', o); }
  setText(t) { this.hijos = []; this.texto = String(t); return this; }
  appendText(t) { const n = this._nuevo('#text'); n.texto = String(t); return this; }
  empty() { this.hijos = []; this.texto = ''; return this; }
  addClass(...c) { c.flatMap((x) => String(x).split(/\s+/)).filter(Boolean).forEach((x) => this.clases.add(x)); return this; }
  removeClass(...c) { c.forEach((x) => this.clases.delete(x)); return this; }
  toggleClass(c, v) { (v === undefined ? !this.clases.has(c) : v) ? this.clases.add(c) : this.clases.delete(c); return this; }
  hasClass(c) { return this.clases.has(c); }
  get className() { return [...this.clases].join(' '); }
  get classList() { const n = this; return { contains: (c) => n.clases.has(c), add: (c) => n.clases.add(c), remove: (c) => n.clases.delete(c) }; }
  // show/hide copiados de enhance.js de Obsidian: show() nunca escribe «block».
  show() { if (this.style.display === 'none') this.style.display = ''; return this; }
  hide() { this.style.display = 'none'; return this; }
  toggle(v) { return v ? this.show() : this.hide(); }
  isShown() { return this.mundo.visible(this); }
  setCssProps() { return this; }
  remove() { if (this.padre) this.padre.hijos = this.padre.hijos.filter((x) => x !== this); this.padre = null; }
  get isConnected() { let n = this; while (n.padre) n = n.padre; return n === this.mundo.raizDom; }
  getBoundingClientRect() { return this._rect || { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  hasAttribute(k) { return k in this.attrs; }
  focus() { this.mundo.foco = this; }
  click() { this.mundo.clicar(this); }
  addEventListener(t, f) { (this.eventos[t] = this.eventos[t] || []).push(f); }
  removeEventListener() {}
  setPointerCapture() {}
  getContext() { return this.mundo.contexto2D(); }
  toDataURL() { return 'data:image/png;base64,'; }
  toBlob(cb) { cb && cb(null); }
  *recorrer() { yield this; for (const h of this.hijos) yield* h.recorrer(); }
  coincide(sel) {
    return sel.split(',').map((s) => s.trim()).some((s) => {
      const m = s.match(/^([a-z]*)((?:\.[\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/i); if (!m) return false;
      if (m[1] && m[1] !== this.tag) return false;
      for (const c of (m[2].match(/\.[\w-]+/g) || [])) if (!this.clases.has(c.slice(1))) return false;
      for (const a of (m[3].match(/\[[^\]]+\]/g) || [])) { const [, k, v] = a.match(/\[([\w-]+)(?:="([^"]*)")?\]/); if (!(k in this.attrs) || (v !== undefined && this.attrs[k] !== v)) return false; }
      return true;
    });
  }
  querySelectorAll(sel) { return [...this.recorrer()].slice(1).filter((n) => n.coincide(sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { for (let n = this; n; n = n.padre) if (n.coincide(sel)) return n; return null; }
  textoPropio() { return this.texto; }
}

// ── El mundo ────────────────────────────────────────────────────────────────────────────────
class Mundo {
  constructor(opciones = {}) {
    this.main = opciones.main || path.join(__dirname, '../../main.js');
    this.reloj = Date.parse(opciones.inicio || '2026-09-20T09:00:00-03:00');
    this.notas = {}; this.mtimes = {}; this.internos = {}; this.datos = null;
    this.dispositivos = {};          // nombre → { ls: {}, telefono }
    this.hallazgos = []; this.avisos = []; this.errores = []; this.registro = [];
    this.ia = { cuotaDiaria: Infinity, usadas: {}, llamadas: [], lento: 0, caida: 0, pagado: new Map(), listas: [], listasCaidas: 0,
      modelos: {
        openrouter: [{ id: 'mistralai/mistral-nemo', precio: 0.019 }, { id: 'google/gemini-3.1-flash-lite', precio: 0.25 },
          { id: 'google/gemini-3.1-flash-lite:batch', precio: 0.125 }, { id: 'qwen/qwen3.8-27b:free', precio: 0 },
          { id: 'openrouter/auto', precio: -1 }, { id: 'openrouter/free', precio: 0 }, { id: 'viejo/sin-esquema', precio: 0.01, esquema: false },
          { id: 'google/gemini-3.1-flash-image', precio: 0.5, salida: ['image', 'text'] }, { id: 'anthropic/claude-opus-5', precio: 5 }],
        gemini: [{ id: 'gemini-3.1-flash-lite' }, { id: 'gemini-3.8-flash' }, { id: 'text-embedding-005', metodos: ['embedContent'] }, { id: 'gemini-3.1-flash-image' }],
        openai: [{ id: 'gpt-5-mini' }, { id: 'text-embedding-3-small' }, { id: 'gpt-5-realtime' }, { id: 'dall-e-3' }],
        local: [{ id: 'llama3.2' }],
      } };
    this.eventos = {}; this.tiempos = []; this.foco = null; this.menu = null; this.raizDom = null; this.sesion = null;
    this.timers = new Set();
    this.escala = opciones.escala || 1000;   // 1 s del plugin = 1 ms real
  }
  // ── tiempo ──
  hoy() { const d = new Date(this.reloj - 3 * 3600e3); return d.toISOString().slice(0, 10); }
  pasarDias(n) { this.reloj += n * DIA; }
  pasarMinutos(n) { this.reloj += n * 60e3; }
  // ── vault ──
  // Lo que escribe la PERSONA (no el plugin): Obsidian lo indexa y avisa «resolved», como siempre.
  escribir(ruta, texto) {
    this.notas[ruta] = texto; this.mtimes[ruta] = this.reloj; (this.dePersona = this.dePersona || {})[ruta] = texto;
    this.recalcular(); this.sesion?.pendienteResolver();
  }
  agregarNotas(obj) { for (const [r, t] of Object.entries(obj)) { this.notas[r] = t; this.mtimes[r] = this.reloj; } this.recalcular(); }
  recalcular() {
    const md = Object.keys(this.notas).filter((p) => p.endsWith('.md'));
    const porNombre = {}; for (const p of md) { const b = p.split('/').pop().replace(/\.md$/, '').toLowerCase(); (porNombre[b] = porNombre[b] || []).push(p); }
    const resolver = (t) => { t = t.split('|')[0].split('#')[0].trim().replace(/\.md$/i, ''); const ruta = md.find((p) => p.replace(/\.md$/, '').toLowerCase() === t.toLowerCase()); if (ruta) return ruta; const c = porNombre[t.split('/').pop().toLowerCase()]; return c ? c.slice().sort((a, b) => a.length - b.length)[0] : null; };
    const r = {}; for (const p of md) { r[p] = {}; for (const m of this.notas[p].matchAll(/\[\[([^\]]+)\]\]/g)) { const d = resolver(m[1]); if (d) r[p][d] = (r[p][d] || 0) + 1; } }
    this.resueltos = r;
  }
  emitir(ev, ...a) { for (const f of this.eventos[ev] || []) try { f(...a); } catch (e) { this.error('evento ' + ev, e); } }
  // ── detectores ──
  hallazgo(tipo, detalle) { if (!this.hallazgos.some((h) => h.tipo === tipo && h.detalle === detalle)) this.hallazgos.push({ tipo, detalle, dia: this.hoy(), paso: this.paso }); }
  error(donde, e) { this.errores.push(`${donde}: ${e?.stack || e}`); this.hallazgo('error tragado', `${donde}: ${String(e?.message || e).slice(0, 160)}`); }
  // ── IA falsa ──
  // Las listas de modelos que da cada proveedor (GET …/models). No son llamadas a la IA: no gastan
  // cuota, pero se cuentan para detectar si se piden de más.
  listaModelos(url) {
    const d = this.ia.modelos, prov = /openrouter/.test(url) ? 'openrouter' : /generativelanguage/.test(url) ? 'gemini' : /openai/.test(url) ? 'openai' : 'local';
    this.ia.listas.push({ dia: this.hoy(), prov, sesion: this.sesion?.id });
    if (this.ia.listasCaidas > 0) { this.ia.listasCaidas--; return { status: 503, json: { error: { message: 'overloaded' } } }; }
    if (prov === 'gemini' && !/key=[^&]+/.test(url)) return { status: 403, json: { error: { message: 'API key missing' } } };
    if (prov === 'gemini') return { status: 200, json: { models: d.gemini.map((m) => ({ name: 'models/' + m.id, supportedGenerationMethods: m.metodos || ['generateContent'] })) } };
    if (prov === 'openrouter') return { status: 200, json: { data: d.openrouter.map((m) => ({ id: m.id, pricing: { prompt: String(m.precio / 1e6), completion: '0' },
      supported_parameters: m.esquema === false ? ['temperature'] : ['structured_outputs', 'response_format'], architecture: { output_modalities: m.salida || ['text'] } })) } };
    return { status: 200, json: { data: (d[prov] || []).map((m) => ({ id: m.id })) } };
  }
  responderIA(o) {
    if (String(o.method).toUpperCase() === 'GET' && /\/models(\?|$)/.test(o.url)) return this.listaModelos(o.url);
    const url = o.url, cuerpo = JSON.parse(o.body || '{}'), gemini = /generativelanguage/.test(url);
    const sistema = gemini ? cuerpo.systemInstruction?.parts?.[0]?.text : (cuerpo.system || cuerpo.messages?.find((m) => m.role === 'system')?.content || '');
    const usuario = gemini ? cuerpo.contents?.[0]?.parts?.[0]?.text : (cuerpo.messages?.find((m) => m.role === 'user')?.content || '');
    const dia = this.hoy(), usadas = this.ia.usadas[dia] || 0;
    const llamada = { dia, sesion: this.sesion?.id, dispositivo: this.sesion?.dispositivo, tipo: tipoPrompt(sistema), bytes: String(usuario).length, ok: false };
    this.ia.llamadas.push(llamada);
    if (this.ia.caida > 0) { this.ia.caida--; llamada.status = 503; return { status: 503, json: { error: { message: 'overloaded' } } }; }
    if (usadas >= this.ia.cuotaDiaria) {
      llamada.status = 429;
      const detalle = { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: String(this.ia.cuotaDiaria), quotaDimensions: { model: 'modelo-e2e' } }] };
      return { status: 429, headers: {}, json: { error: { code: 429, message: 'You exceeded your current quota', details: [detalle, { retryDelay: '9s' }] } } };
    }
    this.ia.usadas[dia] = usadas + 1;
    const obj = responderPrompt(llamada.tipo, sistema, usuario, this);
    if (!obj) { llamada.status = 400; this.hallazgo('prompt desconocido', String(sistema).slice(0, 80)); return { status: 400, json: { error: { message: 'prompt desconocido' } } }; }
    llamada.status = 200; llamada.ok = true;
    // Registro de lo pagado: cada bloque de material leído con éxito. Pagar dos veces por el mismo
    // bloque (mismo archivo, mismo texto) en dos búsquedas distintas es un hallazgo.
    if (llamada.tipo === 'material') for (const b of bloques(usuario)) {
      const k = b.fuente + '#' + sha(b.texto), antes = this.ia.pagado.get(k);
      if (antes && antes.busqueda !== this.busqueda) this.hallazgo('pagó dos veces', `${b.fuente}: el mismo texto se envió el ${antes.dia} y otra vez el ${dia}`);
      if (!antes) this.ia.pagado.set(k, { dia, busqueda: this.busqueda });
    }
    const texto = JSON.stringify(obj);
    return gemini ? { status: 200, json: { candidates: [{ content: { parts: [{ text: texto }] }, finishReason: 'STOP' }] } }
      : { status: 200, json: { choices: [{ message: { content: texto }, finish_reason: 'stop' }] } };
  }
  // Lo que la IA ya leyó entero de un archivo (según lo pagado), para contrastar con «por leer».
  leidoEntero(ruta) {
    const t = this.notas[ruta]; if (t === undefined) return false;
    const pars = t.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length >= 40);
    const enviados = [...this.ia.pagado.keys()].filter((k) => k.startsWith(ruta + '#'));
    if (!enviados.length) return false;
    const textos = this.textosPagados.get(ruta) || [];
    return pars.every((p) => textos.some((x) => x.includes(p.slice(0, 80))));
  }
  // Cuántos archivos del material crudo quedan SIN leer de verdad (según lo que la IA recibió),
  // sin mirar la pantalla: la vara con que se mide si el contador de la persona dice la verdad.
  sinLeer(carpeta = 'raw') {
    return Object.keys(this.notas).filter((r) => r.startsWith(carpeta + '/') && r.endsWith('.md') && !/mapa-neuronal-motivos\.md$/.test(r) && !/\.mini\.md$|digest/.test(r) && !this.leidoEntero(r));
  }
  // ── sesiones: abrir Obsidian en un dispositivo ──
  async abrir(dispositivo = 'mac', { telefono = false } = {}) {
    if (this.sesion) await this.cerrar();
    const d = this.dispositivos[dispositivo] = this.dispositivos[dispositivo] || { ls: {}, telefono };
    const id = (this._n = (this._n || 0) + 1);
    const s = this.sesion = new Sesion(this, id, dispositivo, d);
    await s.iniciar();
    return s;
  }
  async cerrar() { if (this.sesion) { await this.sesion.cerrar(); this.sesion = null; } }
  visible(n) {
    for (let x = n; x; x = x.padre) {
      if (x.style.display === 'none') return false;
      if (x.clases.has('mn-panel') && !x.clases.has('abierto')) return false;
      if (x.clases.has('mn-resultados') && !x.clases.has('mostrar')) return false;
      if (x.padre && x.padre.tag === 'details' && !x.padre.open && x.tag !== 'summary') return false;
    }
    return true;
  }
  clicar(n) {
    const e = { stopPropagation() {}, preventDefault() {}, target: n, clientX: 0, clientY: 0, type: 'click' };
    if (n.tag === 'summary' && n.padre?.tag === 'details') n.padre.open = !n.padre.open;
    try { const r = n.onclick?.(e); if (r?.catch) r.catch((err) => this.error('clic ' + textoDe(n), err)); } catch (err) { this.error('clic ' + textoDe(n), err); }
    for (const f of n.eventos.click || []) try { f(e); } catch (err) { this.error('clic', err); }
  }
  contexto2D() {
    const c = { font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'left', globalCompositeOperation: 'source-over' };
    for (const k of ['beginPath', 'moveTo', 'lineTo', 'arc', 'fill', 'stroke', 'fillRect', 'strokeRect', 'setLineDash', 'bezierCurveTo', 'save', 'restore', 'translate', 'scale', 'clearRect', 'fillText', 'closePath', 'quadraticCurveTo', 'setTransform', 'resetTransform', 'rotate', 'clip', 'rect', 'roundRect', 'arcTo', 'ellipse', 'drawImage', 'strokeText']) c[k] = () => {};
    c.createLinearGradient = c.createRadialGradient = () => ({ addColorStop() {} });
    c.measureText = (t) => ({ width: String(t).length * 6.5 });
    c.getTransform = () => ({ a: 1, d: 1, e: 0, f: 0 });
    return c;
  }
  informe() { return { hallazgos: this.hallazgos, errores: this.errores, avisos: this.avisos }; }
}

const textoDe = (n) => { let t = ''; for (const x of n.recorrer()) t += x.texto; return t.replace(/\s+/g, ' ').trim(); };

function tipoPrompt(s) {
  s = String(s || '');
  if (/^Extraes de material/.test(s)) return 'material';
  if (/^Comparas novedades/.test(s)) return 'comparar';
  if (/^Explicas por qué/.test(s)) return 'motivo';
  if (/^Resumes una nota/.test(s)) return 'resumen';
  if (/^Eres un revisor/.test(s)) return 'revisor';
  if (/prueba|test/i.test(s) || /^Responde solo con JSON\.$/.test(s)) return 'probar';
  return 'otro';
}
function bloques(u) { return [...String(u).matchAll(/<material fuente="([^"]+)"[^>]*>\n([\s\S]*?)\n<\/material>/g)].map((m) => ({ fuente: m[1], texto: m[2] })); }
// Una frase literal del texto, de 6 a 20 palabras, para que la cita se pueda verificar.
function citaDe(t) {
  const limpio = String(t).replace(/^---[\s\S]*?\n---\n?/, '');
  for (const l of limpio.split('\n')) { const x = l.replace(/^[#>*\-\s]+/, '').trim(); if (x.split(/\s+/).length >= 6 && !/\[\[|`/.test(x)) return x.split(/\s+/).slice(0, 14).join(' '); }
  return limpio.trim().split(/\s+/).slice(0, 8).join(' ');
}
function responderPrompt(tipo, sistema, usuario, mundo) {
  if (tipo === 'material') {
    const paginas = (String(usuario).match(/PÁGINAS QUE YA EXISTEN EN EL WIKI:\n([\s\S]*?)(\n\n|$)/)?.[1] || '').split('\n').filter((x) => x.endsWith('.md'));
    const novedades = [];
    for (const b of bloques(usuario)) {
      // Una novedad por bloque, a la página cuyo nombre aparece en el material (si hay).
      const destino = paginas.find((p) => b.texto.toLowerCase().includes(p.split('/').pop().replace(/\.md$/, '').replace(/-/g, ' '))) || '';
      const cita = citaDe(b.texto);
      mundo.textosPagados = mundo.textosPagados || new Map();
      (mundo.textosPagados.get(b.fuente) || mundo.textosPagados.set(b.fuente, []).get(b.fuente)).push(b.texto);
      novedades.push({ texto: 'Novedad: ' + cita, cita, fuente: b.fuente, destino, crear: false });
    }
    return { novedades, contradicciones: [] };
  }
  if (tipo === 'comparar') {
    const res = [...String(usuario).matchAll(/^(n\d+): (.*)$/gm)].map((m) => ({ id: m[1], estado: 'nuevo', seccion: '', texto: m[2], detalle: '' }));
    return { resultados: res };
  }
  if (tipo === 'motivo') {
    const o = String(usuario).match(/<origen>\n([\s\S]*?)\n<\/origen>/)?.[1] || '', d = String(usuario).match(/<destino>\n([\s\S]*?)\n<\/destino>/)?.[1] || '';
    return { suficiente: true, motivo: 'las dos notas describen el mismo trabajo con el cliente', cita_origen: citaDe(o), cita_destino: citaDe(d) };
  }
  if (tipo === 'resumen') { const n = String(usuario).match(/<nota>\n([\s\S]*?)\n<\/nota>/)?.[1] || ''; const c = citaDe(n); return { suficiente: true, resumen: 'Nota sobre ' + c, citas: [c] }; }
  if (tipo === 'revisor') return { fiel: true, problema: '' };
  if (tipo === 'probar') return { ok: true, fiel: true, problema: '', suficiente: true };
  return null;
}

// ── Una sesión: Obsidian abierto en un dispositivo, con el plugin cargado desde main.js ────────
class Sesion {
  constructor(mundo, id, dispositivo, disp) { this.mundo = mundo; this.id = id; this.dispositivo = dispositivo; this.disp = disp; this.hojas = []; }
  async iniciar() {
    const M = this.mundo, S = this, telefono = this.disp.telefono;
    const ancho = telefono ? 390 : 1440, alto = telefono ? 844 : 860;
    M.raizDom = new Nodo('body', M); M.foco = null;
    const escala = (ms) => Math.max(0, (ms || 0) / M.escala);
    // Globales que el plugin toca. El reloj es el del mundo.
    const RealDate = M._RealDate || (M._RealDate = global.Date);
    class FalsaFecha extends RealDate { constructor(...a) { if (a.length) super(...a); else super(M.reloj); } static now() { return M.reloj; } }
    global.Date = FalsaFecha;
    const timer = (f, ms) => { const h = setTimeout(() => { M.timers.delete(h); try { const r = f(); if (r?.catch) r.catch((e) => M.error('temporizador', e)); } catch (e) { M.error('temporizador', e); } }, escala(ms)); M.timers.add(h); return h; };
    global.window = { devicePixelRatio: 2, setTimeout: timer, clearTimeout: (h) => { clearTimeout(h); M.timers.delete(h); }, matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, open: (u) => M.registro.push({ accion: 'abre-url', url: u }), localStorage: { getItem: () => null } };
    global.document = { visibilityState: 'visible', createElement: (t) => new Nodo(t, M), body: M.raizDom };
    global.getComputedStyle = () => ({ getPropertyValue: () => '' });
    global.ResizeObserver = class { observe() {} disconnect() {} };
    global.MutationObserver = undefined;
    global.Node = Nodo;
    global.__idioma = M.idioma || 'es';
    // Errores que el plugin deja escapar o escribe en la consola.
    M.consolaError = M.consolaError || console.error;
    console.error = (...a) => M.hallazgo('console.error', a.map((x) => String(x?.message || x)).join(' ').slice(0, 200));
    Mundo.actual = M;
    if (!Mundo.escucha) { Mundo.escucha = true; process.on('unhandledRejection', (e) => Mundo.actual?.error('promesa sin catch', e)); process.on('uncaughtException', (e) => Mundo.actual?.error('excepción', e)); }
    // El módulo «obsidian»
    const obs = this.obsidian(telefono);
    const texto = fs.readFileSync(M.main, 'utf8'), mod = { exports: {} };
    new Function('require', 'module', 'exports', texto)((n) => (n === 'obsidian' ? obs : require(n)), mod, mod.exports);
    const Plugin = mod.exports.default || mod.exports;
    const app = this.app = this.crearApp(ancho, alto);
    const pl = this.plugin = new Plugin(app, { id: 'mapa-neuronal', version: 'e2e', dir: '.obsidian/plugins/mapa-neuronal' });
    pl.app = app; pl.manifest = { id: 'mapa-neuronal', version: 'e2e', dir: '.obsidian/plugins/mapa-neuronal' };
    await pl.onload();
    for (const f of this.alListo || []) f();
    await this.esperar(20);
  }
  obsidian(telefono) {
    const M = this.mundo, S = this;
    const Componente = class {
      registerEvent() {} registerInterval() {}
      registerDomEvent(el, tipo, fn) { el.addEventListener?.(tipo, fn); }
      register(fn) { (this._alDescargar = this._alDescargar || []).push(fn); }
      unload() { for (const fn of this._alDescargar || []) fn(); }
    };
    const item = () => { const o = { titulo: '', alClic: null }; o.setTitle = (t) => { o.titulo = t; return o; }; o.setIcon = () => o; o.setChecked = (v) => { o.marcado = v; return o; }; o.onClick = (f) => { o.alClic = f; return o; }; o.setSection = () => o; o.setDisabled = () => o; return o; };
    class Menu { constructor() { this.items = []; } addItem(f) { const i = item(); f(i); this.items.push(i); return this; } addSeparator() { return this; } showAtMouseEvent() { M.menu = this; } showAtPosition() { M.menu = this; } }
    class Modal { constructor(app) { this.app = app; this.contentEl = new Nodo('div', M); this.contentEl.padre = M.raizDom; M.raizDom.hijos.push(this.contentEl); this.titleEl = new Nodo('div', M); } setTitle(t) { this.titulo = t; } open() { M.modal = this; this.onOpen?.(); } close() { M.modal = null; this.contentEl.remove(); this.onClose?.(); } }
    class Notice { constructor(m) { M.avisos.push({ dia: M.hoy(), texto: String(m) }); if (/no se pudo|error|falló|rechazó|no encuentro|no respondió|desconocid|cortada|bloqueó/i.test(String(m))) M.hallazgo('aviso de error', String(m).slice(0, 200)); } setMessage() { return this; } hide() {} }
    const campo = (tipo) => { const c = { tipo, valor: undefined }; c.addOptions = (o) => { c.opciones = Object.assign(c.opciones || {}, o); return c; }; c.setButtonText = (t) => { c.texto = String(t); return c; }; for (const k of ['setPlaceholder', 'setLimits', 'setDynamicTooltip', 'setCta', 'setIcon', 'setDisabled', 'setTooltip', 'setWarning']) c[k] = () => c; c.setValue = (v) => { c.valor = v; return c; }; c.onChange = (f) => { c.alCambiar = f; return c; }; c.onClick = (f) => { c.alClic = f; return c; }; c.inputEl = new Nodo('input', M); c.inputEl.addClass = () => c.inputEl; c.selectEl = new Nodo('select', M); c.buttonEl = new Nodo('button', M); return c; };
    class Setting {
      constructor(el) { this.el = el; this.settingEl = el?.createDiv ? el.createDiv('setting-item') : new Nodo('div', M); this.campos = []; this.descEl = new Nodo('div', M); this.nameEl = new Nodo('div', M); this.controlEl = new Nodo('div', M); this.infoEl = new Nodo('div', M); (M.ajustesUI = M.ajustesUI || []).push(this); }
      setName(v) { this.nombre = String(v?.textContent ?? v); this.settingEl.attrs['data-nombre'] = this.nombre; return this; } setDesc(v) { this.desc = String(v ?? ''); return this; } setHeading() { return this; } setClass() { return this; } setTooltip() { return this; } setDisabled() { return this; }
      _c(t, f) { const c = campo(t); f(c); this.campos.push(c); return this; }
      addText(f) { return this._c('texto', f); } addTextArea(f) { return this._c('area', f); } addToggle(f) { return this._c('interruptor', f); } addSlider(f) { return this._c('deslizador', f); } addDropdown(f) { return this._c('lista', f); } addButton(f) { return this._c('boton', f); } addExtraButton(f) { return this._c('boton', f); } addSearch(f) { return this._c('texto', f); }
    };
    class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = new Nodo('div', M); } }
    class ItemView extends Componente { constructor(hoja) { super(); this.leaf = hoja; this.app = S.app; } onPaneMenu() {} }
    class Plugin extends Componente {
      constructor(app, manifest) { super(); this.app = app; this.manifest = manifest; }
      registerView(tipo, f) { S.fabricaVista = f; }
      addSettingTab(t) { S.pestanaAjustes = t; }
      addRibbonIcon(icono, titulo, f) { S.cinta = f; return new Nodo('div', M); }
      addCommand(c) { (S.comandos = S.comandos || []).push(c); }
      async loadData() { return M.datos ? JSON.parse(JSON.stringify(M.datos)) : null; }
      async saveData(d) { M.datos = JSON.parse(JSON.stringify(d)); }
    }
    const debounce = (f, ms) => { let h = null; return (...a) => { if (h) window.clearTimeout(h); h = window.setTimeout(() => { h = null; f(...a); }, ms); }; };
    return { Plugin, ItemView, PluginSettingTab, Setting, Menu, Modal, Notice, Platform: { isMobile: telefono, isPhone: telefono, isDesktop: !telefono },
      debounce, setIcon: () => {}, requestUrl: async (o) => M.responderIA(o), normalizePath: (p) => String(p).replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, ''), getLanguage: () => global.__idioma || 'es' };
  }
  crearApp(ancho, alto) {
    const M = this.mundo, S = this;
    const base = (p) => p.split('/').pop().replace(/\.[^.]+$/, '');
    const archivo = (p) => ({ path: p, name: p.split('/').pop(), basename: base(p), extension: p.split('.').pop(), parent: { path: p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '/' }, stat: { mtime: M.mtimes[p] ?? 0, ctime: 0, size: (M.notas[p] || '').length } });
    const esCarpeta = (p) => Object.keys(M.notas).some((a) => a.startsWith(p + '/'));
    const escribe = (p, t) => { M.notas[p] = t; M.mtimes[p] = M.reloj; M.registro.push({ dia: M.hoy(), accion: 'escribe', ruta: p, sesion: S.id }); M.recalcular(); S.pendienteResolver(); };
    const fm = (t) => { const o = {}; const m = String(t).match(/^---\n([\s\S]*?)\n---/); if (!m) return o; let k = null; for (const l of m[1].split('\n')) { const li = l.match(/^\s+-\s+(.*)$/); if (li && k) { (o[k] = Array.isArray(o[k]) ? o[k] : []).push(li[1].replace(/^["']|["']$/g, '')); continue; } const kv = l.match(/^([\w-]+):\s*(.*)$/); if (!kv) continue; k = kv[1]; const v = kv[2].trim(); o[k] = v === '' ? [] : v === 'true' ? true : v === 'false' ? false : v.replace(/^["']|["']$/g, ''); } return o; };
    const aYaml = (o) => Object.entries(o).map(([k, v]) => Array.isArray(v) ? `${k}:\n${v.map((x) => `  - ${x}`).join('\n')}` : `${k}: ${typeof v === 'string' && /[:#]/.test(v) ? JSON.stringify(v) : v}`).join('\n');
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: { exists: async (p) => M.internos[p] !== undefined, read: async (p) => M.internos[p], write: async (p, t) => { M.internos[p] = t; } },
        getMarkdownFiles: () => Object.keys(M.notas).filter((p) => p.endsWith('.md')).map(archivo),
        getFiles: () => Object.keys(M.notas).map(archivo),
        getFileByPath: (p) => (M.notas[p] !== undefined ? archivo(p) : null),
        getFolderByPath: (p) => (esCarpeta(p) ? { path: p } : null),
        getAbstractFileByPath: (p) => (M.notas[p] !== undefined ? archivo(p) : esCarpeta(p) ? { path: p } : null),
        createFolder: async () => {},
        create: async (p, t) => { if (M.notas[p] !== undefined) throw new Error('File already exists.'); escribe(p, t); return archivo(p); },
        createBinary: async (p) => { M.registro.push({ dia: M.hoy(), accion: 'binario', ruta: p }); },
        modify: async (f, t) => escribe(f.path, t),
        append: async (f, t) => escribe(f.path, M.notas[f.path] + t),
        process: async (f, fn) => { const t = fn(M.notas[f.path]); if (t !== M.notas[f.path]) escribe(f.path, t); return t; },
        cachedRead: async (f) => M.notas[f.path], read: async (f) => M.notas[f.path],
        trash: async (f) => { delete M.notas[f.path]; M.registro.push({ dia: M.hoy(), accion: 'papelera', ruta: f.path }); M.recalcular(); },
        on: () => ({}),
      },
      fileManager: {
        processFrontMatter: async (f, fn) => { const t = M.notas[f.path]; const o = fm(t); fn(o); const cuerpo = t.replace(/^---\n[\s\S]*?\n---\n?/, ''); escribe(f.path, `---\n${aYaml(o)}\n---\n${cuerpo}`); },
        renameFile: async (f, nueva) => { M.notas[nueva] = M.notas[f.path]; M.mtimes[nueva] = M.mtimes[f.path]; delete M.notas[f.path]; M.registro.push({ dia: M.hoy(), accion: 'mueve', ruta: f.path, a: nueva }); M.recalcular(); S.pendienteResolver(); },
        trashFile: async (f) => { delete M.notas[f.path]; M.registro.push({ dia: M.hoy(), accion: 'papelera', ruta: f.path }); M.recalcular(); S.pendienteResolver(); },
      },
      metadataCache: {
        getFileCache: (f) => ({ frontmatter: fm(M.notas[f.path] || '') }),
        get resolvedLinks() { return M.resueltos || {}; },
        on: (ev, f) => { (S.eventos = S.eventos || {})[ev] = [...(S.eventos?.[ev] || []), f]; return {}; },
      },
      workspace: {
        on: (ev, f) => { (S.eventosWs = S.eventosWs || {})[ev] = [...(S.eventosWs?.[ev] || []), f]; return {}; },
        onLayoutReady: (f) => { (S.alListo = S.alListo || []).push(f); },
        getLeavesOfType: () => S.hojas,
        getActiveFile: () => null,
        getActiveViewOfType: () => null,
        revealLeaf: () => {},
        getLeaf: () => {
          const hoja = { view: null, openFile: async (f) => { M.registro.push({ dia: M.hoy(), accion: 'abre-nota', ruta: f.path }); S.notaAbierta = f.path; },
            setViewState: async () => {
              const v = S.fabricaVista(hoja); hoja.view = v;
              v.contentEl = M.raizDom.createDiv('view-content'); v.contentEl._rect = { top: 0, left: 0, right: ancho, bottom: alto, width: ancho, height: alto };
              S.hojas.push(hoja); await v.onOpen(); S.vista = v;
              // Cada elemento nuevo mide lo que mediría en pantalla, aproximado: la barra arriba, el panel a la derecha o abajo.
              S.medidas(ancho, alto); v.medir?.(); v.encuadrar?.();
            } };
          return hoja;
        },
      },
      loadLocalStorage: (k) => S.disp.ls[k], saveLocalStorage: (k, v) => { S.disp.ls[k] = v; },
    };
    return app;
  }
  medidas(ancho, alto) {
    const v = this.vista; if (!v) return;
    const tel = this.disp.telefono;
    if (v.barra) v.barra._rect = { top: 10, left: 12, right: ancho - 12, bottom: tel ? 140 : 70, width: ancho - 24, height: tel ? 130 : 60 };
    if (v.panel) v.panel._rect = tel ? { top: alto * 0.48, left: 8, right: ancho - 8, bottom: alto - 58, width: ancho - 16, height: alto * 0.52 - 58 } : { top: 92, left: ancho - 392, right: ancho - 12, bottom: alto - 60, width: 380, height: alto - 152 };
    if (v.lienzo) v.lienzo._rect = { top: 0, left: 0, right: ancho, bottom: alto, width: ancho, height: alto };
  }
  // Obsidian avisa «resolved» cuando termina de indexar un cambio.
  pendienteResolver() { if (this._resolviendo) return; this._resolviendo = true; window.setTimeout(() => { this._resolviendo = false; for (const f of this.eventos?.resolved || []) try { f(); } catch (e) { this.mundo.error('resolved', e); } }, 200); }
  async esperar(ms = 30) { await new Promise((r) => setTimeout(r, ms)); }
  // Espera a que no queden temporizadores ni búsquedas en curso.
  async calma(maxMs = 20000) {
    const t0 = Date.now ? this.mundo._RealDate.now() : 0;
    for (;;) {
      await this.esperar(15);
      const ocupado = this.plugin.nov?.fase === 'buscando' || this.mundo.timers.size > 0;
      if (!ocupado) { await this.esperar(15); if (!(this.plugin.nov?.fase === 'buscando' || this.mundo.timers.size > 0)) return; }
      if (this.mundo._RealDate.now() - t0 > maxMs) { this.mundo.hallazgo('se quedó colgado', `más de ${maxMs / 1000} s ocupado (fase ${this.plugin.nov?.fase})`); return; }
    }
  }
  async cerrar() {
    await this.calma(5000);
    for (const h of this.hojas) await h.view?.onClose?.();
    this.plugin.unload?.(); this.plugin.onunload?.();
    for (const h of this.mundo.timers) clearTimeout(h); this.mundo.timers.clear();
    console.error = this.mundo.consolaError;
  }
  // ── lo que hace y ve la persona ──
  async abrirMapa() {
    const t0 = this.mundo._RealDate.now(); await this.cinta(); await this.calma();
    const ms = this.mundo._RealDate.now() - t0; this.mundo.tiempos.push(['abrir el mapa', ms]);
    if (ms > 4000) this.mundo.hallazgo('lento', `abrir el mapa tardó ${(ms / 1000).toFixed(1)} s`);
    return this.vista;
  }
  textoVisible(raiz = this.vista?.contentEl) {
    const M = this.mundo, partes = [];
    const rec = (n) => { if (!M.visible(n)) return; if (n.texto) partes.push(n.texto); if (n.tag === 'input' && n.value) partes.push(n.value); for (const h of n.hijos) rec(h); };
    if (raiz) rec(raiz); if (M.modal) rec(M.modal.contentEl);
    return partes.join(' ').replace(/\s+/g, ' ');
  }
  ve(patron) { const t = this.textoVisible(); return typeof patron === 'string' ? t.includes(patron) : patron.test(t); }
  chip() { const c = this.vista?.chipNovedades; return c && this.mundo.visible(c) ? textoDe(c) : ''; }
  pulsables() { const M = this.mundo, raiz = this.vista.contentEl, out = []; for (const n of [...raiz.recorrer(), ...(M.modal ? M.modal.contentEl.recorrer() : [])]) if (M.visible(n) && !n.disabled && (n.tag === 'button' || n.tag === 'summary' || n.onclick)) out.push(n); return out; }
  async pulsa(patron, { opcional = false } = {}) {
    const m = (t) => (typeof patron === 'string' ? t.includes(patron) : patron.test(t));
    const cands = this.pulsables().filter((n) => m(textoDe(n) || n.attrs['aria-label'] || n.attrs.title || ''));
    // El más específico: el de texto más corto que coincide.
    const n = cands.sort((a, b) => textoDe(a).length - textoDe(b).length)[0];
    if (!n) { if (!opcional) this.mundo.hallazgo('botón que no está', `«${patron}» no se ve en pantalla. Se ve: ${this.textoVisible().slice(0, 300)}`); return false; }
    this.mundo.clicar(n); await this.calma(); return true;
  }
  async menu(patron) {
    await this.pulsa(/⋯ (herramientas|tools)/);
    const m = this.mundo.menu, it = m?.items.find((i) => (typeof patron === 'string' ? i.titulo.includes(patron) : patron.test(i.titulo)));
    if (!it) { this.mundo.hallazgo('opción de menú que no está', String(patron)); return false; }
    this.mundo.menu = null; const r = it.alClic?.({}); if (r?.catch) r.catch((e) => this.mundo.error('menú ' + patron, e)); await this.calma(); return true;
  }
  async escribeEnBuscador(t) { const b = this.vista.contentEl.querySelector('input.mn-buscar'); b.value = t; for (const f of b.eventos.input || []) f({ target: b }); await this.calma(); }
  async tecla(k) { const b = this.mundo.foco || this.vista.contentEl.querySelector('input.mn-buscar'); for (const f of b.eventos.keydown || []) f({ key: k, target: b, preventDefault() {} }); await this.calma(); }
  // Tocar una nota del mapa: puntero abajo y arriba sobre el punto donde se dibuja.
  async toca(titulo) {
    const v = this.vista, n = v.N.find((x) => x.titulo === titulo || x.titulo.includes(titulo));
    if (!n) { this.mundo.hallazgo('nota que no está en el mapa', titulo); return false; }
    const x = n.x * v.vista.k + v.vista.x, y = n.y * v.vista.k + v.vista.y, ev = (type) => ({ type, pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, preventDefault() {} });
    for (const f of v.lienzo.eventos.pointerdown || []) f(ev('pointerdown'));
    for (const f of v.lienzo.eventos.pointerup || []) f(ev('pointerup'));
    await this.calma(); return true;
  }
  // La pantalla de ajustes como la ve la persona, después de que termine de cargar lo que carga sola.
  async verAjustes() {
    const t = this.pestanaAjustes, dibujar = () => { this.mundo.ajustesUI = []; t.containerEl = new Nodo('div', this.mundo); t.display(); };
    dibujar(); await this.calma(); dibujar(); await this.calma(); return this.mundo.ajustesUI;
  }
  fila(nombre) { return (this.mundo.ajustesUI || []).find((x) => x.nombre && (typeof nombre === 'string' ? x.nombre.includes(nombre) : nombre.test(x.nombre))); }
  // Pulsar un botón de una fila de ajustes, por su texto.
  async botonAjuste(nombre, texto) {
    const b = this.fila(nombre)?.campos.find((x) => x.tipo === 'boton' && x.alClic && (!texto || x.texto === texto));
    if (!b) { this.mundo.hallazgo('botón que no está', `${texto || '?'} en ajustes «${nombre}»`); return false; }
    await b.alClic(); await this.calma(); return true;
  }
  // Ajustes: la pantalla de ajustes se dibuja y se cambia un campo por el nombre de su fila.
  async ajuste(nombre, valor) {
    this.mundo.ajustesUI = []; const t = this.pestanaAjustes; t.containerEl = new Nodo('div', this.mundo); t.display();
    const s = this.mundo.ajustesUI.find((x) => x.nombre && (typeof nombre === 'string' ? x.nombre.includes(nombre) : nombre.test(x.nombre)));
    const c = s?.campos.find((x) => x.alCambiar);
    if (!c) { this.mundo.hallazgo('ajuste que no está', String(nombre)); return false; }
    await c.alCambiar(valor); await this.calma(); return true;
  }
}

module.exports = { Mundo, Nodo, textoDe, sha, DIA };
