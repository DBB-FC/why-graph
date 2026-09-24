# Seguridad

*Español · [Read in English](SECURITY.md)*

## Reportar una vulnerabilidad

Abre un [aviso de seguridad privado](https://github.com/DBB-FC/why-graph/security/advisories/new)
en este repositorio. Por favor, no abras un issue público por una vulnerabilidad.

La primera respuesta llega dentro de una semana. No hay programa de recompensas.

## Por qué lee todas las notas del vault

La revisión automática del directorio marca este plugin por **enumerar el vault**, y tiene razón: el
mapa le pide a Obsidian la lista de todos los archivos markdown y los enlaces entre ellos. Un mapa de
tus notas no se puede dibujar con una parte de ellas.

Para qué se usa ese acceso, y para nada más:

- la ruta de la nota, para ubicarla en una capa y darle el color de su tema;
- sus enlaces, para dibujar las líneas;
- su texto, leído cuando hace falta, para encontrar la frase donde se escribió un enlace.

Todo queda en el vault. El plugin no tiene servidor y no hace ninguna petición a la red para nada de
esto. Las carpetas que excluyes en los ajustes nunca se dibujan. Las notas llegan a un proveedor de IA
solo en los dos casos que se describen abajo, y solo con una llave que tú configuraste.

## Qué hace el plugin con tus datos

- Tus notas se leen del vault y se quedan ahí. El plugin no tiene servidor ni telemetría, y no hace
  peticiones a la red a menos que uses una función de IA.
- ***Sugerir motivo* o *Resumir con IA*:** las una o dos notas involucradas se envían al proveedor de IA
  que **tú** configuraste, con **tu** llave.
- **Novedades** (apagado hasta que configuras una carpeta de material sin procesar y una carpeta del
  wiki): el material nuevo o modificado de esa carpeta, más las páginas del wiki a las que podría
  pertenecer, se envía a tu proveedor cuando aprietas *Buscar novedades*. El panel te dice cuántas
  llamadas va a hacer **antes** de enviar. Si enciendes *Preparar novedades al abrir Obsidian*, lo mismo
  ocurre en segundo plano al abrir, dentro de un tope diario de llamadas que tú fijas. Ese intercambio es
  entre tú y tu proveedor.
- Las llaves de la API se guardan en el almacenamiento local de Obsidian de cada dispositivo, nunca en
  `data.json`, así que no viajan por Obsidian Sync, git ni un respaldo.
- Los enlaces externos declarados en el frontmatter se abren solo si usan `http` o `https`; una URL
  `javascript:`, `file:` o `data:` dentro de una nota se ignora.
- El plugin escribe en una nota solo después de que aprietas Aprobar, y solo como una línea insertada;
  el texto que ya existía nunca se reescribe ni se borra. *Recortes sueltos* mueve notas de la raíz a
  una carpeta solo cuando aprietas *Ordenar*, sin editarlas.
- Para no enviar dos veces el mismo material, el plugin guarda `ingesta.json` en su propia carpeta:
  tamaños y huellas de lo ya enviado, nunca el texto.
