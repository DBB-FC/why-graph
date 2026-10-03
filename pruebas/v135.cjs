/* 1.35 — voto en la segunda revisión, revisión con perspectiva y mapa por parecido.
 *   node pruebas/v135.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('v135');
const { Plugin, interno } = cargarPlugin(process.argv[2]);
const { tsne, distanciasTfidf, indiceTfidf, candidatasPerspectiva } = interno;

(async () => {
  // ── 1. Voto: dos de tres revisores aprueban lo que el primero rechazó ──────────────────────
  {
    const mk = async (voto, veredictos) => {
      const v = vaultSimulado({ 'a.md': 'La tostadora nueva llega en octubre para el hotel.', 'b.md': 'El hotel pide más café desde octubre.' });
      const q = new Plugin(); q.app = v.app; await q.onload();
      let revisiones = 0;
      q.llamarIA = async (s) => {
        if (/revisor escéptico/.test(s)) { const r = veredictos[revisiones++]; return { fiel: r, problema: r ? '' : 'matiz' }; }
        return { suficiente: true, motivo: 'El hotel necesita más café cuando llegue la tostadora', cita_origen: 'La tostadora nueva llega en octubre', cita_destino: 'El hotel pide más café desde octubre' };
      };
      q.ajustes.dobleVerificacion = true; q.ajustes.votoRevision = voto;
      const res = await q.sugerir({ origen: 'a.md', destino: 'b.md', linea: 0, nuevo: true });
      return { res, revisiones };
    };
    let r = await mk(false, [false, true, true]);
    p.cierto('sin voto, un «infiel» bloquea y no llama más revisores', r.res.aprobable === false && r.revisiones === 1);
    r = await mk(true, [false, true, true]);
    p.cierto('con voto, 2 de 3 «fiel» aprueban y lo dicen', r.res.aprobable === true && r.revisiones === 3 && r.res.revision.votos.fieles === 2);
    r = await mk(true, [false, false, true]);
    p.cierto('con voto, 1 de 3 «fiel» sigue bloqueado', r.res.aprobable === false && r.res.revision.votos.total === 3);
    r = await mk(true, [true]);
    p.cierto('con voto, si el primero aprueba no se gasta nada extra', r.res.aprobable === true && r.revisiones === 1);
  }

  // ── 2. Perspectiva: nota vieja con vecinas más nuevas ─────────────────────────────────────────
  {
    const DIA = 86400000, ahora = Date.parse('2026-10-03'), f = (d) => ahora - d * DIA;
    const nodos = [
      { id: 'v', propio: true, ruta: 'v.md', fecha: f(200) },
      { id: 'n', propio: true, ruta: 'n.md', fecha: f(20) },
      { id: 'r', propio: true, ruta: 'r.md', fecha: f(10) },
      { id: 'c', propio: true, ruta: 'c.md', fecha: f(150) },
    ];
    const porId = Object.fromEntries(nodos.map((n) => [n.id, n])), ady = { v: ['n'], n: ['v'], r: [], c: [] };
    let l = candidatasPerspectiva(nodos, ady, porId, {}, ahora);
    p.cierto('solo sale la nota vieja que tiene una vecina más nueva', l.length === 1 && l[0].nota.id === 'v' && l[0].nuevas[0].id === 'n');
    l = candidatasPerspectiva(nodos, ady, porId, { 'v.md': f(30) }, ahora);
    p.cierto('«sigue vigente» la oculta 180 días', l.length === 0);
    l = candidatasPerspectiva(nodos, ady, porId, { 'v.md': f(200) }, ahora);
    p.cierto('y vuelve cuando pasa ese plazo', l.length === 1);
  }

  // ── 3. t-SNE: dos temas separados quedan en dos grupos ─────────────────────────────────────────
  {
    const docs = [];
    for (let i = 0; i < 12; i++) docs.push({ ruta: `c${i}.md`, texto: `café tostadora molino espresso barista grano ${i % 3 ? 'crema' : 'taza'} cafetería${i}` });
    for (let i = 0; i < 12; i++) docs.push({ ruta: `s${i}.md`, texto: `firewall servidor cifrado contraseña token red ${i % 3 ? 'puerto' : 'acceso'} auditoría${i}` });
    const rutas = docs.map((d) => d.ruta), ix = indiceTfidf(docs), pts = tsne(distanciasTfidf(ix, rutas), docs.length);
    const media = (a) => [a.reduce((s, q) => s + q[0], 0) / a.length, a.reduce((s, q) => s + q[1], 0) / a.length];
    const A = pts.slice(0, 12), B = pts.slice(12), ma = media(A), mb = media(B), d = (u, w) => Math.hypot(u[0] - w[0], u[1] - w[1]);
    const dentro = (G, m) => G.reduce((s, q) => s + d(q, m), 0) / G.length;
    p.cierto('los dos grupos quedan más lejos entre sí que lo que miden por dentro', d(ma, mb) > 2 * Math.max(dentro(A, ma), dentro(B, mb)));
    p.cierto('es determinista', JSON.stringify(pts) === JSON.stringify(tsne(distanciasTfidf(ix, rutas), docs.length)));
    p.cierto('con pocos puntos no se rompe', tsne(new Float64Array(4), 2).length === 2);
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
