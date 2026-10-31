/* F2 — verbos en las conexiones: «- [[nota]] — **verbo** · motivo», sin romper las líneas de siempre.
 *   node pruebas/verbos.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas, el, contexto2D } = require('./simulado.cjs');
const p = pruebas('verbos');
const { Plugin, interno } = cargarPlugin(process.argv[2]);
const { construir, VistaMapa, AJUSTES_BASE, VERBOS, VERBOS_ES, partirMotivo, lineaMotivo, ponerVerboEnTexto, verboEnLista } = interno;

if (!partirMotivo) { console.log('verbos: esta versión no tiene verbos'); p.cierto('existe partirMotivo', false); process.exit(p.cerrar() ? 1 : 0); }

const AJ = { ...AJUSTES_BASE, capas: 'Notas | todas', carpetas: '', configurado: true };
const NOTAS = {
  'a.md': '# A\n\nEl hotel compra café a [[b]], usa el [[c]], adora a [[d]] y mira [[e]], [[f]] y [[g]].\n\n## Conexiones\n\n- [[b]] — motivo de siempre, sin verbo\n- [[c]] — **usa** · el sistema de ventas del hotel\n- [[d]] — **adora a** · un verbo que no está en la lista\n- [[e]] · [[f]] — dos notas con un solo motivo\n- [[g]] — **clave** para todo lo demás\n',
  'b.md': '# B\n\nLa tostaduría.\n', 'c.md': '# C\n\nEl CRM.\n', 'd.md': '# D\n\nOtra.\n', 'e.md': '# E\n\nUna.\n', 'f.md': '# F\n\nDos.\n', 'g.md': '# G\n\nTres.\n',
};

(async () => {
  // ── 1. La lista y el parseo, sin vault ─────────────────────────────────────────────────────────
  p.igual('la lista tiene los 20 verbos y el de reserva', VERBOS_ES.length, 21);
  p.cierto('cada verbo tiene su traducción al inglés', VERBOS.every(([es, en]) => es && en && es !== en));
  p.cierto('«se relaciona con» es el de reserva', VERBOS_ES[VERBOS_ES.length - 1] === 'se relaciona con');
  p.igual('una línea sin verbo queda igual que siempre', partirMotivo('motivo de siempre'), { verbo: '', motivo: 'motivo de siempre' });
  p.igual('verbo y motivo', partirMotivo('**es cliente de** · compra cada semana'), { verbo: 'es cliente de', motivo: 'compra cada semana' });
  p.igual('solo verbo', partirMotivo('**usa**'), { verbo: 'usa', motivo: '' });
  p.igual('una negrita que es parte del motivo no es verbo', partirMotivo('**clave** para todo'), { verbo: '', motivo: '**clave** para todo' });
  p.cierto('un verbo fuera de la lista se lee igual, pero no está en la lista', partirMotivo('**adora a** · x').verbo === 'adora a' && !verboEnLista('adora a'));
  p.cierto('mayúsculas y espacios no sacan un verbo de la lista', verboEnLista('  Es Cliente  de '));

  // ── 2. Escritura del formato nuevo ─────────────────────────────────────────────────────────────
  p.igual('con verbo, el formato nuevo', lineaMotivo('crm', 'el sistema de ventas.', 'usa'), '- [[crm]] — **usa** · el sistema de ventas');
  p.igual('sin verbo, el formato de siempre', lineaMotivo('crm', 'el sistema de ventas', ''), '- [[crm]] — el sistema de ventas');
  const t = '# A\n\n## Conexiones\n\n- [[b]] — motivo de siempre\n- [[e]] · [[f]] — dos\n';
  p.igual('poner el verbo a una línea existente cambia solo esa línea', ponerVerboEnTexto(t, 'b.md', 'es cliente de'), '# A\n\n## Conexiones\n\n- [[b]] — **es cliente de** · motivo de siempre\n- [[e]] · [[f]] — dos\n');
  p.igual('una línea de varias notas no se toca', ponerVerboEnTexto(t, 'e', 'usa'), null);
  p.igual('una línea que ya tiene verbo no se toca', ponerVerboEnTexto('- [[b]] — **usa** · x', 'b', 'mide'), null);

  // ── 3. El grafo: lo de siempre sigue igual y el verbo viaja con su sentido ─────────────────────
  const v = vaultSimulado({ ...NOTAS });
  const D = await construir(v.app, AJ);
  const arista = (x, y) => D.aristas.find(([a, b]) => (a === x && b === y) || (a === y && b === x));
  p.igual('la línea sin verbo da el mismo motivo que antes', arista('a.md', 'b.md')[2], 'motivo de siempre, sin verbo');
  p.cierto('y sin verbo', !arista('a.md', 'b.md')[5].verbo);
  p.igual('la línea con verbo da el motivo limpio', arista('a.md', 'c.md')[2], 'el sistema de ventas del hotel');
  p.igual('y el verbo, con la nota que lo escribió', [arista('a.md', 'c.md')[5].verbo, arista('a.md', 'c.md')[5].de], ['usa', 'a.md']);
  p.igual('«- [[a]] · [[b]] — motivo» sigue valiendo para cada nota', [arista('a.md', 'e.md')[2], arista('a.md', 'f.md')[2]], ['dos notas con un solo motivo', 'dos notas con un solo motivo']);
  p.igual('una negrita del motivo queda en el motivo', arista('a.md', 'g.md')[2], '**clave** para todo lo demás');
  const A = D.nodos.find((n) => n.id === 'a.md');
  p.igual('el verbo fuera de la lista queda anotado en las dos notas', [A.verbosFuera, D.nodos.find((n) => n.id === 'd.md').verbosFuera], [['adora a'], ['adora a']]);
  p.igual('nada queda sin motivo por tener verbo', A.sinMotivo, 0);

  // ── 4. El modo salud marca el verbo fuera de la lista; nada se rompe al dibujar ────────────────
  const vista = new VistaMapa({}, { ajustes: AJ, tieneIA: () => false, app: v.app, manifest: { version: 'x' } });
  vista.app = v.app; vista.contentEl = el(); vista.lienzo = { style: {}, getContext: () => contexto2D(), getBoundingClientRect: () => ({ width: 1400, height: 900, top: 0, left: 0 }) };
  vista.ctx = vista.lienzo.getContext(); vista.marca = el(); vista.chips = el(); vista.estado = el(); vista.panel = el(); vista.guia = el(); vista.resultados = el();
  await vista.recargar();
  p.cierto('salud: «verbo fuera de la lista» en la nota', vista.problemas(vista.porId['a.md']).some((x) => /verb not on the list: «adora a»/.test(x)));
  p.cierto('salud: las notas con verbos de la lista no se marcan', !vista.problemas(vista.porId['c.md']).some((x) => /verb not on the list/.test(x)));
  p.igual('el verbo se lee traducido en la interfaz en inglés', vista.verboVisible('a.md', 'c.md'), 'uses');
  vista.medir(); vista.foco = 'a.md';
  let err = null; try { vista.dibujar(); } catch (e) { err = e.message; }
  p.igual('dibujar con una nota tocada (etiquetas de verbo) no revienta', err, null);
  vista.foco = null; vista.salud = true; err = null;
  try { vista.dibujar(); vista.abrirPanel(vista.porId['a.md']); vista.informeSalud(); } catch (e) { err = e.message; }
  p.igual('panel e informe de salud con verbos no revientan', err, null);

  // ── 5. «Proponer motivo» propone el verbo, solo de la lista, y se escribe con el formato nuevo ──
  {
    const w = vaultSimulado({ 'x.md': 'La Ferretería Andes compra herramientas cada mes en Santiago.', 'y.md': 'El proveedor entrega herramientas a la Ferretería Andes cada mes.' });
    const q = new Plugin(); q.app = w.app; await q.onload(); q.ajustes.dobleVerificacion = false;
    let pedido = '', esquema = null, verbo = 'es cliente de';
    q.llamarIA = async (s, u, e) => { pedido = u; esquema = e; return { suficiente: true, verbo, motivo: 'la ferretería compra herramientas al proveedor cada mes', cita_origen: 'La Ferretería Andes compra herramientas cada mes', cita_destino: 'El proveedor entrega herramientas a la Ferretería Andes' }; };
    const fr = { origen: 'x.md', destino: 'y.md', linea: 0, nuevo: true };
    let res = await q.sugerir(fr);
    p.cierto('el pedido trae la lista de verbos', VERBOS_ES.every((x) => pedido.includes('«' + x + '»')));
    p.cierto('el esquema solo deja elegir de la lista', JSON.stringify(esquema.properties.verbo.enum) === JSON.stringify(VERBOS_ES));
    p.igual('el verbo propuesto queda en la respuesta', res.verbo, 'es cliente de');
    await q.aprobar(fr, res);
    p.cierto('aprobar escribe «- [[y]] — **es cliente de** · motivo»', /^- \[\[y\]\] — \*\*es cliente de\*\* · la ferretería compra herramientas al proveedor cada mes$/m.test(w.notas['x.md']));
    verbo = 'ama a'; res = await q.sugerir(fr);
    p.igual('un verbo inventado por la IA se cambia por el de reserva', res.verbo, 'se relaciona con');
    verbo = undefined; res = await q.sugerir(fr);
    p.igual('sin verbo en la respuesta, el de reserva', res.verbo, 'se relaciona con');
  }

  // ── 6. Etiquetar lo existente: cola sin escribir, tope diario, aprobar y descartar ────────────
  {
    const notas = { 'a.md': '# A\n\n## Conexiones\n\n' };
    for (let i = 0; i < 25; i++) { notas[`n${i}.md`] = `# N${i}\n`; notas['a.md'] += `- [[n${i}]] — el hotel le compra café ${i}\n`; }
    const w = vaultSimulado(notas);
    const q = new Plugin(); q.app = w.app; await q.onload();
    const vista2 = new VistaMapa({}, q); vista2.app = w.app; vista2.contentEl = el(); vista2.lienzo = el(); vista2.lienzo.getContext = () => contexto2D();
    vista2.ctx = vista2.lienzo.getContext(); vista2.marca = el(); vista2.chips = el(); vista2.estado = el(); vista2.panel = el(); vista2.guia = el(); vista2.resultados = el();
    q.ajustes.capas = 'Notas | todas'; q.ajustes.carpetas = '';
    await vista2.recargar();
    const { conexiones } = vista2.conexionesSinVerbo();
    p.igual('las 25 conexiones con motivo y sin verbo se ofrecen para etiquetar', conexiones.length, 25);
    let llamadas = 0, pedido = '';
    q.llamarIA = async (s, u) => { llamadas++; q.llamadasHechas = (q.llamadasHechas || 0) + 1; pedido = u; return { verbos: [...u.matchAll(/^(v\d+):/gm)].map((m, i) => ({ id: m[1], verbo: i === 0 ? 'inventado' : 'es cliente de' })) }; };
    q.ajustes.topeDiario = 1;
    const antes = w.escrituras.length;
    const st = await q.prepararVerbos(conexiones);
    const prep = await q.motivosPreparados();
    p.igual('con tope 1, una sola llamada (tanda de 20) y se detiene', [llamadas, st.hechas, st.tope], [1, 20, true]);
    p.cierto('a la IA solo van los nombres y el motivo, no el texto de las notas', /A = a · B = n0 · motivo: el hotel le compra café 0/.test(pedido) && !/# N0/.test(pedido));
    p.cierto('lo propuesto queda en la cola de motivos', prep['verbo:a.md|n1.md']?.res.verbo === 'es cliente de');
    p.igual('un verbo inventado queda como «se relaciona con»', prep['verbo:a.md|n0.md'].res.verbo, 'se relaciona con');
    p.igual('preparar no escribe nada en las notas', w.escrituras.slice(antes).filter(([, r]) => !/aprobaciones/.test(r)).length, 0);
    p.cierto('ni toca la nota', !/\*\*/.test(w.notas['a.md']));
    q.ajustes.topeDiario = 30; llamadas = 0;
    const st2 = await q.prepararVerbos(conexiones);
    p.igual('al seguir, solo paga las 5 que faltan', [llamadas, st2.hechas], [1, 5]);
    await q.aprobarVerbo('verbo:a.md|n1.md', prep['verbo:a.md|n1.md']);
    p.cierto('aprobar escribe el verbo en esa línea', /^- \[\[n1\]\] — \*\*es cliente de\*\* · el hotel le compra café 1$/m.test(w.notas['a.md']));
    p.cierto('y solo en esa', (w.notas['a.md'].match(/\*\*/g) || []).length === 2);
    p.cierto('y sale de la cola', !(await q.motivosPreparados())['verbo:a.md|n1.md']);
    let msg = ''; const n = w.escrituras.length;
    try { await q.aprobarVerbo('verbo:a.md|n1.md', prep['verbo:a.md|n1.md']); } catch (e) { msg = e.message; }
    p.cierto('aprobar de nuevo una línea que ya tiene verbo no escribe y lo dice', /nothing was written/.test(msg) && w.escrituras.length === n);
    await q.descartarVerbo('verbo:a.md|n2.md', prep['verbo:a.md|n2.md']);
    llamadas = 0; await q.prepararVerbos(conexiones.filter((c) => c.destino !== 'n1.md'));   // n1 ya tiene verbo: el panel la saca
    p.igual('lo descartado no se vuelve a pagar', llamadas, 0);
    p.cierto('y descartar no escribe', !/\[\[n2\]\] — \*\*/.test(w.notas['a.md']));
  }

  // ── 7. El verbo se ve en el lienzo al tocar una nota, también en enlaces cortos ───────────────
  // El vault del mirador con un verbo en cada línea de Conexiones. En un enlace corto el medio de la curva cae bajo
  // el rótulo de la nota: antes se veían 0 de 2 verbos en Hotel. Se cuentan los fillText de verbos dibujados.
  {
    const mir = require('./mirador/vault.json');
    const notas = {}; for (const [r, t] of Object.entries(mir.notas)) notas[r] = t.replace(/^(- \[\[[^\]]+\]\] — )(?!\*\*)/gm, '$1**usa** · ');
    const w = vaultSimulado(notas), aj = { ...AJUSTES_BASE, ...mir.ajustes, fuentes: 'no', animacion: false };
    const vm = new VistaMapa({}, { ajustes: aj, tieneIA: () => false, app: w.app, manifest: { version: 'x' } });
    vm.app = w.app; vm.contentEl = { ...el(), getBoundingClientRect: () => ({ width: 1440, height: 860, top: 0, left: 0 }) };
    vm.lienzo = el(); vm.marca = el(); vm.chips = el(); vm.estado = el(); vm.guia = el(); vm.resultados = el();
    // Con el panel abierto, como al tocar una nota en el escritorio.
    vm.panel = { ...el(), hasClass: (c) => c === 'abierto', getBoundingClientRect: () => ({ width: 380, height: 700, top: 92, left: 1048 }) };
    await vm.recargar(); vm.medir();
    let vistos = 0, esperados = 0; const detalle = [];
    for (const titulo of ['Hotel Andino', 'Cómo compramos grano verde', 'Logística de despachos', 'Perfil de tueste', 'Proyecto — Tostadora']) {
      const n = vm.N.find((x) => x.titulo.startsWith(titulo)); if (!n) { detalle.push(titulo + ': no está'); continue; }
      const conVerbo = vm.E.filter((e) => (e.a === n.id || e.b === n.id) && vm.verboVisible(e.a, e.b) && vm.visible(vm.porId[e.a]) && vm.visible(vm.porId[e.b])).length;
      vm.foco = n.id;
      const ctx = contexto2D(), textos = []; const ft = ctx.fillText; ctx.fillText = (t, ...a) => { textos.push(t); return ft(t, ...a); };
      vm.dibujarEscena(ctx, true);
      const n2 = textos.filter((t) => t === 'uses').length;
      vistos += Math.min(n2, conVerbo); esperados += conVerbo; detalle.push(`${titulo} ${n2}/${conVerbo}`);
    }
    vm.foco = null;
    console.log(`   · verbos en el lienzo: ${detalle.join(" · ")}`); p.cierto(`al tocar una nota se ven al menos el 80 % de sus verbos (${detalle.join(' · ')})`, esperados > 0 && vistos / esperados >= 0.8);
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.stack); p.cerrar(); process.exit(1); });
