/* 1.36 — canario de ajustes: detecta que data.json se pisó desde fuera.
 *   node pruebas/canario.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('canario');
const { Plugin } = cargarPlugin(process.argv[2]);

(async () => {
  const mk = async (datos) => {
    const v = vaultSimulado({ 'a.md': 'x' }); const q = new Plugin(); q.app = v.app;
    let disco = datos; q.loadData = async () => (disco ? JSON.parse(JSON.stringify(disco)) : null); q.saveData = async (d) => { disco = JSON.parse(JSON.stringify(d)); };
    await q.onload(); return { q, leer: () => disco, poner: (d) => { disco = d; } };
  };

  { // usuario con data.json viejo (sin canario): se siembra sin falso aviso
    const { q, leer } = await mk({ capas: 'A | a' });
    p.cierto('siembra el canario en un data.json sin él', !!leer()._canario?.id);
    await q.guardar();
    p.cierto('y el primer guardado no avisa de nada', !(q.ajustes._pisados || []).length);
  }
  { // el archivo se reemplaza desde fuera (otra copia del plugin, edición a mano)
    const { q, leer, poner } = await mk(null);
    await q.guardar(); await q.guardar();
    p.cierto('guardar con el disco intacto no avisa', !(q.ajustes._pisados || []).length);
    const d = leer(); delete d._canario; d.capas = 'editado a mano'; poner(d);
    await q.guardar();
    p.igual('detecta un archivo sin token', (q.ajustes._pisados || []).map((x) => x.causa), ['sin-canario']);
    poner({ ...leer(), _canario: { id: 'ajeno', desde: 'x' } });
    await q.guardar();
    p.igual('detecta un token distinto', (q.ajustes._pisados || []).map((x) => x.causa), ['sin-canario', 'distinto']);
    p.cierto('guarda fecha del aviso', /^\d{4}-\d\d-\d\dT/.test(q.ajustes._pisados[0].en));
  }
  { // recargar a propósito acepta el disco
    const { q, leer, poner } = await mk(null);
    await q.guardar(); poner({ ...leer(), _canario: { id: 'otro', desde: 'x' }, capas: 'B | b' });
    await q.recargarAjustes(); await q.guardar();
    p.cierto('recargar ajustes no cuenta como pisado', !(q.ajustes._pisados || []).length && q.ajustes.capas === 'B | b');
  }
  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
