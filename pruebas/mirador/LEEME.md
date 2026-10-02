# Mirador — las capturas del README, reproducibles

`mirador.html` carga **el plugin construido** (`main.js`) en un navegador, con un vault de
ejemplo (`vault.json`) y lo mínimo de la API de Obsidian para que dibuje. No es una maqueta:
es el mismo código que corre dentro de Obsidian, con el mismo `styles.css`.

Existe por dos razones. La primera, que las capturas del README tienen que poder rehacerse
cuando la interfaz cambie, sin depender de la pantalla de nadie. La segunda, que un vault
real trae nombres de clientes y de personas: las imágenes publicadas se hacen con datos
inventados, siempre.

## Cómo se rehacen

```bash
npm run build
cd pruebas/mirador && ./capturas.sh
```

Deja los `.webp` en `docs/imagenes/`. Necesita Google Chrome instalado.

## Qué se puede pedir por la URL

| URL | Qué muestra |
|---|---|
| `mirador.html` | el mapa completo |
| `?foco=Tostadora` | una nota enfocada, con su panel de conexiones |
| `?vista=camino&de=Hotel&a=Mapa` | el camino más corto entre dos notas |
| `?vista=vacios` | el panel de vacíos entre temas |
| `?vista=radial&foco=Camila` | la vista radial centrada en una nota |
| `?contenido=1` | la última capa con temas de contenido (tags de ejemplo) |
| `?idioma=en` | la interfaz en inglés |

Los nombres son búsquedas parciales en el título, sin distinguir mayúsculas.

## Lo que el mirador NO puede mostrar

El asistente de capas del primer uso y la pantalla de ajustes usan `Modal` y `Setting`, que
son ventanas de Obsidian, no del plugin. Esas dos capturas solo se pueden tomar dentro de
Obsidian, a mano.

`docs/imagenes/06-ia.webp` es una de ellas: se tomó dentro de Obsidian y se recortó a la
sección de la IA, que es la única parte sin datos del vault de quien la tomó. **Regla al
recortar una captura hecha a mano:** fuera el título de la ventana (lleva el nombre del
vault), fuera la lista de carpetas y temas (lleva nombres de clientes) y fuera el valor de
«Excluir notas» (suele ser el nombre de la persona).
