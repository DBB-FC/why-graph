// Descargas diarias de Why Graph en el directorio de la comunidad de Obsidian.
//
// Obsidian solo publica el total acumulado (community-plugin-stats.json, en obsidianmd/obsidian-releases),
// una vez al día. Su historial de git guarda cada corte: este script lee los cortes nuevos, los agrega
// a datos/cortes.json y vuelve a armar el panel (sitio/index.html) con todo el historial.
//
//   node estadisticas/actualizar.mjs [carpeta de datos] [carpeta del sitio]
//
// GITHUB_TOKEN (opcional) sube el límite de la API de GitHub. En el flujo diario lo pone Actions.
import fs from 'node:fs';
import path from 'node:path';

const ID = 'mapa-neuronal', REPO = 'DBB-FC/why-graph';
const DATOS = process.argv[2] || 'datos', SITIO = process.argv[3] || 'sitio';
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const cabeceras = { accept: 'application/vnd.github+json', 'user-agent': 'why-graph-estadisticas', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const api = async (url) => { const r = await fetch(url, { headers: cabeceras }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

// 1. Cortes: los guardados y los nuevos del historial de Obsidian.
fs.mkdirSync(DATOS, { recursive: true });
const archivo = path.join(DATOS, 'cortes.json');
const cortes = fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : [];
const desde = cortes.length ? new Date(cortes[cortes.length - 1].t + 1000).toISOString() : '2026-09-10T00:00:00Z';
const nuevos = [];
for (let pagina = 1; ; pagina++) {
  const lote = await api(`https://api.github.com/repos/obsidianmd/obsidian-releases/commits?path=community-plugin-stats.json&since=${desde}&per_page=100&page=${pagina}`);
  nuevos.push(...lote.map((c) => ({ sha: c.sha, t: Date.parse(c.commit.committer.date) })));
  if (lote.length < 100) break;
}
nuevos.sort((a, b) => a.t - b.t);
for (const c of nuevos) {
  if (cortes.some((x) => x.sha === c.sha)) continue;
  const r = await fetch(`https://raw.githubusercontent.com/obsidianmd/obsidian-releases/${c.sha}/community-plugin-stats.json`);
  if (!r.ok) throw new Error(`${r.status} al leer el corte ${c.sha}`);
  const j = (await r.json())[ID];
  if (j) cortes.push({ sha: c.sha, t: c.t, j });   // antes de estar en el directorio no hay nada que guardar
}
cortes.sort((a, b) => a.t - b.t);
fs.writeFileSync(archivo, JSON.stringify(cortes));

// 2. Las versiones publicadas, con su fecha y lo que cuenta GitHub.
const rel = [];
for (let pagina = 1; ; pagina++) {
  const lote = await api(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${pagina}`);
  rel.push(...lote.map((r) => ({ v: r.tag_name, t: Date.parse(r.published_at), gh: r.assets.filter((a) => a.name === 'main.js').reduce((s, a) => s + a.download_count, 0) })));
  if (lote.length < 100) break;
}
rel.sort((a, b) => cmp(a.v, b.v));

// 3. Día por día: personas (la versión vigente) y robots (todas las versiones viejas suben lo mismo).
const moda = (xs) => { const c = {}; for (const x of xs) c[x] = (c[x] || 0) + 1; return Number(Object.entries(c).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 0); };
const dias = []; let prevT = null, prevV = {}, prevTot = 0;
for (const { t, j } of cortes) {
  const v = Object.fromEntries(Object.entries(j).filter(([k]) => /^\d/.test(k)));
  const inc = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x - (prevV[k] || 0)]).filter(([, x]) => x > 0));
  const inicio = prevT ?? t - 864e5;
  const antes = rel.filter((r) => r.t <= inicio).map((r) => r.v).sort(cmp).pop();
  const vig = new Set([antes, ...rel.filter((r) => r.t > inicio && r.t <= t).map((r) => r.v)].filter(Boolean));
  const viejas = Object.entries(inc).filter(([k]) => !vig.has(k)).map(([, x]) => x);
  // Sin versiones viejas que suban, ese día no pasaron robots (salvo el primero, donde todo era nuevo).
  const base = viejas.length >= 3 ? moda(viejas) : prevTot === 0 ? moda(Object.values(inc)) : 0;
  let personas = 0; const porVersion = {};
  for (const [ver, x] of Object.entries(inc)) { const p = vig.has(ver) ? Math.max(0, x - base) : 0; personas += p; porVersion[ver] = { total: x, personas: p }; }
  dias.push({ fecha: new Date(t - 3 * 3600e3).toISOString().slice(0, 10), t, total: j.downloads, dia: j.downloads - prevTot, personas,
    robots: j.downloads - prevTot - personas, base, porVersion, publicadas: rel.filter((r) => r.t > inicio && r.t <= t).map((r) => r.v) });
  prevT = t; prevV = v; prevTot = j.downloads;
}
if (!dias.length) throw new Error(`«${ID}» no aparece en ningún corte de Obsidian`);
const ultimo = cortes[cortes.length - 1].j;
const datos = { generado: new Date().toISOString(), dias, totalOficial: ultimo.downloads,
  versiones: rel.map((r) => ({ v: r.v, publicada: r.t, oficial: ultimo[r.v] || 0, github: r.gh })) };
fs.writeFileSync(path.join(DATOS, 'descargas.json'), JSON.stringify(datos));

// 4. El panel: la plantilla con los datos adentro.
const plantilla = fs.readFileSync(path.join(AQUI, 'plantilla.html'), 'utf8').replace('__DATOS__', () => JSON.stringify(datos));
fs.mkdirSync(SITIO, { recursive: true });
fs.writeFileSync(path.join(SITIO, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
${plantilla}
</body></html>
`);
const u = dias[dias.length - 1];
console.log(`${cortes.length} cortes (${nuevos.length} consultados) · ${u.fecha}: total ${u.total}, +${u.dia} (personas ${u.personas}, robots ${u.robots})`);
