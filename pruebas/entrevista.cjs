/* 1.36 — configuración guiada: seis pasos, nada se guarda hasta «Crear».
 *   node pruebas/entrevista.cjs [ruta/main.js]
 */
global.__idioma = 'es';
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('entrevista');
const { Plugin, interno, avisos } = cargarPlugin(process.argv[2]);
const { Entrevista, AJUSTES_BASE } = interno;

(async () => {
  const notas = {};
  for (let i = 0; i < 4; i++) { notas[`Projects/p${i}.md`] = 'x'; notas[`Areas/a${i}.md`] = 'x'; notas[`Resources/r${i}.md`] = 'x'; notas[`inbox/i${i}.md`] = 'x'; }
  const { app } = vaultSimulado(notas);
  const pl = new Plugin(); pl.app = app; await pl.onload();
  pl.ajustes = Object.assign({}, AJUSTES_BASE, { capas: '', carpetas: '' }); let guardados = 0; pl.guardar = async () => { guardados++; };

  const e = new Entrevista(app, pl); e.onOpen();
  p.igual('detecta PARA y arranca con esa plantilla', e.d.plantilla, 'para');
  p.cierto('el borrador reparte las carpetas en capas', e.d.filas.find((f) => f.carpeta === 'Projects').capa === 1 && e.d.filas.find((f) => f.carpeta === 'Areas').capa === 2 && e.d.filas.find((f) => f.carpeta === 'Resources').capa === 3);
  for (let i = 0; i < 6; i++) { e.paso = i; e.pintar(); }   // los seis pasos se dibujan sin reventar
  p.cierto('los seis pasos se pintan', true);
  e.d.crudo = 'inbox'; e.d.wiki = 'Areas'; e.d.usarIA = true; e.d.proveedor = 'gemini'; e.d.soloLocal = false; e.d.escritura = 'Areas';
  p.cierto('antes de «Crear» no se guardó nada', guardados === 0 && pl.ajustes.carpetas === '' && pl.ajustes.carpetaWiki === '' && pl.ajustes.configurado !== true);
  e.close(); // cancelar
  p.cierto('cerrar sin crear tampoco cambia nada', guardados === 0 && pl.ajustes.carpetas === '');
  await e.crear();
  const a = pl.ajustes;
  p.cierto('«Crear» guarda capas y carpetas', guardados === 1 && /Projects = \d/.test(a.carpetas) && a.capas.split('\n').length >= 3);
  p.cierto('y el material, el wiki, la IA y los permisos', a.carpetaCrudo === 'inbox' && a.carpetaWiki === 'Areas' && a.proveedorIA === 'gemini' && a.escrituraIA === 'Areas' && a.configurado === true);
  p.cierto('avisa que quedó guardado', avisos.some((m) => /Setup saved|Configuración guardada/.test(m)));

  const sin = new Entrevista(app, pl); sin.onOpen(); sin.d.filas.forEach((f) => { f.capa = -1; }); guardados = 0;
  await sin.crear();
  p.cierto('sin ninguna carpeta visible no guarda y lo dice', guardados === 0);
  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.stack); p.cerrar(); process.exit(1); });
