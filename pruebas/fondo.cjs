/* 1.36 — fondo del mapa: noche (el de siempre), papel, o según el tema de Obsidian.
 *   node pruebas/fondo.cjs [ruta/main.js]
 */
const { cargarPlugin, pruebas } = require('./simulado.cjs');
const p = pruebas('fondo');
const { interno } = cargarPlugin(process.argv[2]);
const { VistaMapa, AJUSTES_BASE } = interno;

const vista = (fondoMapa, temaClaro) => ({ plugin: { ajustes: { fondoMapa } }, contentEl: { ownerDocument: { body: { classList: { contains: (c) => temaClaro && c === 'theme-light' } } } } });
const papel = (v) => VistaMapa.prototype.fondoEsPapel.call(v);

p.igual('por defecto el fondo es noche', AJUSTES_BASE.fondoMapa, 'noche');
p.igual('noche nunca es papel, ni con tema claro', papel(vista('noche', true)), false);
p.igual('papel siempre es papel', papel(vista('papel', false)), true);
p.igual('«según el tema» con Obsidian en claro es papel', papel(vista('tema', true)), true);
p.igual('«según el tema» con Obsidian en oscuro es noche', papel(vista('tema', false)), false);
p.igual('sin ajuste, noche', papel(vista(undefined, true)), false);
process.exit(p.cerrar() ? 1 : 0);
