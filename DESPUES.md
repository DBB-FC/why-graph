# Después — ideas que aparecieron a mitad de una tarea

Cosas que quedaron fuera del build en curso para no ampliarlo. Cada una con su origen.

- **Orden de la columna Temas por ajuste** (alfabético o por número de notas). El build de temas de
  contenido quedó ordenado por número de notas, sin ajuste. Origen: plan-temas-reales §3.3, 28.09.2026.
- **Recorrido e2e: «las capas se redujeron solas».** El 28.09 el `data.json` del Cerebro pasó de 4 capas
  a 2 sin causa identificada. Sospecha a revisar: una copia vieja del plugin guarda sus ajustes en
  memoria encima de un `data.json` editado desde afuera, sin que Obsidian se haya reiniciado.
  Origen: plan-temas-reales §7.
- **Aviso diario «N clips esperando»** que solo cuente y no escriba en `wiki/`. Felipe lo pidió solo si lo
  necesita; hoy la ingesta es por el botón «Ingerir novedades». Origen: PLAN-UX-ENTRADA §B.3, 02.10.2026.

## Hecho el 03.10.2026 (sin ver aún en Obsidian con clips reales)
Chip único «Por ingerir · N» con pestañas, tags de estado en Sugerir temas (ajuste `tagsDeEstado`), fuente por clip,
«→ fue a:», «Se parece a:» (TF-IDF local) y registro de descartes de motivos (base para keep/discard).

- [investigar] Mejoras inspiradas en repos de Karpathy (anotado 03.10.2026). Orden: (1) clasificar clips por tema en local (TF-IDF, sin IA); (2) ordenar vínculos por parecido de texto; (3) revisión anónima por voto cuando la segunda revisión rechaza; (4) mapa por parecido (tsnejs). Prueba 1 hecha el 03.10: 79 % de acierto del tema #1 (38/48 notas, una a una) contra 63 % de «siempre ia»; ver resultado y límites en el Cerebro. Falta decidir si se construye.
- [investigar] Segunda pasada a repos de Karpathy (03.10.2026), aprobada por Felipe: (1) **vínculos por vecinos en común**: YA EXISTÍA en `calcularPendientes` (`c.comunes`); el tope de 20 ya dice «N de M»; prueba hecha: AUC 0.87 y el vínculo oculto sale entre los 10 primeros en 49 % de 423 casos; (2) **«se parece a…» en cada clip** de «Llegó de afuera» (researchpooler/arxiv-sanity, mismo TF-IDF), resuelve «adónde fue»; (3) **métrica fija + registro keep/discard** antes de tocar el prompt de `sugerirMotivo` (autoresearch), sin enjambres ni bucle infinito. (4) revisión con perspectiva de notas viejas (hn-time-capsule), aprobado también. El log de motivos solo tiene 5 aprobados y no guarda descartes: los descartes ya se registran (03.10); falta acumularlos para medir (3).
