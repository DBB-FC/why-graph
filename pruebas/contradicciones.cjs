/* 1.36 — contradicciones marcadas como callout `> [!contradiction]` con [[nota]].
 *   node pruebas/contradicciones.cjs [ruta/main.js]
 */
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('contradicciones');
const { interno } = cargarPlugin(process.argv[2]);

(async () => {
  const { app } = vaultSimulado({
    'a.md': 'Precio: pago único.\n\n> [!contradiction] Precio\n> Esta nota dice 180.000, pero [[b]] dice suscripción.\n\nSigue el texto con [[c]].',
    'b.md': 'Suscripción de 80.990 al año.',
    'c.md': 'Otra cosa.',
    'd.md': '> [!note]\n> Nada que ver con [[a]].',
    'e.md': '> [!contradicción]\n> Choca con [[c]]\n\n[[a]] va aparte.',
  });
  const D = await interno.construir(app, Object.assign({}, interno.AJUSTES_BASE, { carpetas: '', capas: 'Entrada | x\nNotas | y' }));
  const par = (x, y) => (x < y ? x + '|' + y : y + '|' + x);
  p.igual('marca solo los enlaces dentro del callout (en ambos idiomas de la palabra)', D.contradicciones.sort(), [par('a.md', 'b.md'), par('c.md', 'e.md')].sort());
  p.cierto('un callout de otro tipo no cuenta', !D.contradicciones.includes(par('a.md', 'd.md')));
  p.cierto('un enlace fuera del callout, en la misma nota, no cuenta', !D.contradicciones.includes(par('a.md', 'c.md')) && !D.contradicciones.includes(par('a.md', 'e.md')));
  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
