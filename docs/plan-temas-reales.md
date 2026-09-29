# Plan · Temas reales en la columna L3

**Fecha:** 28.09.2026 · **Origen:** sesión Cerebro 99405677 · **Estado:** plan (falta crisol y build)
**Tarea OEM:** «Columna Temas armada desde tags de contenido; las 6 líneas de negocio pasan a ser solo color».
**Listo observable:** en Obsidian la columna L3 muestra temas de contenido (seguridad, agentes, licencias…)
y `npm test` en verde.

## 1. El problema, tal como lo ve Felipe

Con el vault Cerebro (177 páginas) el mapa hoy:

1. **Entrada no está en orden de fecha.** Dentro de cada columna el plugin ordena por tema (en el orden de
   la lista `temas`) y luego por la posición media de los vecinos, para cruzar menos curvas
   (`src/main.js`, `ordenTema` y `_b`). Nunca mira la fecha. El diario del 09.09 queda arriba y el del
   21.08 abajo porque tienen distinto tema, no por cuándo se escribieron.
2. **Entidades y Conocimiento no se explican solas.** Son carpetas mapeadas a columnas
   (`proyectos/clientes/personas` = 1, `tecnico/negocio` = 2). Conocimiento apila 87 nodos sin agrupar.
3. **Temas no son temas.** Los 6 valores de `tema:` (kapa21, horek, vega-central, dbb, venta, cerebro) son
   **líneas de negocio**: clientes y áreas. Un artículo sobre licencias open source cae en «DBB»; una nota
   sobre CSP en Next.js cae en «Kapa 21». Los temas de contenido viven en `tags`, que el plugin ignora.

## 2. Lo que hay en el vault (medido el 28.09)

- `tema:` en 138/177 páginas, 6 valores. `tags:` en 177/177, **106 valores distintos**.
- Los tags se mezclan en tres clases:

| Clase | Ejemplos | Sirven de tema |
| --- | --- | --- |
| Tipo o estado de página | reutilizable 56, decision 31, tecnico 31, productizable 27, diario 24, proyecto 20, persona 9, cliente 9, tema 5, bloqueado 5, referencia 3 | No |
| Línea de negocio (duplican `tema:`) | dbb 23, kapa21 22, venta 21, horek 11, cerebro 16, vega-central 4 | No |
| **Contenido** | ia 35, automatizacion 21, agentes 12, propuesta 11, hermes 5, abastos 5, memoria 4, crm 4, claude-code 4, api 4, seguridad 3, gohighlevel 3, api-gobierno 3, facturacion 2, shopify 2, obsidian 2… | **Sí** |

Conclusión: usar `tags` en crudo daría una columna de ~100 nodos, la mitad ruido. Hace falta un filtro.

## 3. Diseño propuesto

### 3.1 Dos propiedades, dos roles

| Propiedad | Rol en el mapa | Fuente |
| --- | --- | --- |
| `tema:` (línea de negocio) | **Color** de cada nodo y chips de filtro. Deja de crear nodos en L3. | Igual que hoy |
| `tags` de contenido | **Nodos de L3** («Temas»). Una nota puede colgar de varios. | Filtrados por lista |

Nuevo ajuste `temasDeContenido` (una por línea, `valor = nombre visible`), con el mismo formato que `temas`:

```
ia = Inteligencia artificial
agentes = Agentes
automatizacion = Automatización
seguridad = Seguridad
licencias = Licencias y open source
crm = CRM
memoria = Memoria y segundo cerebro
abastos = Abastos y mercados
facturacion = Facturación
api-gobierno = APIs de gobierno
```

Lo que no esté en la lista no crea nodo. Botón «Sugerir desde el vault» que lista los tags por frecuencia,
excluyendo los que coincidan con `temas` y con `tipo:` de página, para que Felipe marque cuáles son
contenido. Nada de clasificar con IA: es una decisión de taxonomía de la persona.

### 3.2 Nodos de L3

- Un nodo virtual por tema de contenido (no exige archivo en `wiki/temas/`). Si existe una página
  `wiki/temas/tema-<valor>.md`, el nodo la abre; si no, al tocarlo lista sus notas.
- Enlace nota→tema **con motivo implícito** «declara el tag `x`», para que el panel «por qué se conecta»
  siga teniendo respuesta y la Salud no lo cuente como «enlace sin motivo».
- Las 6 síntesis actuales (`wiki/temas/tema-*.md`) pasan a L2 (Conocimiento) o se quedan como hubs de
  color; a decidir en el crisol (§5, pregunta 2).

### 3.3 Orden dentro de las columnas

- **L0 Entrada: por fecha, descendente.** Fecha = `propiedadFecha` si existe, si no `AAAA-MM-DD` en el
  nombre, si no `mtime`. Es lo que Felipe espera de una columna llamada «Entrada».
- L1 y L2: se mantiene el orden por vecinos (menos cruces), pero **agrupando por tema de color** con
  una etiqueta de grupo al margen, para que Conocimiento deje de ser una pared.
- L3: alfabético o por número de notas; ajuste.

### 3.4 Compatibilidad

- Vault sin `temasDeContenido`: comportamiento idéntico al de hoy (L3 = valores de `tema:`). Nada cambia
  para quien ya usa el plugin. Se anuncia en el CHANGELOG como opción.
- `wiki-lint.sh` del Cerebro no cambia: `tema:` sigue obligatorio y sigue colgando de su síntesis.

## 4. Alcance y lo que NO entra

- No entra: clasificación automática de tags con IA; renombrar tags en el vault; cambiar `wiki-lint.sh`.
- No entra: rediseñar Entidades/Conocimiento más allá de la etiqueta de grupo (§3.3).
- Estimación: 1 sesión de build en la ventana del plugin (VS Code en `~/Documents/Proyectos/mapa-neuronal`).

## 5. Crisol · preguntas antes de construir

1. **¿Una nota puede colgar de varios temas de contenido?** Sí en el plan. Alternativa: solo el primer tag
   de la lista. Con varios, las curvas se multiplican (177 notas × ~2 tags).
2. **¿Qué pasa con las 6 síntesis actuales?** (a) Quedan en L3 como hubs de color junto a los temas de
   contenido; (b) bajan a L2; (c) desaparecen del mapa y solo son color. Recomendado: **(b)**.
3. **¿Fecha en L0 rompe el «menos cruces»?** Sí, habrá más cruces en L0. Se acepta: L0 es lectura por
   tiempo, no por estructura.
4. **¿Los tags de contenido merecen página propia en `wiki/temas/`?** Si sí, la ingesta del Cerebro tendría
   que crearlas; toca CLAUDE.md del vault. Recomendado: no por ahora; nodo virtual.

### Decisiones del crisol (28.09.2026, Felipe)

1. Varios temas por nota: cada nota enlaza a todos sus tags que estén en la lista.
2. Las 6 síntesis bajan a L2 (Conocimiento), con su color.
3. L0 siempre por fecha descendente cuando hay `temasDeContenido`, sin ajuste. Sin la lista, igual que hoy.
4. Nodo virtual: sin archivo en `wiki/temas/`. Si existe una página para el tag, el nodo la abre.

## 6. Secuencia de build (M4: una vez)

1. Ajuste `temasDeContenido` + parser + botón «Sugerir desde el vault» (settings y asistente).
2. Grafo: nodos virtuales L3 desde tags filtrados; `tema:` solo colorea; enlaces con motivo implícito.
3. Orden L0 por fecha; etiqueta de grupo en L1/L2.
4. Recorridos e2e: vault sin ajuste (igual que hoy) · vault con ajuste (L3 = contenido) · nota con 3 tags ·
   tag fuera de la lista no crea nodo · L0 en orden de fecha tras reiniciar.
5. `node pruebas/e2e/recorridos.cjs --vault ~/Documents/Cerebro.nosync/Cerebro` sin hallazgos.
6. Captura del mapa del Cerebro con la columna nueva → `docs/imagenes/`. Release 1.35.0.

## 7. Registro

- Incidente del mismo día: `data.json` del Cerebro perdió 2 capas y el mapeo de carpetas (causa no
  identificada; entre 27.09 13:37 y 28.09 19:15). Restaurado desde el commit `23565cf` del vault.
  Respaldo en `.obsidian/plugins/mapa-neuronal/data.json.respaldo-2026-09-28`. Vale la pena un
  recorrido e2e que detecte «capas reducidas por el asistente o la ingesta» antes del build.
