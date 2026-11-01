/* 1.37 — la fecha de una nota: un nombre que ES una fecha manda sobre `updated`.
 *   node pruebas/fecha.cjs [ruta/main.js]
 */
const { cargarPlugin, pruebas } = require('./simulado.cjs');
const p = pruebas('fecha');
const { interno } = cargarPlugin(process.argv[2]);
const { fechaDeNota } = interno;
const s = { propiedadFecha: 'updated' };
const f = (basename, mtime = 0) => ({ basename, stat: { mtime } });
const dia = (d) => Date.parse(d);

p.igual('un diario corregido hoy sigue en su día', fechaDeNota(f('2026-08-24'), { updated: '2026-10-31' }, s), dia('2026-08-24'));
p.igual('una página normal usa `updated`', fechaDeNota(f('kapa21'), { updated: '2026-10-31' }, s), dia('2026-10-31'));
p.igual('un nombre que solo CONTIENE una fecha sigue usando `updated`', fechaDeNota(f('2026-10-09-tool-schema'), { updated: '2026-10-28' }, s), dia('2026-10-28'));
p.igual('sin `updated`, la fecha del nombre', fechaDeNota(f('2026-10-09-tool-schema'), {}, s), dia('2026-10-09'));
p.igual('sin nada, la fecha del archivo', fechaDeNota(f('notas', 1234), {}, s), 1234);
p.igual('un nombre con forma de fecha imposible no rompe', fechaDeNota(f('2026-13-45'), { updated: '2026-10-31' }, s), dia('2026-10-31'));
process.exit(p.cerrar() ? 1 : 0);
