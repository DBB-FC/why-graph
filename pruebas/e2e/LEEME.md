# Recorridos e2e — una persona usando Why Graph durante días

```bash
node pruebas/e2e/recorridos.cjs                        # contra el main.js construido
node pruebas/e2e/recorridos.cjs --solo "cuota"         # uno solo, por parte del nombre
node pruebas/e2e/recorridos.cjs --vault ~/ruta/vault   # los recorridos genéricos sobre un vault real
node pruebas/e2e/recorridos.cjs viejo/main.js          # validar que detecta los errores de otra versión
```

## Cómo funciona

`mundo.cjs` arma una Obsidian falsa con estas piezas:

- **Vault y ajustes persistentes.** El vault, `data.json`, el adapter (`ingesta.json`) y el
  almacenamiento local de cada dispositivo persisten entre **sesiones**. `M.abrir('mac')` carga
  `main.js` de nuevo, igual que reiniciar Obsidian.
- **Reloj falso.** `M.pasarDias(1)` hace pasar un día.
- **DOM falso** que guarda texto, clases y visibilidad (con las mismas reglas que el CSS y el
  `show()` de Obsidian). La sesión lee lo que la persona ve (`s.ve`, `s.chip`, `s.textoVisible`) y
  pulsa por texto (`s.pulsa('Buscar novedades')`, `s.menu('Conexiones que faltan')`,
  `s.toca('crm')` sobre el lienzo, `s.ajuste('Notas visibles por capa', 12)`).
- **IA falsa** con cuota diaria (`M.ia.cuotaDiaria`) y caídas (`M.ia.caida`). Lleva la cuenta de cada
  bloque de material que se le pagó.

## Los detectores

Corren solos y juntan hallazgos en cada recorrido:

| Hallazgo | Qué significa |
|---|---|
| `pagó dos veces` | El mismo texto de un archivo se envió en dos búsquedas distintas. |
| `vuelve a pedir lo ya leído` | La lista «por leer» incluye archivos que la IA ya leyó enteros. |
| `el contador por leer nunca baja` | El número no se mueve entre días. |
| `la revisión se perdió al reiniciar` | Lo pagado ayer ya no se puede revisar hoy. |
| `pasó el tope diario` / `un día sin avanzar` | La búsqueda automática gasta de más, o no gasta nada con material pendiente. |
| `escribió fuera de lugar` / `modificó el material crudo` | Escrituras fuera de `wiki/` y del registro de auditoría. |
| `línea duplicada en el wiki` | Una novedad o un motivo escrito dos veces. |
| `error tragado` / `console.error` / `aviso de error` | Excepciones, promesas sin `catch` y avisos rojos. |
| `botón que no está` | Lo que el recorrido quiere pulsar no se ve en pantalla. |
| `texto en español con la interfaz en inglés` | Textos sin traducir. |
| `lento` | Abrir el mapa tardó más de 4 s. |

## Agregar un recorrido

Escribe una historia en `RECORRIDOS` de `recorridos.cjs`: qué hace la persona, en qué orden y durante
cuántos días, y qué espera ver al final. **No llames funciones internas del plugin:** si hace falta
hacerlo, es porque la persona no tiene cómo llegar ahí, y eso es un hallazgo.

Si el recorrido sirve para cualquier vault, agrega su nombre a `GENERICOS` para que corra con `--vault`.

## Validación (25.09.2026)

- Contra la 1.33.0 publicada, fallan 4 recorridos, que son los errores que la persona vivía: «61 por
  leer» que nunca baja, pagar lo mismo cada día, la revisión perdida al reiniciar, sin aviso de cuota
  y lo leído perdido al detener.
- Contra la rama que los corrige, pasan los 20 recorridos, y los 8 genéricos sobre el cerebro real.
- La batería también encontró dos errores en el propio arreglo antes de publicarlo:
  - una revisión vacía que escondía el material por leer;
  - la búsqueda automática que nunca arrancaba si el atraso superaba el tope.
