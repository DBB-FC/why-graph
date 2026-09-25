# Cómo contribuir

*Español · [Read in English](CONTRIBUTING.md)*

Los issues y los pull requests son bienvenidos. El plugin tiene licencia MIT, así que también puedes
hacer un fork y seguir tu propio camino, sin pedir permiso.

## Antes de abrir un pull request

```bash
npm install
npm test            # compila src/main.js → main.js y corre todas las suites de pruebas
npx eslint src/     # el linter oficial de plugins de Obsidian: tiene que quedar en 0 errores
```

`npm test` corre más de 340 comprobaciones contra un vault falso en memoria (ninguna carpeta de tu
disco): el mapa, las fuentes, los ajustes, los flujos con IA y Novedades. También corre una prueba de
traducción que falla si algún texto visible no tiene su versión en inglés o en español, o si se
escribió sin `T()`. Si agregas un texto, envuélvelo en `T('…')` y agrega la línea en inglés al
diccionario `EN` al inicio de `src/main.js`; la prueba te avisa si se te olvidó.

Otra prueba dibuja la pantalla de ajustes en Chrome sin ventana y falla si se corta a la mitad: una
excepción dentro de `display()` deja la pantalla a medio dibujar sin ningún error visible, y el resto
simplemente no aparece. También escribe en el buscador y comprueba que la lista de resultados se vea.
En tu equipo se salta sola si no hay Chrome; en CI es obligatoria y falla si no lo encuentra.

## Lo que el plugin promete, y tiene que seguir prometiendo

Tres reglas son el producto. Un cambio que debilite una de ellas no se va a integrar:

1. **Nada se escribe sin la aprobación de la persona.** Una línea insertada a la vez; el texto que ya
   existía nunca se reescribe ni se borra.
2. **Las citas las verifica el código, no el modelo.** Si una cita no aparece literal en el archivo,
   la sugerencia no se puede aprobar.
3. **Sin telemetría, sin servidor, sin llamadas a la red que la persona no pidió.** La llave de la IA
   queda en el almacenamiento local del dispositivo, nunca en `data.json`. Los modos automáticos
   vienen apagados y dicen qué van a enviar antes de enviarlo.

## Convenciones

- El código y los comentarios están en español (el idioma del autor). Mantén el estilo que rodea tu cambio.
- Todo texto visible pasa por `T('…')`. Nunca un texto suelto.
- Usa la API de Obsidian: `Vault.process`, `fileManager.processFrontMatter`, `getFileByPath`,
  `normalizePath`, `registerDomEvent`. Nada de `fetch`, APIs de Node ni estilos en línea: el plugin
  tiene que seguir funcionando en el teléfono.
- `src/main.js` es el código fuente. El `main.js` de la raíz es el resultado de la compilación.
