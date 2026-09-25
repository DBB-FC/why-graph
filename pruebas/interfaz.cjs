/* Prueba de la pantalla de ajustes: que se dibuje completa y no se corte en silencio.
 *
 * Una excepción a mitad de `display()` deja la pantalla a medias sin ningún error visible
 * para el usuario: lo que sigue simplemente no aparece. Pasó el 15.09.2026 y no se notó
 * porque ninguna prueba abría esa pantalla.
 *
 * Necesita Google Chrome. Si no está, la prueba se salta (no falla): en CI no siempre hay.
 */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dir = path.join(__dirname, 'mirador');

// En CI saltarse no es opción: una prueba visual que no corre da una cobertura que no existe
// (hasta 1.33 se saltaba SIEMPRE en GitHub: la ruta de arriba es la de macOS).
if (!fs.existsSync(CHROME)) {
  if (process.env.CI) { console.log(`interfaz: ✕ no hay Chrome en ${CHROME} (en CI es obligatoria; define CHROME)`); process.exit(1); }
  console.log('interfaz: saltada (no hay Chrome en este equipo)'); process.exit(0);
}
// Ubuntu 24.04 restringe los namespaces sin privilegios: sin esto Chrome no arranca en el runner.
const SANDBOX = process.env.CI ? ['--no-sandbox'] : [];
if (!fs.existsSync(path.join(__dirname, '../main.js'))) { console.log('interfaz: falta main.js — corre npm run build'); process.exit(1); }

// El mirador dibuja con el build: se preparan sus copias igual que capturas.sh
fs.copyFileSync(path.join(__dirname, '../main.js'), path.join(dir, 'main.js'));
fs.copyFileSync(path.join(__dirname, '../styles.css'), path.join(dir, 'styles.css'));
fs.appendFileSync(path.join(dir, 'main.js'), '\nwindow.__VistaMapa = VistaMapa; window.__AjustesMapa = AjustesMapa; window.__AJUSTES_BASE = AJUSTES_BASE;\n');
fs.writeFileSync(path.join(dir, 'vault.js'), 'window.__VAULT = ' + fs.readFileSync(path.join(dir, 'vault.json'), 'utf8') + ';');

const dom = execFileSync(CHROME, [...SANDBOX, '--headless', '--disable-gpu', '--window-size=900,900',
  '--virtual-time-budget=5000', '--dump-dom', `file://${dir}/mirador.html?vista=ajustes`], { encoding: 'utf8', maxBuffer: 64e6 });

// El buscador, escrito como lo haría una persona: la lista de resultados tiene que VERSE.
// Hasta 1.32 no se veía nunca en Obsidian (show() deja display vacío y el CSS la ocultaba).
const domBuscar = execFileSync(CHROME, [...SANDBOX, '--headless', '--disable-gpu', '--window-size=1400,900',
  '--virtual-time-budget=5000', '--dump-dom', `file://${dir}/mirador.html?vista=buscar&q=tostadora`], { encoding: 'utf8', maxBuffer: 64e6 });

for (const f of ['main.js', 'styles.css', 'vault.js']) fs.unlinkSync(path.join(dir, f));

const m = dom.match(/<pre id="diag">([\s\S]*?)<\/pre>/);
if (!m) { console.log('interfaz: ✕ la pantalla de ajustes no llegó a dibujarse'); process.exit(1); }
const d = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

const fallos = [];
if (d.error) fallos.push(`display() lanzó: ${d.error}`);
if (d.ajustes < 15) fallos.push(`solo ${d.ajustes} ajustes dibujados (deberían ser 15 o más)`);
if (!d.pie) fallos.push('falta el pie con la versión y la marca');
else if (!/\d+\.\d+\.\d+/.test(d.pie)) fallos.push(`el pie no muestra la versión: «${d.pie}»`);
if (!d.logo) fallos.push('el logo de la marca no carga su imagen');
if (!d.probar.length) fallos.push('falta el botón de probar la conexión');
const mb = domBuscar.match(/<pre id="diag">([\s\S]*?)<\/pre>/);
const b = mb ? JSON.parse(mb[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) : null;
if (!b) fallos.push('el buscador no llegó a probarse');
else if (b.display === 'none' || !b.alto) fallos.push(`la lista de resultados del buscador no se ve (display: ${b.display})`);
else if (!b.filas.some((x) => /tostadora/i.test(x))) fallos.push(`el buscador no encontró la nota: ${JSON.stringify(b.filas)}`);
else if (!b.teclado?.fila || b.teclado.rol !== 'button') fallos.push(`con ↓ el foco no entra en los resultados: ${JSON.stringify(b.teclado)}`);

console.log(`interfaz: buscador ${b && b.alto ? `visible, ${b.filas.length} resultado(s)${b.teclado?.fila ? ', navegable con ↓' : ''}` : 'NO se ve'} · ${d.ajustes} ajustes · pie «${d.pie}» · logo ${d.logo ? 'sí' : 'NO'} · ${d.probar.length ? 'con' : 'SIN'} botón de prueba`);
fallos.forEach((f) => console.log('   ✕ ' + f));
process.exit(fallos.length ? 1 : 0);
