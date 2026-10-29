/* 1.36 — el enlace bajo el mouse: acierta, respeta la tolerancia y no pesa con miles de enlaces.
 *   node pruebas/enlace-mouse.cjs [ruta/main.js]
 */
const { cargarPlugin, pruebas } = require('./simulado.cjs');
const p = pruebas('enlace-mouse');
const { interno } = cargarPlugin(process.argv[2]);
const { VistaMapa } = interno;
const aristaEn = (v, x, y) => VistaMapa.prototype.aristaEn.call(v, x, y);

const A = { id: 'a', x: 100, y: 100, capa: 0 }, B = { id: 'b', x: 400, y: 300, capa: 1 };
const v = { vista: { x: 0, y: 0, k: 1 }, golpes: [[A, B]] };
p.cierto('encuentra el enlace en su punto medio', aristaEn(v, 250, 200)?.[0] === A);
p.cierto('a 3 px del trazo todavía cuenta', aristaEn(v, 253, 203) !== null);
p.igual('lejos del trazo no hay nada', aristaEn(v, 250, 260), null);
v.vista = { x: 50, y: -20, k: 2 };
p.cierto('con zoom y desplazamiento sigue acertando (la tolerancia es en píxeles de pantalla)', aristaEn(v, 250 * 2 + 50, 200 * 2 - 20)?.[1] === B);
p.igual('y la tolerancia no crece con el zoom', aristaEn(v, 250 * 2 + 50 + 12, 200 * 2 - 20 + 12), null);
const C = { id: 'c', x: 100, y: 100, capa: 0 }, D = { id: 'd', x: 100, y: 300, capa: 0 };
{ // misma capa: la curva sale hacia la derecha con dx = 26 + |Δy|·0.12 y su punto medio es (x + 0.75·dx, y medio)
  const dx = 26 + 200 * 0.12, medio = { x: 100 + 0.75 * dx, y: 200 };
  p.cierto('también enlaces dentro de una misma capa (curva lateral)', aristaEn({ vista: { x: 0, y: 0, k: 1 }, golpes: [[C, D]] }, medio.x, medio.y)?.[0] === C);
}

// Rendimiento: 3000 enlaces, 2000 movimientos del mouse.
const nodos = Array.from({ length: 1500 }, (_, i) => ({ id: 'n' + i, x: (i % 4) * 400, y: Math.floor(i / 4) * 12, capa: i % 4 }));
const golpes = Array.from({ length: 3000 }, (_, i) => [nodos[(i * 7) % 1500], nodos[(i * 13 + 1) % 1500]]);
const grande = { vista: { x: 0, y: 0, k: 1 }, golpes };
const t0 = process.hrtime.bigint();
for (let i = 0; i < 2000; i++) aristaEn(grande, (i * 37) % 1600, (i * 53) % 4500);
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 2000;
p.cierto(`con 3000 enlaces cada movimiento cuesta menos de 4 ms (${ms.toFixed(2)} ms)`, ms < 4);
console.log(`   · ${ms.toFixed(3)} ms por movimiento con 3000 enlaces`);
process.exit(p.cerrar() ? 1 : 0);
