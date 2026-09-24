<div align="center">

<img src="docs/imagenes/icono.svg" alt="" width="76">

# Why Graph

**El grafo de Obsidian te muestra *que* dos notas están enlazadas. Este te muestra *por qué*.**

Hecho para [LLM wikis](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) · funciona con cualquier vault que tenga estructura

[![versión](https://img.shields.io/github/v/release/DBB-FC/why-graph?label=versi%C3%B3n&color=1FC8B4&style=flat-square)](https://github.com/DBB-FC/why-graph/releases/latest)
[![build](https://img.shields.io/github/actions/workflow/status/DBB-FC/why-graph/release.yml?label=build&color=34D17A&style=flat-square)](https://github.com/DBB-FC/why-graph/actions)
[![Obsidian 1.8.7+](https://img.shields.io/badge/Obsidian-1.8.7+-B79CFF?style=flat-square)](https://obsidian.md)
[![escritorio y celular](https://img.shields.io/badge/escritorio-%2B%20celular-5B95FF?style=flat-square)](#instalar)
[![MIT](https://img.shields.io/badge/licencia-MIT-F7931A?style=flat-square)](LICENSE)
[![sin telemetría](https://img.shields.io/badge/telemetr%C3%ADa-ninguna-2A3566?style=flat-square)](#todo-lo-dem%C3%A1s)

*Español · [Read in English](README.md)*

<img src="docs/imagenes/demo.webp" alt="Cinco vistas del mapa: las capas, una nota con sus motivos, las conexiones que faltan, un camino entre dos notas y la vista radial" width="100%">

<sub>Cinco vistas reales, sin maquetas: el mapa por capas · una nota con todos sus motivos · las conexiones que faltan · un camino entre dos notas · la vista radial</sub>

<a href="https://www.buymeacoffee.com/DbbLabs" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20beer&emoji=%F0%9F%8D%BA&slug=DbbLabs&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Invítame una cerveza" height="46"></a>

</div>

---

En un vault de unos cientos de notas, el grafo estándar es una madeja: bonita e inútil para
pensar. Why Graph ordena tus notas en capas, de izquierda a derecha, como la información se mueve
de verdad en una base de conocimiento — **lo que entra → de qué se trata → qué aprendiste → a qué
suma todo** — y sobre cada enlace pone la frase en la que ese enlace fue escrito.

No una suposición. La línea real de tu propia nota.

|   |   |
|---|---|
| **[Qué hace](#qué-hace)** · las cuatro cosas que te da | **[Instalar](#instalar)** · dos minutos |
| **[La primera vez](#la-primera-vez-en-un-minuto)** · el asistente lee tus carpetas | **[Tu propia IA](#tu-propia-ia-opcional)** · opcional, y gratis si es local |
| **[Qué espera de tu vault](#qué-espera-de-tu-vault)** · lee esto antes de instalar | **[Todo lo demás](#todo-lo-demás)** · ajustes, costo, privacidad, precisión |

## Qué hace

<table>
<tr>
<td width="50%"><img src="docs/imagenes/01-mapa.webp" alt="El mapa: cuatro capas, de izquierda a derecha"></td>
<td width="50%"><img src="docs/imagenes/02-panel.webp" alt="Una nota enfocada, con el panel listando cada enlace y su motivo"></td>
</tr>
<tr>
<td><b>Capas, no una madeja.</b> Tú decides qué carpetas van en qué capa. Dentro de una capa las notas se ordenan para minimizar los cruces, así que los caminos que ves son los que existen.</td>
<td><b>Cada enlace lleva su motivo.</b> El que tú curaste (<code>- [[nota]] — el motivo</code>) o la frase real de la nota donde aparece el enlace. Nada se inventa.</td>
</tr>
<tr>
<td><img src="docs/imagenes/03-camino.webp" alt="Un camino entre dos notas, con el motivo de cada salto"></td>
<td><img src="docs/imagenes/04-vacios.webp" alt="Conexiones que faltan: una lista para revisar primero con notas que deberían enlazarse y no lo están"></td>
</tr>
<tr>
<td><b>Caminos.</b> Eliges dos notas y lees la cadena más corta entre ellas, salto por salto, con el motivo de cada uno. Así te enteras de que dos proyectos que creías relacionados están a cuatro saltos.</td>
<td><b>Conexiones que faltan.</b> Una lista corta para <i>revisar primero</i>: notas que comparten vecinos pero no se enlazan, de temas que se conectan menos de lo esperable. Marca con ★ los temas que te importan —por ejemplo, proyectos y ventas— y los suyos salen primero. En mi propio vault encontró dos temas con <b>0 enlaces donde se esperaban ~26</b>.</td>
</tr>
</table>

Y además: una **vista radial** que centra una nota y muestra su mundo en anillos · **español e
inglés**, siguiendo el idioma de Obsidian · **el celular**, mismo mapa y gestos táctiles, sin una
build aparte · **exportar** a PNG, a un Canvas de Obsidian que puedes seguir editando, o a una
página HTML autónoma.

## Instalar

**Desde el directorio de la comunidad** — Complementos de la comunidad → Explorar → busca **Why Graph** → Instalar → Activar.

<details>
<summary>Las otras dos formas: BRAT, o a mano</summary>

### Con BRAT — lo instala y lo mantiene actualizado

1. Instala **Obsidian42 - BRAT** desde los complementos de la comunidad.
2. Paleta de comandos → **BRAT: Add a beta plugin for testing**.
3. Pega `DBB-FC/why-graph`.

BRAT lo instala, lo activa y lo actualiza en cada release.

### A mano

Descarga `main.js`, `manifest.json` y `styles.css` del
[último release](https://github.com/DBB-FC/why-graph/releases/latest) a
`<vault>/.obsidian/plugins/mapa-neuronal/`, y actívalo en Ajustes → Complementos de la comunidad.
No se necesita nada más: esos tres archivos son todo el plugin.

</details>

Se abre con el comando **Abrir mapa neuronal** (`Cmd/Ctrl+P`) o con el ícono de cerebro de la barra izquierda.

## La primera vez, en un minuto

1. **Un asistente lista tus carpetas** con una capa propuesta para cada una (Entrada / Entidades /
   Conocimiento / Temas / No mostrar). Cambia lo que se vea mal y aprieta Aplicar. Arriba puedes
   elegir otra plantilla de capas: LLM wiki, negocio (clientes y proyectos → ventas y operación),
   profesional (normas y servicios), académico o Zettelkasten. Al elegir una, tus carpetas se
   reparten por su nombre; las que tenías en *No mostrar* siguen ocultas, y *Qué significa cada capa*
   explica cada columna. No se crea ni se mueve
   nada en tu vault: una plantilla solo nombra las columnas. Si vuelves a abrirlo más tarde, arranca
   con las capas que ya tienes.
2. **Toca cualquier nota.** El panel lateral nombra su capa, su tema, un resumen de dos líneas y
   cada enlace con su motivo.
3. **`···` → Camino entre dos notas**, eliges dos y lees la cadena.
4. **El chip `⌁ revisar primero`**, para ver qué conexiones faltan y proponer o descartar cada una.

Eso es todo. Sin configuración más allá del asistente, y **sin ninguna llave de IA para nada de lo anterior**.

<details>
<summary>Ver el asistente y el menú de herramientas</summary>

![El asistente de capas: la plantilla arriba y cada carpeta con su capa propuesta](docs/imagenes/02-asistente.webp)

Todo lo demás vive en el menú de herramientas — la cápsula `⋯ herramientas` del mapa, o el menú `···` de la pestaña:

![El menú de herramientas, en grupos: caminos, vista radial, conexiones que faltan, modo salud; filtros y temas; exportar, recargar y el asistente de capas](docs/imagenes/07-herramientas.webp)

</details>

## Qué espera de tu vault

El mapa dibuja la estructura que ya tienes. **Si tus notas viven en una sola carpeta plana, sin
temas y sin motivos escritos, vas a ver una columna y poco más** — no es un error, es un retrato
honesto de un vault que todavía no tiene capas.

Rinde cuando tu vault tiene, o va hacia:

- **Carpetas que significan algo.** No `notas/`, sino fuentes, proyectos y personas, ideas, temas.
  Entre tres y cinco capas es el punto justo.
- **Una propiedad que agrupa notas** (`tema` por defecto, el nombre que quieras). Es lo que le da
  color a cada nota y hace colapsables los temas. Opcional: sin ella el mapa funciona igual, en un color.
- **La costumbre de decir por qué enlazas.** Cuando una nota lleva `- [[otra-nota]] — el motivo`, el
  panel muestra tus palabras. Cuando no, cae en la frase donde aparece el enlace — y la IA puede
  proponerte el motivo que falta para que lo apruebes.

<details>
<summary>Por qué un LLM wiki le saca más partido</summary>

Este plugin creció dentro de un vault construido sobre el patrón **LLM wiki** — el
[diseño original](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) de Andrej
Karpathy: fuentes crudas inmutables por un lado, un wiki curado que el LLM mantiene por el otro, y
un contrato escrito entre ambos. No exige ese patrón, y no nombra ninguna carpeta propia — pero esa
es la forma contra la que fue diseñado. Cualquier vault con estructura deliberada (PARA,
Zettelkasten con MOCs, un jardín digital con hubs de tema) obtiene el mismo beneficio.

Si llevas un LLM wiki, el mapa hace algo específico para ti: la capa cruda pasa a ser la primera
columna, el wiki curado las del medio y las síntesis la última — así ves de un vistazo si tus
fuentes se están destilando de verdad, o solo acumulando.

Si tu vault es plano hoy, el mapa sirve igual como diagnóstico: te muestra exactamente cuánto de tu
pensamiento está en una sola pila indiferenciada.

</details>

## Tu propia IA (opcional)

El mapa funciona **sin ninguna IA**. Si conectas una, puede proponer motivos para los enlaces que no
tienen, y resúmenes breves para las notas sin descripción.

Soportados: **Anthropic (Claude)**, **OpenAI**, **Google (Gemini)**, y cualquier **servidor local
compatible con OpenAI** (Ollama, LM Studio, LocalAI) — la opción local **no necesita llave, ni
internet, ni cuesta nada**. Los motivos se escriben en el idioma de tus notas, no en el de la interfaz.

Se aplican tres candados, sea cual sea el proveedor:

1. **Las citas las verifica el código.** El modelo tiene que devolver una cita literal de cada nota.
   El plugin busca esas citas en los archivos; si una no está, la propuesta queda marcada como no
   verificable y **no se puede aprobar**. Esto es lo que detiene la invención con aplomo.
2. **Una segunda revisión revisa a la primera**, comparando el motivo con las citas para cuidar
   negaciones y estados — *"decidimos no usar X"* no puede volverse *"usamos X"*.
3. **Nada se escribe sin ti.** Aprobar es un clic, y solo entonces el motivo entra en tu nota como
   una línea nueva. El texto que ya estaba nunca se reescribe.

**Novedades: del material crudo al wiki (1.32).** Configura una *carpeta del material sin procesar*
y una *carpeta del wiki* en los ajustes y, cuando hay algo nuevo, aparece un chip verde en el mapa
(contar es local y gratis). El panel *Novedades* salta lo ya enviado, las copias y los párrafos
repetidos, junta el resto en tandas y te dice cuántas llamadas hará **antes** de enviar nada. La IA
devuelve **novedades de una línea, agrupadas por la página a la que van**, cada una con una cita
literal que el plugin comprueba en el archivo: sin cita, no se aprueba. Se comparan con la página
actual: lo que ya estaba no se muestra y lo que choca va aparte, sin resolverse solo. Aprobar
inserta esa línea en su sección, con enlace a su fuente; **nunca se borra ni se reescribe nada**.
*Aprobar las seguras* lo hace de un clic. Opcional: preparar las novedades en segundo plano al abrir
Obsidian (apagado por defecto, con tope diario de llamadas), una nota de alias para no crear dos
veces el mismo cliente, y un interruptor para solo agregar a páginas que ya existen. Sin las dos
carpetas, nada de esto existe.

**Recortes sueltos.** El Web Clipper y el menú compartir del teléfono dejan notas en la raíz del
vault. Configura una *carpeta de recortes* y el mismo panel lista las notas de la raíz que nada
enlaza, con un botón para guardarlas ahí, en el computador y en el teléfono. Se mueven, nunca se
editan; si ya había una copia idéntica en la carpeta, la repetida va a la papelera. *Dejar aquí*
recuerda las notas que viven en la raíz. Vacío por defecto: nunca se mueve nada.

![Novedades: líneas agrupadas por página, lo que choca arriba y un clic para aprobar las seguras](docs/imagenes/08-novedades.webp)

<details>
<summary>¿Funciona con mi suscripción de Claude o ChatGPT?</summary>

**No, y ningún plugin puede.** Las suscripciones (Claude Pro/Max, ChatGPT Plus) pagan las
aplicaciones del propio proveedor; no existe una API pública que puedas autenticar con una
suscripción. La API es un producto aparte, que se cobra por token con saldo prepagado.

Tres formas de resolverlo:

- **IA local — gratis.** Ollama o LM Studio en tu propia máquina: sin llave, sin costo, y tus notas
  nunca salen del computador. Esta es la respuesta si no quieres pagar por uso.
- **Tu propia llave.** Unos centavos por sugerencia — alrededor de **US$0,04** con Claude Opus 5.
  Las cuentas nuevas de API traen saldo gratis para probar.
- **Sin IA.** La IA solo propone motivos para los enlaces que no tienen uno; todo lo demás —capas,
  caminos, conexiones que faltan, radial, exportar— nunca hace una llamada a la red.

Los plugins que parecen funcionar con "una suscripción" hacen una de dos cosas: usan un modelo local
(gratis, como la opción de arriba), o pagan la API con la llave del desarrollador y te cobran una
suscripción por eso — lo que significa que **tus notas pasan por su servidor**. Este plugin no tiene
servidor, así que ese canje no está sobre la mesa.

</details>

<details>
<summary>Cómo configurarla, y la precisión medida</summary>

Cuatro campos: eliges el proveedor, pegas tu llave, escribes el modelo y aprietas **Probar la
conexión** — una llamada mínima que te dice si responde, sin enviar ninguna nota. La llave se guarda
solo en este dispositivo.

![La sección de IA en los ajustes: proveedor, llave y el botón de probar](docs/imagenes/06-ia.webp)

Cada aprobación queda registrada (fecha, modelo, citas, texto resultante) en una nota bajo la
carpeta de auditoría, para que puedas revisarla o deshacerla después.

### Precisión medida

Sobre un vault real de 254 notas y 916 enlaces, en una muestra reproducible de 44 enlaces revisados
a ciegas contra las notas de origen:

| | Correctos | Errados o inventados | No verificables (bloqueados) |
|---|---|---|---|
| Primer intento: modelo chico, solo la frase del enlace | 48 % | 16 % | — |
| Método actual: notas completas + citas verificadas + segunda revisión | **97,7 %** | **0 %** | 2,3 % |

Esa medición se hizo con **Claude Opus 5**. Con otros modelos los candados siguen puestos —una
propuesta sin citas verificables igual no se puede aprobar— pero la tasa de acierto no está probada;
trátala como desconocida hasta medirla en tu propio vault.

</details>

## Todo lo demás

<details>
<summary><b>Cómo funciona</b> — el camino completo, del vault a un motivo aprobado</summary>

![Arquitectura: del vault al mapa, y cómo se aprueba un motivo](docs/imagenes/arquitectura.png)

Todo lo que está arriba de la caja punteada de IA ocurre dentro de tu computador, sin ninguna llamada
a la red. A la IA se llega solo cuando pides una sugerencia, con tu llave; y lo que proponga tiene
que sobrevivir a la verificación de sus citas por código y a tu aprobación antes de que se escriba
una sola línea en tu nota. La versión interactiva de este diagrama está en
[`docs/diagramas/mapa-neuronal.html`](docs/diagramas/mapa-neuronal.html) — descárgalo y ábrelo en un
navegador.

</details>

<details>
<summary><b>Ajustes que vale conocer</b></summary>

| Ajuste | Qué cambia |
|---|---|
| **Capas** | Una línea por capa: `Nombre \| descripción`. Entre tres y cinco funciona mejor. |
| **Carpetas** | Qué carpeta va a qué capa. El asistente lo escribe por ti. |
| **Propiedad de tema** | La propiedad del frontmatter que agrupa y colorea las notas (por defecto `tema`). Vacío = sin temas. |
| **Notas visibles por capa** | En vaults grandes cada capa muestra sus notas más conectadas; el resto aparece al buscarlas o abrirlas. Por defecto 150. |
| **Carpetas de fuentes** | Una por línea. Si tus notas citan archivos por su ruta (`raw/articles/algo.md`, un PDF, una carpeta de un día), esos archivos aparecen como fuentes. `carpeta/*` agrupa cada subcarpeta en un nodo. Vacío por defecto: sin carpetas, el mapa es el de siempre. |
| **Mostrar fuentes citadas** | `Bajo demanda`: las fuentes aparecen al tocar la nota que las cita y se van con ella. `Todas`: siempre en la primera capa. `No mostrar`. Quien ya las tenía encendidas sigue en `Todas`. |
| **Sección de conexiones** | El título al final de cada nota donde se escriben los motivos aprobados. |
| **`hub: true`** (frontmatter) | En la última capa, la nota que lleva el nombre del tema en el mapa. Si varias notas comparten tema allí, solo la hub se rotula con el tema; las demás con su título. Sin la propiedad, es la primera. |
| **Recargar ajustes desde data.json** (comando) | Si editas `data.json` a mano, vuelve a leerlo sin reiniciar Obsidian. |
| **Exportar datos (JSON y CSV)** (herramientas) | El grafo tal como el plugin lo cuenta: nodos, enlaces con motivo y frase, y las reglas de conteo. Para Python, hojas de cálculo o Graphify. |
| **Solo enlaces de largo alcance** (herramientas) | Muestra solo los enlaces que saltan dos capas o más: dónde dos mitades del vault se tocan de punta a punta. |
| **Propiedad de enlaces externos** | Propiedades del frontmatter con enlaces web (`Título \| https://…`, `https://…`, `usuario/repo`). Vacío = la sección no aparece nunca. Solo se abren `http`/`https`. |
| **Propiedad de fecha de modificación** | Si la escribes, aprobar un motivo o un resumen también pone la fecha de hoy en esa propiedad. Vacía por defecto: el plugin no toca tu frontmatter. |
| **Animación** | Pulsos de luz que viajan por los enlaces. Solo mientras el mapa está visible, y apagada si tu sistema pide reducir el movimiento. |
| **Carpeta del material sin procesar · Carpeta del wiki** (Novedades) | De dónde se lee lo nuevo y adónde van sus novedades. Vacías por defecto: sin chip, sin panel, sin comando. |
| **Preparar novedades al abrir Obsidian** | Apagado por defecto. Encendido, tu IA prepara las novedades en segundo plano, hasta el **tope de llamadas automáticas al día** (30). Dos dispositivos con el mismo vault no preparan dos veces lo mismo. |
| **Permitir crear páginas** · **Archivo de alias** | Apagado = solo agrega a páginas que existen. La nota de alias (`- **Nombre** \| \`carpeta/página\`` con `aliases: "…"` debajo, o `- [[página]]` con `alias: a, b`) evita que «Acme SpA» se vuelva una segunda página de «Acme». |
| **Ignorar en la ingesta** | Copias y resúmenes que no vale la pena enviar dos veces. Por defecto `*.mini.md, *digest*`. |
| **Carpeta de recortes · Se quedan en la raíz** | Adónde se proponen guardar las notas sueltas de la raíz, y cuáles nunca. Vacío por defecto: no se mueve nada. |

</details>

<details>
<summary><b>Cómo se cuenta</b> — qué es un nodo, qué es un enlace, para que los números cuadren</summary>

Un usuario reimplementó el motor en Python para predecir los conteos antes de tocar su vault, y
le cuadraron. Estas son las reglas, escritas una sola vez (también van dentro del JSON exportado):

- **Nodo:** cada archivo `.md` dentro de una carpeta asignada a una capa, menos los excluidos.
  Gana la carpeta más específica. Las fuentes citadas por ruta no cuentan como notas.
- **Enlace:** un par **no dirigido** de notas del mapa unidas por al menos un `[[wikilink]]`
  resuelto. A→B y B→A son un solo enlace. Los auto-enlaces y los enlaces a notas fuera del mapa
  se ignoran.
- **Motivo:** el texto de `- [[nota]] — motivo` en la sección de conexiones; si no hay, la primera
  línea del cuerpo donde aparece el enlace.
- **Tema:** la propiedad de tema del frontmatter; si falta, el tema más frecuente entre sus vecinos.
- **Hub:** por tema, la nota de la última capa con `hub: true`; si ninguna lo tiene, la primera de
  esa capa con el tema declarado.
- **Orden dentro de una capa:** por tema, luego por baricentro ponderado de sus vecinos (las capas
  contiguas pesan 1, las lejanas 1/distancia), seis pasadas.
- **Fuera del mapa:** las notas que no caen en ninguna carpeta con capa se cuentan en la cabecera
  y se avisan al cargar, igual que las carpetas configuradas que no tienen notas.

</details>

<details>
<summary><b>Costo y privacidad</b> — a dónde van tus notas, y dónde vive tu llave</summary>

- Tus notas van al proveedor que **tú** elijas, con **tu** llave, a **tu** costo. El plugin no tiene
  servidor. El autor nunca ve tus notas, tus llaves ni tus consultas.
- Las llaves se guardan por dispositivo en el almacenamiento local de Obsidian — nunca en
  `data.json`, así que no viajan por git, ni por Obsidian Sync, ni en un respaldo.
- No se envía nada hasta que pides una sugerencia o las novedades, o activas *Preparar novedades al
  abrir Obsidian*, que viene apagado y tiene tope diario. Abrir el mapa, navegarlo, los caminos y
  las conexiones que faltan hacen **cero** llamadas a la red.
- Costo aproximado por sugerencia con Claude Opus 5: dos notas de contexto más la revisión. Un vault
  con cien enlaces sin motivo cuesta unos pocos dólares recorrer completo — y nunca tienes que
  hacerlo de una sola vez.
- El proveedor local (Ollama) no envía nada a ninguna parte: sin llave, sin internet, sin costo.

</details>

<details>
<summary><b>Lo que ahorra un motivo escrito</b> — medido, y con su trampa declarada</summary>

![Costo medido en tokens con y sin la estructura: 115x, 45x y 9x](docs/imagenes/ahorro-es.svg)

El plugin no ahorra tokens por sí mismo — los ahorra la estructura, y el plugin es lo que hace
imposible ignorar lo que falta. Su propia función de IA *gasta* tokens: unos 3.900 de entrada por
sugerencia, alrededor de **US$0,04** con Claude Opus 5.

Lo que rinde es la otra dirección. Un motivo se escribe una vez y se lee muchas: por ti, y por
cualquier agente que trabaje contra tu vault. Las tres filas de arriba se midieron en el vault del
autor —254 notas, 916 enlaces, ~147.800 tokens de wiki— contando caracteres ÷ 3,7 y comparando lo que
cuesta responder cada pregunta con y sin la estructura escrita. Tus números van a diferir; lo que
viaja son las proporciones.

La trampa está declarada en el gráfico: nadie vuelca un wiki entero en cada pregunta — un agente
busca. La comparación que se sostiene es la primera fila, **leer el motivo en vez de abrir las dos
notas**, y esa es 115×.

</details>

<details>
<summary><b>¿Cambia mis notas?</b></summary>

Solo cuando aprietas **Aprobar** en una sugerencia de IA, y solo como una línea agregada en la
sección de conexiones de esa nota. El texto que ya existía nunca se reescribe ni se reordena, y tu
frontmatter no se toca a menos que llenes el ajuste *Propiedad de fecha de modificación*, que viene
vacío.

*Novedades* escribe igual: cada novedad aprobada es **una línea insertada** en la sección de la página
del wiki a la que va, con enlace a su fuente. Una página nueva se crea solo si *Permitir crear
páginas* está encendido. El plugin guarda además `ingesta.json` en su propia carpeta: tamaños y
huellas de lo ya enviado (nunca el texto), las llamadas del día y qué dispositivo está preparando.
*Recortes sueltos* solo mueve las notas que guardas, con el renombrar de Obsidian (los enlaces se
actualizan), y manda las repetidas a la papelera.

Todo lo demás —capas, colores, caminos, conexiones que faltan, exportaciones— es de solo lectura.
Las exportaciones son la otra escritura: un PNG en la carpeta que elijas.

No hay telemetría, ni analítica, ni servidor: el plugin no hace ninguna petición de red salvo las
llamadas de IA que tú pidas (o la preparación en segundo plano que actives), al proveedor que
configuraste.

Sí lee la lista de todas las notas de tu vault —un mapa no se puede dibujar con una parte— y los
archivos del release llevan [atestaciones de GitHub](https://github.com/DBB-FC/why-graph/attestations),
así que puedes verificar que se construyeron desde este código:

```bash
gh attestation verify main.js --repo DBB-FC/why-graph
```

</details>

<details>
<summary><b>Fuentes: de dónde salió cada nota</b></summary>

Con cualquier vault ves el mapa. Si además tus notas citan sus fuentes por ruta —como hace un
LLM wiki, con sus fuentes crudas en una carpeta— el mapa ve también de dónde salió cada cosa:

- **Bajo demanda.** Tocas una nota y aparecen a su lado los archivos que cita; tocas otra y
  cambian. La primera capa no crece con cada captura.
- **La ficha de una fuente** abre el archivo original, lista qué notas la citan y salta a la línea
  exacta de la cita.
- **Referencia rota.** Una nota que cita un archivo que no existe se ve en rojo en modo salud.
- **Fuentes sin vínculo.** En «⋯ herramientas», una lista de los archivos de tus carpetas de
  fuentes que ninguna nota del mapa cita, con el contador «citadas: X de Y» y su alcance. Dice solo
  eso: no dice si los procesaste. El significado se lo da tu flujo, no el plugin.
- **El buscador** encuentra fuentes, notas ocultas y miembros de temas colapsados.

Una cita es una ruta explícita: entre acentos graves, en un `[[wikilink]]`, en un enlace, o suelta
hasta el primer espacio. Citar una carpeta no equivale a citar cada archivo que contiene.

</details>

<details>
<summary><b>Vaults grandes, y cómo se ve</b></summary>

Probado en un vault de **5.043 notas y 17.526 enlaces**. Cada capa dibuja sus notas más conectadas
(150 por defecto) y revela el resto a pedido, así el mapa sigue siendo interactivo en vez de dibujar
un rectángulo gris. La vista radial limita cada anillo a 80.

El mapa se dibuja sobre un lienzo oscuro tanto en el tema claro como en el oscuro de Obsidian —como
un cielo nocturno, para que los colores de los temas y los pulsos de luz de los enlaces se sigan
leyendo. El panel, las cápsulas y los ajustes siguen tu tema.

</details>

<details>
<summary><b>Construir desde el código</b></summary>

Todo sale de `src/`; el release es una pasada de esbuild, sin minificar.

```bash
npm install
npm test        # construye src/main.js → main.js y revisa las traducciones
npx eslint src/ # el linter oficial de plugins de Obsidian
./instalar-en-vault.sh /ruta/a/tu/vault
```

`src/main.js` es el código. El `main.js` de la raíz es el resultado de la compilación y no se
commitea — lo llevan los releases. La compilación es una sola pasada de esbuild, sin minificar, para
que el archivo publicado se siga leyendo.

La animación del README se genera igual, desde el plugin real sobre un vault de demo:
`./pruebas/mirador/demo.sh`.

</details>

<details>
<summary><b>Licencia</b></summary>

[MIT](LICENSE). Libre para cualquier cosa —personal o comercial— y puedes bifurcarlo, cambiarlo y
redistribuirlo, conservando el aviso de copyright.

El plugin no cobra nada y no tiene versión de pago. El directorio de Obsidian igual lo etiqueta como
**pagos opcionales**, porque puede conectarse a servicios de IA que te cobran directamente con tu
propia llave; el proveedor local (Ollama, LM Studio) no cuesta nada.

</details>

## Soporte

Errores e ideas: [issues de GitHub](https://github.com/DBB-FC/why-graph/issues). Incluye tu versión
de Obsidian, tu plataforma, y el número de notas y enlaces que muestra el encabezado del mapa.

---

<div align="center">

<a href="https://dontbuybuild.cl">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/imagenes/dbb-labs-oscuro.svg">
    <img alt="DBB Labs" src="docs/imagenes/dbb-labs-claro.svg" height="26">
  </picture>
</a>

Hecho por **Felipe Córdova** · Powered by **[DBB Labs](https://dontbuybuild.cl)**

### Don't Buy. Build.

<sub>Es el nombre de la empresa, no un eslogan: un estudio de sistemas a medida.<br>Compre lo estándar. Construya lo estratégico.</sub>

<sub>Gratis, MIT, sin versión de pago. Si el mapa te mostró algo que no habías visto, una cerveza se
agradece — y si no, el plugin funciona exactamente igual.</sub>

<a href="https://www.buymeacoffee.com/DbbLabs" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20beer&emoji=%F0%9F%8D%BA&slug=DbbLabs&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Invítame una cerveza" height="46"></a>

</div>
