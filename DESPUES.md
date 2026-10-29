# Después — ideas que aparecieron a mitad de una tarea

Cosas que quedaron fuera del build en curso para no ampliarlo. Cada una con su origen.

- **Recorrido e2e: «las capas se redujeron solas».** El 28.09 el `data.json` del Cerebro pasó de 4 capas
  a 2 sin causa identificada. Sospecha a revisar: una copia vieja del plugin guarda sus ajustes en
  memoria encima de un `data.json` editado desde afuera, sin que Obsidian se haya reiniciado.
  Origen: plan-temas-reales §7.
- **Aviso diario «N clips esperando»** que solo cuente y no escriba en `wiki/`. Felipe lo pidió solo si lo
  necesita; hoy la ingesta es por el botón «Ingerir novedades». Origen: PLAN-UX-ENTRADA §B.3, 02.10.2026.

## Hecho el 03.10.2026 (sin ver aún en Obsidian con clips reales)
Chip único «Por ingerir · N» con pestañas, tags de estado en Sugerir temas (ajuste `tagsDeEstado`), fuente por clip,
«→ fue a:», «Se parece a:» (TF-IDF local) y registro de descartes de motivos (base para keep/discard), «Vínculos por revisar» con un solo nombre y frase humana, y orden de Temas (ajuste `ordenTemas`).

- [investigar] Mejoras inspiradas en repos de Karpathy (anotado 03.10.2026). Orden: (1) clasificar clips por tema en local (TF-IDF, sin IA); (2) ordenar vínculos por parecido de texto; (3) revisión anónima por voto cuando la segunda revisión rechaza; (4) mapa por parecido (tsnejs): CONSTRUIDO 03.10 (menú «Mapa por parecido»; t-SNE local, solo la vecindad significa algo). Prueba 1 hecha el 03.10: 79 % de acierto del tema #1 (38/48 notas, una a una) contra 63 % de «siempre ia»; ver resultado y límites en el Cerebro. Falta decidir si se construye.
- [investigar] Segunda pasada a repos de Karpathy (03.10.2026), aprobada por Felipe: (1) **vínculos por vecinos en común**: YA EXISTÍA en `calcularPendientes` (`c.comunes`); el tope de 20 ya dice «N de M»; prueba hecha: AUC 0.87 y el vínculo oculto sale entre los 10 primeros en 49 % de 423 casos; (2) **«se parece a…» en cada clip** de «Llegó de afuera» (researchpooler/arxiv-sanity, mismo TF-IDF), resuelve «adónde fue»; (3) **métrica fija + registro keep/discard** antes de tocar el prompt de `sugerirMotivo` (autoresearch), sin enjambres ni bucle infinito. (4) revisión con perspectiva de notas viejas (hn-time-capsule): CONSTRUIDA 03.10 (menú «Revisar con perspectiva»; reúne pistas —edad, vecinas más nuevas— y decide la persona, sin IA). Voto de 3 revisores en la segunda revisión: CONSTRUIDO 03.10, APAGADO por defecto (afloja un candado; Ajustes → «Voto en la segunda revisión»). Nada de esto se ha visto aún con datos reales en Obsidian. El log de motivos solo tiene 5 aprobados y no guarda descartes: los descartes ya se registran (03.10); falta acumularlos para medir (3).

## Anotado el 28.10.2026 (mientras se construía la cola de motivos)
- Traducir el 400 de Anthropic «identity verification is required» a un consejo en español dentro del plugin.
- Botón de apoyo dentro del plugin; cambiar «cerveza» por «café» en los README.
- Nota en el panel de descargas: «datos al corte de las 00:27 UTC».
- [abierto, acotado el 29.10] `--vault` sobre el Cerebro: «un día sin avanzar». Causa demostrada de la mayor parte: el
  recorrido contaba como «sin leer» los ~1995 archivos de `raw/` más viejos que la ventana de 7 días, que la búsqueda
  automática no toca por diseño (solo 27 archivos son recientes y se consumen en 2 días con tope 2). El recorrido ahora
  cuenta solo lo que alcanza. Queda SIN explicar: 2 archivos dentro de la ventana (`raw/daily/2026-10-28/oem-bitacora-dia.md`
  y `oem-brujula-semana.md`) que la IA falsa nunca recibe completos y el día 3 da `sin-material`. Sospecha: párrafos
  repetidos que se envían una sola vez. Pasa igual en la 1.35.0.

## Anotado el 29.10.2026 (análisis estático de Neomas 1.1.12)
Neomas es propietario: se toman ideas, no código. Detalle en `raw/daily/2026-10-29/neomas.md` del Cerebro.
- [investigar] **Detectar la forma del vault** (PARA, Zettelkasten…) en vez de exigir la de vega-central.
  Ataca el límite anotado el 16.09. Mayor impacto de las cinco.
- [investigar] **Procedencia por nota**: origen `human|ai|mixed` y rol `thought|resource|work|system`,
  inferidos de frontmatter y carpeta; el mapa pintaría distinto lo escrito por IA.
- [investigar] **Diario de propuestas como eventos**: `shown → modified → accepted|rejected|ignored → undone`,
  JSONL append-only, sin texto libre (solo huellas). Extiende el registro de descartes del 03.10.
- [investigar] **Embeddings locales** (`@xenova/transformers` + `paraphrase-multilingual-MiniLM-L12-v2`, 113 MB)
  como segunda etapa del TF-IDF de «Se parece a:». Modelo descargable aparte, no en el plugin.
- **Sin caída a la nube**: si el modelo local falla, error; nunca reenviar a un proveedor remoto.
- [investigar] **Contradicciones como callout**: `> [!contradiction]` con `[[nota]]`; un escaneo junta los pares
  y el mapa los pinta como enlace rojo. Es la regla «márcala con ambas fuentes» del Cerebro hecha formato.
- [investigar] **Instalación tipo entrevista** (6 pasos, nada se escribe hasta «Crear»). Ataca «instalación compleja» (16.09).
- **Canario de ajustes** contra el bug de arriba («las capas se redujeron solas», 28.09): un token en `data.json`
  comparado con el del arranque anterior; si falta o es viejo, anotarlo con fecha. Diría si el archivo se pisó y cuándo.
  De todas las ideas de Neomas, la única que resuelve algo hoy.
- [investigar] **Permisos de la IA como reglas fijas**: leer libre; escribir solo en rutas aprobadas; red solo con
  permiso; todo bloqueo trae motivo + sugerencia, nunca un «no» seco. Para Novedades con aprobación.

## Anotado el 29.10.2026 — mejoras visuales (capturas del README + Neomas)
Maqueta interactiva publicada como Artifact «Why Graph con Neomas». Orden sugerido: 3 → 1 → 2.
1. **Motivo al pasar** por un enlace (etiqueta flotante con el porqué y quién lo escribió) + estilo por origen:
   sólido = tú, punteado = IA (Neomas usa «Punteado: añadido por Neo»), rojo = contradicción.
2. **Nombres según zoom** (hoy 9 de 42 nodos tienen rótulo) y **tamaño por conexiones**.
3. [bug] Con el panel abierto, el subtítulo de L3 («4 nodos · síntesis…») se monta sobre los enlaces de L2.
4. **Fondo según tema**: el canvas está fijo en azul noche (main.js:2360); en tema claro choca.
5. Temas L3 más grandes y con su conteo; columnas como franja suave en vez de recuadro; «2 saltos», no «2 salto(s)».
6. De Neomas: calor por antigüedad (halo si < 7 días, apagado si > 45), notas fantasma (35 % + halo que respira)
   para «Conexiones que faltan», faros sobre las notas de «revisar», migas del recorrido en modo foco.

## Filtro de las ideas visuales de Neomas (29.10.2026, con evidencia)
Regla: entra solo con síntoma real, que no exista ya y costo proporcional. Resultado:
- **Implementadas:** fondo claro «papel» (C1, terminado: ajuste `fondoMapa`, pulsos y rótulos en tinta; prueba `pruebas/fondo.cjs`)
  y motivo al pasar el mouse por un enlace (C2; `aristaEn`/`etiquetaArista`, 0,37 ms con 3000 enlaces; `pruebas/enlace-mouse.cjs`
  y el recorrido «mouse: pasar por un enlace»).
- **Ya existían (no se rehicen):** tamaño por conexiones, nombres según zoom, calor por recencia (anillo blanco), conexiones que faltan,
  anillos de salud (faros), contradicciones y escrito por IA (estos dos de la 1.36).
- **Descartadas:** C3 (estilo por quién escribió el motivo): la arista no guarda el origen; leerlo exige escribir metadatos en las notas
  o cruzar los registros de aprobación, que viven en otro archivo. C4 (subtítulo de L3): no se reproduce, el texto es legible y no choca
  con rótulos (captura a 1000 px). C5 (notas fantasma): en el Cerebro hay 1 enlace sin resolver de 3992 («anytype», herramienta ya
  descartada); Salud ya lo nombra. Índice semántico, migas y apagar notas viejas: descartadas el 29.10 por decisión.
- Corregido el 29.10: el recorrido «contra la versión anterior» no usaba el `main.js` viejo si el archivo no terminaba en `.js`;
  una comparación anterior contra la 1.35.0 salió «28 bien» por esa causa y no valía.
