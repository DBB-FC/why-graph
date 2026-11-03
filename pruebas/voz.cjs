/* 1.39 — notas de voz de Quick Capture y citas con resaltado de color.
 *   node pruebas/voz.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const { interno } = cargarPlugin(process.argv[2]);
const { citaEnTexto, fuenteDeClip, audioDeClip, inventarioFuentes } = interno;
const p = pruebas('voz');

// ── 1. Citas: el resaltado es formato, igual que la negrita ─────────────────────────────────────
const NOTA = 'Ayer ==🔴el cliente aprobó el plazo== de entrega y ==🟢 pagó la factura== completa.';
p.cierto('cita dentro de un resaltado de color', citaEnTexto('el cliente aprobó el plazo', NOTA));
p.cierto('cita que cruza un resaltado de color', citaEnTexto('Ayer el cliente aprobó el plazo de entrega', NOTA));
p.cierto('cita que cruza un color con espacio tras el emoji', citaEnTexto('entrega y pagó la factura completa', NOTA));
p.cierto('cita que cruza un resaltado sin color', citaEnTexto('el plazo vence hoy mismo', 'el ==plazo vence== hoy mismo'));
p.cierto('una cita inventada sigue sin pasar', !citaEnTexto('el cliente rechazó el plazo', NOTA));
p.cierto('quitar las marcas no pega las palabras', !citaEnTexto('plazode entrega', NOTA));

// ── 2. De dónde vino: una propiedad basta si no se guardó el audio ──────────────────────────────
p.cierto('source: voz se reconoce', /^(voz|voice)$/.test(fuenteDeClip({ source: 'voz' })));
p.cierto('source: voice se reconoce', /^(voz|voice)$/.test(fuenteDeClip({ source: 'Voice' })));
p.igual('una URL sigue dando su origen', fuenteDeClip({ source: 'https://x.com/a/1' }), 'X');
p.igual('sin origen no inventa uno', fuenteDeClip({ source: 'vozarrón' }), '');

// ── 3. El audio de una nota ─────────────────────────────────────────────────────────────────────
const { app } = vaultSimulado({
  'raw/articles/idea.md': '![[Grabacion 1.m4a]]\n\nTexto dictado.',
  'raw/articles/Grabacion 1.m4a': '',
  'raw/articles/suelto.m4a': '',
  'raw/articles/con-pdf.md': '![[doc.pdf]]',
  'raw/articles/doc.pdf': '',
});
if (audioDeClip) {
  p.igual('encuentra la grabación de la nota', audioDeClip(app, 'raw/articles/idea.md'), 'raw/articles/Grabacion 1.m4a');
  p.igual('un PDF enlazado no es un audio', audioDeClip(app, 'raw/articles/con-pdf.md'), '');
  p.igual('una ruta desconocida no revienta', audioDeClip(app, 'no-existe.md'), '');
} else p.cierto('existe audioDeClip', false);

// ── 4. Fuentes: el audio de una nota no es una fuente suelta; el huérfano sí se ve ──────────────
const inventario = inventarioFuentes(app, [{ ruta: 'raw/articles' }]).map((i) => i.titulo).sort();
p.igual('el inventario omite solo el audio enlazado', inventario, ['con-pdf.md', 'doc.pdf', 'idea.md', 'suelto.m4a']);

process.exit(p.cerrar() ? 1 : 0);
