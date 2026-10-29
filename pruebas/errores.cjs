/* 1.36 — errores del proveedor traducidos a un consejo. 
 *   node pruebas/errores.cjs [ruta/main.js]
 */
global.__idioma = 'es';
const { cargarPlugin, vaultSimulado, pruebas } = require('./simulado.cjs');
const p = pruebas('errores');
const { Plugin } = cargarPlugin(process.argv[2]);
const q = new Plugin(); q.app = vaultSimulado({ 'a.md': 'x' }).app;
const msg = (r) => { try { q.revisarRespuesta(r, 'Claude', false); return ''; } catch (e) { return e.message; } };

const id = msg({ status: 400, json: { error: { message: 'identity verification is required to continue' } } });
p.cierto('la verificación de identidad dice qué hacer', /verificar la identidad/.test(id) && /consola/.test(id) && /otro proveedor/.test(id));
p.cierto('y no lo culpa a la llave ni al plugin', /No es un error del plugin ni de tu llave/.test(id));
p.cierto('otro 400 sigue mostrando el mensaje original', /respondió 400: otra cosa/.test(msg({ status: 400, json: { error: { message: 'otra cosa' } } })));
p.cierto('la llave rechazada no cambia', /rechazó la llave/.test(msg({ status: 401, json: {} })));
process.exit(p.cerrar() ? 1 : 0);
