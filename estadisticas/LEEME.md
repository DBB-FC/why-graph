# Descargas diarias

Obsidian publica solo el **total** de descargas de cada plugin, en `community-plugin-stats.json`
(repositorio `obsidianmd/obsidian-releases`). Lo actualiza una vez al día y su historial de git guarda
cada corte. De ahí salen las descargas de cada día.

- **Cuándo corre:** el flujo `.github/workflows/descargas.yml` corre cada noche a las 01:40 UTC
  (22:40 en Chile), una hora después del corte de Obsidian. También se puede lanzar a mano desde
  Actions → Descargas diarias → Run workflow.
- **Qué hace:** `actualizar.mjs` lee solo los cortes nuevos y los agrega a `cortes.json`, en la rama
  `estadisticas`. Después vuelve a armar el panel desde `plantilla.html`.
- **Dónde se ve:** el panel se publica en GitHub Pages.
- **Probarlo en local:**

```bash
node estadisticas/actualizar.mjs /tmp/est/datos /tmp/est/sitio   # abre /tmp/est/sitio/index.html
```

## Personas y robots

Unos pocos robots (espejos, escáneres, sitios de estadísticas) bajan cada día **todas** las versiones
por igual. Por eso las descargas se separan así:

- **Personas:** lo que sube la versión vigente ese día, menos la «base» de los robots. La base es lo que
  subió cada versión vieja ese mismo día.
- **Robots:** todo lo demás.

Es una estimación. El primer día (16.09.2026) es el menos confiable, porque ese día se publicaron
27 versiones.
