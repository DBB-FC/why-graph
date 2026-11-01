/* 1.37 — «↻ al día 21:42»: el mapa dice a qué hora leyó el vault y se vuelve a leer con un toque.
 *   node pruebas/aldia.cjs [ruta/main.js]
 */
global.__idioma = 'es';
const { cargarPlugin, pruebas } = require('./simulado.cjs');
const p = pruebas('aldia');
const { interno } = cargarPlugin(process.argv[2]);
const { VistaMapa } = interno;

const texto = (d) => VistaMapa.prototype.textoAlDia.call({}, d);
p.igual('la hora va con dos dígitos', texto(new Date(2026, 9, 31, 9, 5)).hora, '09:05');
p.igual('el chip lleva la hora', texto(new Date(2026, 9, 31, 21, 42)).chip, '↻ al día 21:42');
p.igual('el título explica qué hace el toque', texto(new Date(2026, 9, 31, 21, 42)).titulo.startsWith('Mapa al día: 21:42.'), true);
p.igual('sin lectura todavía, guion', texto(undefined).hora, '—');

// pintarAlDia escribe el chip y su título; sin chip (vista sin abrir) no revienta.
const chip = { t: '', a: {}, setText(x) { this.t = x; }, setAttribute(k, v) { this.a[k] = v; } };
const v = { chipAlDia: chip, alDia: new Date(2026, 9, 31, 7, 30), textoAlDia: VistaMapa.prototype.textoAlDia };
VistaMapa.prototype.pintarAlDia.call(v);
p.igual('pintar pone el texto en el chip', chip.t, '↻ al día 07:30');
p.igual('pintar pone el título accesible', chip.a['aria-label'], chip.a.title);
p.igual('sin chip no hace nada', VistaMapa.prototype.pintarAlDia.call({ alDia: new Date() }), undefined);
// En inglés, el chip no muestra español.
global.__idioma = 'en';
const { interno: ingles } = cargarPlugin(process.argv[2]);
p.igual('en inglés: «up to date»', ingles.VistaMapa.prototype.textoAlDia.call({}, new Date(2026, 9, 31, 21, 42)).chip, '↻ up to date 21:42');
process.exit(p.cerrar() ? 1 : 0);
