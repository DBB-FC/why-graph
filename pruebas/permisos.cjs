/* 1.36 — permisos de la IA como reglas fijas: escribir y red, con motivo y sugerencia.
 *   node pruebas/permisos.cjs [ruta/main.js]
 */
global.__idioma = 'es';
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('permisos');
const { Plugin } = cargarPlugin(process.argv[2]);

(async () => {
  const v = vaultSimulado({ 'wiki/a.md': '# A\n\n## Notas\n\n- uno\n', 'raw/daily/x.md': 'crudo', 'otro/b.md': '# B\n' });
  const q = new Plugin(); q.app = v.app; await q.onload();
  q.ajustes.carpetaWiki = 'wiki'; q.ajustes.carpetaCrudo = 'raw';
  const nov = (destino) => ({ destino, texto: 'una novedad', verificada: true, fuente: '', seccion: 'Notas' });
  const intenta = async (f) => { try { await f(); return ''; } catch (e) { return e.message; } };

  p.cierto('escribir en el wiki está permitido', q.permisoEscritura('wiki/a.md') === null);
  const crudo = await intenta(() => q.aplicarNovedad(nov('raw/daily/x.md')));
  p.cierto('el material crudo es de solo lectura, con motivo y qué hacer', /Bloqueado: el material crudo es de solo lectura\. Elige una página del wiki/.test(crudo));
  p.igual('y el crudo no cambió', v.app.vault.getFileByPath('raw/daily/x.md') && (await v.app.vault.cachedRead(v.app.vault.getFileByPath('raw/daily/x.md'))), 'crudo');
  p.cierto('las carpetas ocultas no se tocan', /carpetas ocultas/.test(await intenta(() => q.aplicarNovedad(nov('.obsidian/x.md')))));
  p.cierto('solo notas .md', /solo escribe notas de texto/.test(await intenta(() => q.aplicarNovedad(nov('wiki/a.png')))));

  p.cierto('sin carpetas fijadas, cualquier nota del vault vale', q.permisoEscritura('otro/b.md', { acotado: true }) === null);
  q.ajustes.escrituraIA = 'wiki';
  p.cierto('con carpetas fijadas, fuera de ellas se bloquea y dice cómo arreglarlo', /no está en «Carpetas donde la IA puede escribir»\. Agrégala/.test(await intenta(() => q.aplicarNovedad(nov('otro/b.md')))));
  p.cierto('y dentro sigue funcionando', (await intenta(() => q.aplicarNovedad(nov('wiki/a.md')))) === '');

  const aprob = await intenta(() => q.aprobar({ origen: 'raw/daily/x.md', destino: 'wiki/a.md', linea: 0 }, { motivo: 'm', manual: true }));
  p.cierto('un motivo no se escribe en el material crudo', /material crudo/.test(aprob));

  p.cierto('la red va solo a servicios de IA conocidos', q.permisoRed('https://api.anthropic.com/v1/messages') === null && q.permisoRed('http://localhost:11434/v1/chat/completions') === null);
  const raro = q.permisoRed('https://malo.example.com/x');
  p.cierto('un destino desconocido se bloquea con sugerencia', /malo\.example\.com no es un servicio de IA/.test(raro.motivo) && /Elige un proveedor/.test(raro.sugerencia));
  q.ajustes.soloLocal = true;
  p.cierto('«Solo IA local» bloquea internet y deja pasar lo local', /Solo IA local/.test(q.permisoRed('https://api.anthropic.com/v1/messages').motivo) && q.permisoRed('http://localhost:11434/v1/chat/completions') === null);
  q.ajustes.proveedorIA = 'claude'; v.app.saveLocalStorage?.('mapa-neuronal-key-claude', 'k');
  const red = await intenta(() => q.pedirReintentando({ url: 'https://api.anthropic.com/v1/messages', body: '{}' }, 'Claude', false));
  p.cierto('una llamada a la IA en internet se corta antes de enviar nada', /Bloqueado: está activado «Solo IA local»/.test(red));

  process.exit(p.cerrar() ? 1 : 0);
})().catch((e) => { console.error('   ✕ se cortó: ' + e.message); p.cerrar(); process.exit(1); });
