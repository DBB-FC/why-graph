# Why Graph — cómo se trabaja en este repositorio

Plugin de Obsidian. El código vive en `src/main.js` y se construye a `main.js` con esbuild. El remoto
es `DBB-FC/why-graph` (alias SSH `github-dbb`, remoto `obsidian`). Una sola release por versión.

## Qué significa «auditoría e2e» aquí

Una auditoría e2e es **el recorrido de la persona a lo largo del tiempo**, no una revisión de funciones.
El 25.09.2026 se publicó la 1.33.0 después de una «auditoría e2e» que probó piezas sueltas. La persona
veía todos los días «61 por leer», un número que nunca bajaba, y lo pagaba de nuevo cada día. El
script de la auditoría llamaba a mano al paso que ella no daba («Terminar»), y con eso tapaba el error.

Por eso, en cada auditoría:

1. **Empezar por lo que la persona ve.** Qué síntoma ve, qué número no se mueve, qué botón no hace
   nada. El código se lee después.
2. **Recorrer en el tiempo.** Abrir, pulsar, cerrar el panel sin terminar, reiniciar Obsidian, volver
   al día siguiente, abrir desde otro dispositivo. El estado persistido (`data.json`, `ingesta.json`, el
   almacenamiento local de cada dispositivo) viaja entre sesiones como en Obsidian.
3. **Nunca dar en el harness un paso que la persona podría no dar.** Si el script llama a
   `confirmarIngesta`, `enfocar` o `aplicarNovedad` por dentro, no está probando lo que pasa cuando
   ella no pulsa ese botón. Se pulsa lo que se ve, por su texto.
4. **Explicar cada número raro del estado real hasta el final.** Ejemplos: «7 de 70 archivos sellados»
   o un contador que no cambia entre días. Nada se da por cerrado hasta que la causa está demostrada.
   Si no se puede cerrar, va al informe como **abierto**.
5. **Validar la auditoría contra un error conocido.** Antes de confiar en una batería, correrla contra
   una versión que tenga un error conocido y comprobar que lo detecta. Si no lo detecta, no sirve.

## Las herramientas

- `npm test` corre todo, recorridos incluidos. CI hace lo mismo en cada rama y antes de cada release.
- `node pruebas/e2e/recorridos.cjs`: los recorridos de una persona durante días. Ver `pruebas/e2e/LEEME.md`.
- `node pruebas/e2e/recorridos.cjs --vault <ruta>`: los mismos recorridos sobre una copia en memoria
  de un vault real, con la IA falsa. Solo lee del disco. Correrlo antes de cada release contra
  el cerebro de Felipe.
- `node pruebas/e2e/recorridos.cjs <main.js de una versión anterior>`: la validación del punto 5.
- `pruebas/mirador/`: el plugin dibujado en Chrome, para capturas y para la sonda de UI.

## Antes de publicar

1. `npm test` en verde, con los recorridos incluidos.
2. Recorridos con `--vault` sobre el cerebro real, sin hallazgos.
3. Recorridos contra la versión publicada anterior: tienen que detectar lo que esta versión corrige.
4. En el PR, la lista de recorridos cubiertos y **lo que queda sin cubrir**. Por ahora: el asistente
   de capas (es un `Modal`), la exportación PNG y lo que solo existe en un iPhone real.
