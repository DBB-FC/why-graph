/* Prueba de cobertura del idioma del plugin «Mapa neuronal».
 *
 * Verifica que TODO texto que pase por T() tenga traducción al inglés, y que no queden
 * entradas muertas en el diccionario. Un texto sin traducir no se ve hasta que lo abre un
 * usuario en inglés: por eso es una prueba y no una nota.
 *
 *   npm test                       construye y prueba
 *   node pruebas/idioma.cjs        prueba el main.js ya construido
 *   node pruebas/idioma.cjs ruta/main.js
 */
const fs = require('fs'), path = require('path');
const RUTA = process.argv[2] || path.join(__dirname, '../main.js');
const texto = fs.readFileSync(RUTA, 'utf8');

// Lo mínimo de la API de Obsidian para poder cargar el archivo fuera de Obsidian.
const Base = class { registerEvent() {} };
const simulado = {
  Plugin: Base, ItemView: class extends Base {}, PluginSettingTab: Base, Setting: Base,
  Menu: class {}, Modal: class {}, Notice: class {}, Platform: { isMobile: false },
  debounce: (f) => f, setIcon: () => {}, requestUrl: async () => ({ status: 500, json: {} }),
  normalizePath: (p) => p, getLanguage: () => global.__idioma || 'en',
};
const cargar = () => {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', texto + '\nmodule.exports.__t = { EN, T, CAPAS_ESTANDAR, PROVEEDORES, PLANTILLAS };')(
    (n) => (n === 'obsidian' ? simulado : require(n)), m, m.exports);
  return m.exports.__t;
};

const { EN, CAPAS_ESTANDAR, PROVEEDORES, PLANTILLAS } = cargar();

// Claves usadas: el primer argumento de cada T(, incluidos los ternarios.
const usadas = new Set();
for (let i = 0; (i = texto.indexOf('T(', i)) !== -1; i += 2) {
  if (/[A-Za-z0-9_$.]/.test(texto[i - 1] || '')) continue;
  let j = i + 2, prof = 1, q = null, arg = '';
  while (j < texto.length && prof > 0) {
    const c = texto[j];
    if (q) { if (c === '\\') { arg += c + texto[j + 1]; j += 2; continue; } if (c === q) q = null; }
    else if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '(' || c === '[') prof++;
    else if (c === ')' || c === ']') { prof--; if (!prof) break; }
    else if (c === ',' && prof === 1) break;
    arg += c; j++;
  }
  for (const mt of arg.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) {
    const bruto = mt[1] !== undefined ? mt[1] : mt[2];
    usadas.add(bruto.replace(/\\(['"\\n])/g, (_, c) => (c === 'n' ? '\n' : c)));
  }
}
// Claves que llegan por variable: area(nombre, desc), CAPAS_ESTANDAR, PROVEEDORES.
for (const mt of texto.matchAll(/area\((?:T\()?['"]([^'"]+)['"]\)?,\s*['"]((?:[^'"\\]|\\.)*)['"]/g)) { usadas.add(mt[1]); usadas.add(mt[2]); }
for (const par of CAPAS_ESTANDAR) for (const x of par) usadas.add(x);
for (const [, nombre, capas] of PLANTILLAS) { usadas.add(nombre); for (const par of capas) for (const x of par) usadas.add(x); }
for (const def of Object.values(PROVEEDORES)) { usadas.add(def.ayuda); usadas.add(def.modeloAyuda); }

const faltan = [...usadas].filter((k) => EN[k] === undefined);
const sobran = Object.keys(EN).filter((k) => !usadas.has(k));
console.log(`textos que pasan por T(): ${usadas.size}`);
faltan.forEach((k) => console.log('  SIN TRADUCIR  ' + JSON.stringify(k)));
sobran.forEach((k) => console.log('  YA NO SE USA  ' + JSON.stringify(k)));

// Los dos idiomas tienen que producir texto distinto y sustituir los valores.
const muestras = [['{0} · {1} nodos · {2} enlaces', 'Why Graph', 42, 74], ['Camino · {0} salto(s)', 2], ['Aplicar']];
const salida = {};
for (const idioma of ['es', 'en']) {
  global.__idioma = idioma;
  const { T } = cargar();
  salida[idioma] = muestras.map((m) => T(...m));
  console.log(`${idioma}: ${salida[idioma].join(' · ')}`);
}
const noTraduce = salida.es.filter((x, i) => x === salida.en[i] && !/^\d+$/.test(x));
if (noTraduce.length) console.log('  IGUAL EN LOS DOS IDIOMAS  ' + JSON.stringify(noTraduce));

// Textos visibles escritos directo, sin T() (issue #19: el botón «Abrir» salía en español con
// Obsidian en inglés). Se revisan los lugares donde el texto va a la pantalla.
const directos = [...texto.matchAll(/(?:boton\([^,]+,\s*'[^']+',\s*|setButtonText\(|setName\(|setDesc\(|setTitle\(|new Notice\(|\btext:\s*)'([^']{2,})'/g)]
  .map((m) => m[1]).filter((x) => /[a-záéíóúñ]{3}/i.test(x));
directos.forEach((x) => console.log('  SIN T()  ' + JSON.stringify(x)));

const problemas = faltan.length + sobran.length + noTraduce.length + directos.length;
console.log(problemas ? `✕ ${problemas} problema(s) de idioma` : '✓ idioma completo en inglés y español');
process.exit(problemas ? 1 : 0);
