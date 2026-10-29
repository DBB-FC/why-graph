/* 1.36 — cola de motivos: la IA prepara los vínculos por revisar y la persona solo decide.
 *   node pruebas/v136.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('v136');
const { Plugin } = cargarPlugin(process.argv[2]);

const TEXTO = {
  'a.md': 'La tostadora nueva llega en octubre para el hotel.', 'b.md': 'El hotel pide más café desde octubre.',
  'c.md': 'El molino se calibra cada semana en la cafetería.', 'd.md': 'La cafetería compra grano cada semana.',
};
const buena = { suficiente: true, motivo: 'El hotel necesita café cuando llegue la tostadora', cita_origen: 'La tostadora nueva llega en octubre', cita_destino: 'El hotel pide más café desde octubre' };
const par = (clave, origen, destino) => ({ clave, origen, destino });

(async () => {
  const mk = async () => {
    const v = vaultSimulado(TEXTO); const q = new Plugin(); q.app = v.app; await q.onload(); return q;
  };

  // ── 1. Prepara, guarda y no vuelve a pagar lo ya preparado ────────────────────────────────────
  {
    const q = await mk(); let llamadas = 0;
    q.llamarIA = async (sis) => { llamadas++; return /revisor escéptico/.test(sis) ? { fiel: true, problema: '' } : buena; };
    const pares = [par('a|b', 'a.md', 'b.md')];
    const st = await q.prepararMotivos(pares);
    const m = await q.motivosPreparados();
    p.cierto('prepara el par y lo deja guardado con su motivo', st.hechas === 1 && m['a|b']?.res?.motivo === buena.motivo && m['a|b'].res.aprobable === true);
    const antes = llamadas;
    const st2 = await q.prepararMotivos(pares);
    p.cierto('una segunda corrida no paga lo ya preparado', llamadas === antes && st2.n === 0);
    await q.quitarMotivoPreparado('a|b');
    p.cierto('al resolver un par se quita de lo preparado', !(await q.motivosPreparados())['a|b']);
  }

  // ── 2. Un error fatal detiene la cola y conserva lo hecho ─────────────────────────────────────
  {
    const q = await mk(); let n = 0;
    q.llamarIA = async (sis) => { if (/revisor escéptico/.test(sis)) return { fiel: true, problema: '' }; n++; if (n > 1) throw Object.assign(new Error('identity verification is required'), { fatal: true }); return buena; };
    const st = await q.prepararMotivos([par('a|b', 'a.md', 'b.md'), par('c|d', 'c.md', 'd.md')]);
    const m = await q.motivosPreparados();
    p.cierto('se detiene en el error fatal y lo dice', st.error && /identity/.test(st.error) && st.hechas === 1);
    p.cierto('lo preparado antes del error queda guardado', !!m['a|b'] && !m['c|d']);
    p.cierto('la cola queda libre para continuar después', q.cola === null);
  }

  // ── 3. Detener a mitad conserva lo hecho ─────────────────────────────────────────────────────
  {
    const q = await mk(); q.llamarIA = async (sis) => (/revisor escéptico/.test(sis) ? { fiel: true, problema: '' } : buena);
    const st = await q.prepararMotivos([par('a|b', 'a.md', 'b.md'), par('c|d', 'c.md', 'd.md')], (_c, _d, s) => { s.detenida = true; });
    p.cierto('«Detener» corta después del par en curso', st.hechas === 1 && Object.keys(await q.motivosPreparados()).length === 1);
  }

  // ── 4. Un motivo que no pasa los candados se prepara como no aprobable, sin duplicar el registro ──
  {
    const q = await mk(); let desc = 0;
    q.llamarIA = async () => ({ suficiente: true, motivo: 'x', cita_origen: 'frase inventada', cita_destino: 'otra inventada' });
    const orig = q.registrarDescarte.bind(q); q.registrarDescarte = async (...a) => { desc++; return orig(...a); };
    await q.prepararMotivos([par('a|b', 'a.md', 'b.md')]);
    const m = await q.motivosPreparados();
    p.cierto('lo que no pasa los candados queda como no aprobable', m['a|b'].res.aprobable === false);
    p.cierto('y el descarte se registra una sola vez', desc === 1 && m['a|b'].res.registrado === true);
  }

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
