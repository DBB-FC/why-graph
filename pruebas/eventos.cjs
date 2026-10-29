/* 1.36 — diario de propuestas como eventos (eventos.jsonl): solo huellas y palabras fijas.
 *   node pruebas/eventos.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('eventos');
const { Plugin } = cargarPlugin(process.argv[2]);

(async () => {
  const v = vaultSimulado({ 'a.md': 'La tostadora nueva llega en octubre para el hotel.', 'b.md': 'El hotel pide más café desde octubre.' });
  const q = new Plugin(); q.app = v.app; await q.onload();
  const ruta = '.obsidian/plugins/mapa-neuronal/eventos.jsonl';
  const leer = async () => ((await v.app.vault.adapter.exists(ruta)) ? (await v.app.vault.adapter.read(ruta)).trim().split('\n').map((l) => JSON.parse(l)) : []);
  const fr = { clave: 'a|b', origen: 'a.md', destino: 'b.md', linea: 0 };
  const motivo = 'El hotel necesita café cuando llegue la tostadora';

  await q.evento('shown', fr, { modelo: 'm', aprobable: true });
  await q.aprobar(fr, { motivo, cita_origen: { texto: 'x' }, cita_destino: { texto: 'y' }, modelo: 'm' });
  await q.aprobar(fr, { motivo: 'lo escribí yo', manual: true });
  await q.registrarDescarte(fr, { motivo, cita_origen: { ok: false }, cita_destino: { ok: true } }, 'candados');
  await q.registrarDescarte(fr, { motivo, revision: { fiel: false } }, 'candados');
  await q.registrarDescarte(fr, { motivo }, 'persona');
  const ev = await leer();

  p.igual('registra shown, accepted, modified y tres rejected, en orden', ev.map((e) => e.tipo), ['shown', 'accepted', 'modified', 'rejected', 'rejected', 'rejected']);
  p.igual('las causas son palabras fijas', ev.filter((e) => e.tipo === 'rejected').map((e) => e.causa), ['cita', 'revision', 'persona']);
  p.cierto('todas llevan fecha y la misma huella de par', ev.every((e) => /^\d{4}-/.test(e.t) && e.par === ev[0].par && /^p/.test(e.par)));
  const crudo = JSON.stringify(ev);
  p.cierto('nunca guarda texto de las notas, el motivo ni rutas', !crudo.includes('hotel') && !crudo.includes('lo escribí') && !crudo.includes('a.md'));
  p.cierto('un fallo al escribir no rompe la acción', await (async () => { v.app.vault.adapter.write = async () => { throw new Error('disco'); }; v.app.vault.adapter.exists = async () => { throw new Error('x'); }; try { await q.evento('shown', fr, {}); return true; } catch { return false; } })());
  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
