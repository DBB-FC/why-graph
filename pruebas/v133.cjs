/* 1.33 — lo que encontró la auditoría forense del 25.09.2026 sobre el cerebro real.
 *
 * Cada bloque reproduce un fallo que pasó en el vault del autor y que las pruebas de antes no
 * veían: la ingesta perdía párrafos, el tope diario no limitaba, la cuota diaria de Gemini se
 * reintentaba, las carpetas de fuentes anidadas se contaban dos veces, un motivo con varios
 * enlaces no se reconocía, el buscador no mostraba nada y los pulsos se cortaban.
 *
 *   node pruebas/v133.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas, el, contexto2D } = require('./simulado.cjs');
const p = pruebas('v133');
const { Plugin, interno } = cargarPlugin(process.argv[2]);
const { construir, VistaMapa, AJUSTES_BASE, CLAVE_IA, carpetasFuentesDe, nodoFuenteDe, inventarioFuentes } = interno;

const ajustes = (extra) => Object.assign({}, AJUSTES_BASE, { configurado: true, capas: 'A|\nB|', carpetas: 'wiki = 1', carpetaCrudo: 'raw', carpetaWiki: 'wiki', proveedorIA: 'local', modeloIA: 'modelo-x', topeDiario: 30 }, extra);
async function plugin(notas, extra) {
  const v = vaultSimulado(notas);
  const pl = new Plugin(); pl.app = v.app; pl._datos = ajustes(extra); await pl.onload(); pl.esperasReintento = [0, 0, 0];
  return Object.assign(v, { pl, registro: () => JSON.parse(v.internos[pl.rutaRegistroIngesta()] || '{}') });
}
const respuesta = (obj) => ({ status: 200, json: { choices: [{ message: { content: JSON.stringify(obj) } }] } });

(async () => {
  // ── 1. Un archivo largo en varias piezas: lo que falló no queda como enviado ─────────────────
  {
    const texto = Array.from({ length: 60 }, (_, k) => `Párrafo ${k}: ` + 'dato importante sobre el cliente '.repeat(8)).join('\n\n');
    const { pl } = await plugin({ 'raw/largo.md': texto, 'wiki/a.md': 'x' });
    const m = await pl.prepararMaterial(pl.reunirCrudo());
    p.cierto('un archivo largo se parte en varias piezas', m.piezas.length >= 3);
    p.cierto('cada pieza lleva las huellas de sus propios párrafos', m.piezas.every((x) => x.hs.length > 0));
    m.piezas[0].ok = true;                                   // la 1 se leyó; las demás fallaron
    await pl.confirmarIngesta(m);
    const m2 = await pl.prepararMaterial(pl.reunirCrudo());
    const faltaban = m.piezas.slice(1).map((x) => x.texto.match(/Párrafo \d+:/g)).flat();
    const vuelven = m2.piezas.map((x) => x.texto).join('\n');
    p.igual('los párrafos de las piezas fallidas se vuelven a enviar', faltaban.filter((x) => !vuelven.includes(x)).length, 0);
    p.cierto('y los de la pieza que salió bien no se repiten', !vuelven.includes(m.piezas[0].texto.match(/Párrafo \d+:/)[0]));
  }

  // ── 2. Con fallos, el sello avanza hasta justo antes del archivo fallido más viejo ───────────
  {
    const ahora = Date.now();
    const v = await plugin({ 'raw/viejo.md': 'Material viejo que falló al leerse en la ingesta anterior.', 'raw/nuevo.md': 'Material nuevo que sí se leyó bien en la ingesta anterior.', 'wiki/a.md': 'x' });
    v.mtimes['raw/viejo.md'] = ahora - 6 * 864e5; v.mtimes['raw/nuevo.md'] = ahora - 864e5;
    const m = await v.pl.prepararMaterial(v.pl.reunirCrudo());
    m.piezas.forEach((x) => (x.ok = x.ruta === 'raw/nuevo.md'));
    await v.pl.confirmarIngesta(m);
    const sello = Date.parse(v.pl.ajustes.ultimaIngesta);
    p.cierto('con un fallo el sello igual avanza', sello > 0);
    p.cierto('pero no salta el archivo que falló', sello < v.mtimes['raw/viejo.md']);
    const real = Date.now; Date.now = () => real() + 10 * 864e5;   // pasan 10 días: la ventana de 7 ya no lo cubriría
    try { p.cierto('y lo fallido sigue pendiente aunque pasen 7 días', v.pl.reunirCrudo().some((f) => f.path === 'raw/viejo.md')); } finally { Date.now = real; }
  }

  // ── 3. El tope diario cuenta cada llamada real: los dos pasos y los reintentos ───────────────
  {
    const notas = { 'wiki/a.md': 'x', 'wiki/b.md': 'y' };
    for (let i = 0; i < 4; i++) notas[`raw/r${i}.md`] = `Material nuevo número ${i} con decisiones del proyecto. ` + 'x'.repeat(7000);
    const v = await plugin(notas, { autoIngesta: true, topeDiario: 3 });
    let llamadas = 0;
    global.__req = async (o) => {
      llamadas++;
      const u = JSON.parse(o.body).messages[1].content;
      if (!u.includes('<material')) return respuesta({ resultados: [] });
      const f = [...u.matchAll(/fuente="([^"]+)"/g)].map((x) => x[1]);
      return respuesta({ contradicciones: [], novedades: f.flatMap((r) => ['wiki/a.md', 'wiki/b.md'].map((d) => ({ texto: 'n ' + d, cita: 'Material nuevo número', fuente: r, destino: d, crear: false }))) });
    };
    const r = await v.pl.alAbrirObsidian();
    p.igual('con 4 tandas y tope 3 no arranca', r, 'tope');
    p.igual('y no llama a nadie', llamadas, 0);
    v.pl.ajustes.topeDiario = 4;
    await v.pl.alAbrirObsidian();
    p.cierto('con tope 4 las llamadas reales no pasan del tope (antes el paso 2 iba aparte)', llamadas <= 4);
    p.igual('el uso anotado es lo que de verdad se llamó', v.registro().uso?.llamadas, llamadas);
    global.__req = null;
  }

  // ── 4. La cuota diaria de Gemini: no se reintenta, se detiene y se dice por qué ──────────────
  {
    const notas = { 'wiki/a.md': 'x' };
    for (let i = 0; i < 5; i++) notas[`raw/r${i}.md`] = `Material ${i}. ` + 'y'.repeat(30000);
    const v = await plugin(notas, { proveedorIA: 'gemini', modeloIA: 'gemini-3.8-flash' });
    v.app._ls[CLAVE_IA('gemini')] = 'llave';
    let llamadas = 0;
    global.__req = async () => { llamadas++; return { status: 429, headers: {}, json: { error: { code: 429, message: 'You exceeded your current quota', details: [
      { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20', quotaDimensions: { model: 'gemini-3.8-flash' } }] },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '9s' }] } } }; };
    const m = await v.pl.prepararMaterial(v.pl.reunirCrudo());
    const st = await v.pl.buscarNovedades(m);
    const tandas = v.pl.armarTandas(m.piezas).length;
    p.cierto('hay varias tandas para mandar', tandas >= 3);
    p.cierto('la cuota diaria no se reintenta ni se insiste con las demás tandas', llamadas <= 3 && llamadas < tandas * 4);
    p.cierto('el aviso dice que es la cuota diaria y cuál es', /cuota diaria|daily quota/i.test(st.prop.fallos[0]?.error || '') && /20/.test(st.prop.fallos[0].error));
    p.cierto('el último error queda guardado en ingesta.json', /cuota diaria|daily quota/i.test(v.registro().ultimoError?.mensaje || ''));
    global.__req = null;
  }

  // ── 5. Gemini corta o bloquea: se dice eso, no «prueba con otro modelo» ──────────────────────
  {
    const v = await plugin({ 'wiki/a.md': 'x' }, { proveedorIA: 'gemini', modeloIA: 'g' });
    v.app._ls[CLAVE_IA('gemini')] = 'llave';
    global.__req = async () => ({ status: 200, json: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"novedades": [' }] } }] } });
    let error = ''; try { await v.pl.llamarIA('s', 'u', { type: 'object', properties: {} }); } catch (e) { error = e.message; }
    p.cierto('una respuesta cortada se dice como cortada', /cortada|cut short/i.test(error));
    global.__req = async () => ({ status: 200, json: { promptFeedback: { blockReason: 'SAFETY' } } });
    error = ''; try { await v.pl.llamarIA('s', 'u', { type: 'object', properties: {} }); } catch (e) { error = e.message; }
    p.cierto('un material bloqueado se dice como bloqueado', /SAFETY/.test(error));
    global.__req = null;
  }

  // ── 5b. OpenRouter: mismo protocolo que OpenAI, con sus particularidades ─────────────────────
  {
    const v = await plugin({ 'wiki/a.md': 'x' }, { proveedorIA: 'openrouter', modeloIA: 'google/gemini-3.1-flash-lite' });
    v.app._ls[CLAVE_IA('openrouter')] = 'llave-or';
    let visto = null;
    global.__req = async (o) => { visto = o; return respuesta({ ok: true }); };
    const r = await v.pl.llamarIA('s', 'u', { type: 'object', properties: { ok: { type: 'boolean' } } });
    const cuerpo = JSON.parse(visto.body);
    p.cierto('openrouter: va a su dirección con la llave como Bearer', visto.url.startsWith('https://openrouter.ai/api/v1/') && visto.headers.authorization === 'Bearer llave-or');
    p.cierto('openrouter: pide JSON con esquema y solo servidores que lo respeten', cuerpo.response_format?.type === 'json_schema' && cuerpo.provider?.require_parameters === true);
    p.igual('openrouter: devuelve el JSON', r, { ok: true });
    global.__req = async () => ({ status: 200, json: { error: { code: 502, message: 'upstream caído' } } });
    let error = ''; try { await v.pl.llamarIA('s', 'u', { type: 'object', properties: {} }); } catch (e) { error = e.message; }
    p.cierto('openrouter: un error dentro de un 200 se dice como error', /upstream caído/.test(error));
    let n = 0; global.__req = async () => { n++; return { status: 429, headers: { 'x-ratelimit-limit': '50' }, json: { error: { code: 429, message: 'Rate limit exceeded: free-models-per-day' } } }; };
    error = ''; try { await v.pl.pedirReintentando({ url: 'x' }, 'OpenRouter'); } catch (e) { error = e.message; }
    p.cierto('openrouter: el límite diario de los modelos gratis no se reintenta', n === 1 && /cuota diaria|daily quota/i.test(error) && /50/.test(error));
    global.__req = null;
  }

  // ── 6. Carpetas de fuentes anidadas: gana la más específica y nada se cuenta dos veces ───────
  {
    const C = carpetasFuentesDe({ carpetasFuentes: 'raw\nraw/articles\nraw/daily/*' });
    p.igual('una cita a un archivo del día se agrupa en su día', nodoFuenteDe('raw/daily/2026-09-20/claude.md', C)?.ruta, 'raw/daily/2026-09-20');
    p.igual('una cita a un artículo cae en su carpeta, con su nombre', nodoFuenteDe('raw/articles/a.md', C)?.titulo, 'a.md');
    const { app } = vaultSimulado({ 'raw/x.md': '', 'raw/articles/a.md': '', 'raw/daily/2026-09-20/c.md': '', 'raw/daily/2026-09-21/d.md': '' });
    p.igual('el inventario cuenta cada archivo una sola vez', inventarioFuentes(app, C).map((i) => i.ruta).sort(), ['raw/articles/a.md', 'raw/daily/2026-09-20', 'raw/daily/2026-09-21', 'raw/x.md']);
  }

  // ── 7. Motivos: varios enlaces en una línea, enlaces con ruta, ancla o mayúsculas ────────────
  {
    const notas = {
      'wiki/dia.md': 'Hoy.\n\n## Conexiones\n\n- [[alfa]] · [[beta]] · [[gama]] — lo ingerido del lote de cobertura\n- [[wiki/delta|Delta]] — el cliente que pidió el cambio\n',
      'wiki/alfa.md': 'a', 'wiki/beta.md': 'b', 'wiki/gama.md': 'c', 'wiki/delta.md': 'd',
      'wiki/epsilon.md': 'Trabajamos con [[Zeta#Historia|la gente de Zeta]] en el piloto.', 'wiki/zeta.md': 'z',
    };
    const { app } = vaultSimulado(notas);
    app.metadataCache.resolvedLinks['wiki/dia.md'] = { 'wiki/alfa.md': 1, 'wiki/beta.md': 1, 'wiki/gama.md': 1, 'wiki/delta.md': 1 };
    app.metadataCache.resolvedLinks['wiki/epsilon.md'] = { 'wiki/zeta.md': 1 };
    const D = await construir(app, ajustes({ capas: 'A|', carpetas: 'wiki = 0' }));
    const motivo = (a, b) => D.aristas.find((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a));
    p.cierto('un motivo para varias notas vale para cada una', ['alfa', 'beta', 'gama'].every((n) => motivo('wiki/dia.md', `wiki/${n}.md`)?.[2] === 'lo ingerido del lote de cobertura'));
    p.igual('un motivo escrito con ruta y alias se reconoce', motivo('wiki/dia.md', 'wiki/delta.md')?.[2], 'el cliente que pidió el cambio');
    p.cierto('la frase aparece aunque el enlace tenga mayúscula y ancla', /piloto/.test(motivo('wiki/epsilon.md', 'wiki/zeta.md')?.[3]?.texto || ''));
  }

  // ── 8. El buscador: palabras en cualquier orden, sin tildes, por alias y fuera del mapa ──────
  {
    const notas = {
      'wiki/segundo-cerebro.md': '---\ntitle: Segundo Cerebro\naliases:\n  - Mi wiki\n---\nx [[diseño]]',
      'wiki/diseño.md': '---\ntitle: Diseño de marca\n---\ny',
      'raw/articles/2026-09-20-crawl4ai-open-source.md': 'nadie lo cita',
      'index.md': 'raíz',
    };
    const { app } = vaultSimulado(notas);
    const v = new VistaMapa({}, { ajustes: ajustes({ capas: 'A|', carpetas: 'wiki = 0', carpetasFuentes: 'raw/articles', fuentes: 'demanda' }), tieneIA: () => false, app, recortesSueltos: () => [], ingestaLista: () => false });
    v.app = app; v.contentEl = el(); v.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) };
    v.ctx = v.lienzo.getContext(); v.marca = el(); v.chips = el(); v.estado = el(); v.panel = el(); v.guia = el();
    await v.recargar();
    p.igual('palabras en otro orden', v.buscarTodo('cerebro segundo')[0]?.id, 'wiki/segundo-cerebro.md');
    p.igual('con guion o sin tilde', v.buscarTodo('diseno-de')[0]?.id, 'wiki/diseño.md');
    p.igual('por alias del frontmatter', v.buscarTodo('mi wiki')[0]?.id, 'wiki/segundo-cerebro.md');
    p.igual('encuentra un archivo que no está en el mapa', v.buscarFuera('crawl4ai')[0]?.ruta, 'raw/articles/2026-09-20-crawl4ai-open-source.md');
    p.cierto('y una nota fuera de toda capa', v.buscarFuera('index').some((n) => n.ruta === 'index.md' && n.externo));
    p.igual('lo que está en el mapa no se repite como externo', v.buscarFuera('segundo').length, 0);
    v.filtro = 'CEREBRO segundo';
    p.cierto('el filtro del mapa usa la misma regla', v.visible(v.porId['wiki/segundo-cerebro.md']) && !v.visible(v.porId['wiki/diseño.md']));
  }

  // ── 9. Los pulsos: ninguno se corta a mitad de curva y nunca se quedan en cero ───────────────
  {
    // 45 notas en L0 y 40 en L1, bien conectadas: k resulta múltiplo de 7, el caso que antes apagaba turnos enteros.
    const notas = {};
    for (let i = 0; i < 45; i++) notas[`d/n${i}.md`] = Array.from({ length: 7 }, (_, j) => `[[m${(i * 3 + j) % 40}]]`).join(' ');
    for (let j = 0; j < 40; j++) notas[`e/m${j}.md`] = 'x';
    const { app } = vaultSimulado(notas);
    const v = new VistaMapa({}, { ajustes: ajustes({ capas: 'A|\nB|', carpetas: 'd = 0\ne = 1', animacion: true }), tieneIA: () => false, app, recortesSueltos: () => [], ingestaLista: () => false });
    v.app = app; v.contentEl = el(); v.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) };
    v.ctx = v.lienzo.getContext(); v.marca = el(); v.chips = el(); v.estado = el(); v.panel = el(); v.guia = el();
    await v.recargar(); v.medir();
    const ctx = { set globalCompositeOperation(x) {}, set fillStyle(x) {}, beginPath() {}, fill() {}, arc() {} };
    const medir = () => {
      let prev = null, cortes = 0, minimo = Infinity; const orig = v.puntoEn.bind(v);
      for (let t = 5000; t < 35000; t += 33) {
        const vivos = new Map(); v.tiempo = t;
        v.puntoEn = (A, B, u, r) => { vivos.set(A.id + '>' + B.id, u); return orig(A, B, u, r); };
        v.dibujarPulsos(ctx, 1, (x) => v.colorTema(x)); v.puntoEn = orig;
        if (prev) { for (const [k, u] of prev) if (!vivos.has(k) && u > 0.08 && u < 0.92) cortes++; for (const [k, u] of vivos) if (!prev.has(k) && u > 0.08 && u < 0.92) cortes++; }
        minimo = Math.min(minimo, vivos.size); prev = vivos;
      }
      return { cortes, minimo };
    };
    const a = medir();
    p.igual('mapa: ningún pulso nace o muere a mitad de su curva', a.cortes, 0);
    p.cierto('mapa: siempre hay pulsos en pantalla', a.minimo > 0);
    v.radial = true; v.foco = 'e/m0.md'; v.medir();
    const b = medir();
    p.igual('radial: ningún pulso se corta', b.cortes, 0);
    p.cierto('radial: siempre hay una onda en movimiento', b.minimo > 0);
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error("   ✕ se cortó: " + e.message); p.cerrar(); process.exit(1); });
