# Vídeos con el mundo base (léeme antes de empezar un vídeo)

Desde el 08/10/2026 un vídeo es **una carpeta aquí con un solo archivo: `clip.json`**. Dentro va la tabla de pulsos: qué jugada pasa, cuándo y con quién. El motor (`motor/jugadas.js`) la toca entera, y todo lo demás ya existe:
- mundo, personas, hilo, burbuja, tarjeta y chip;
- sonido (`sonido/mezcla.py`);
- final con el logo;
- render;
- revisión.

Modelo: `prueba-3d-2d/clip.json` (10,4 s más el final; usa todas las jugadas). **Para empezar, copia esa carpeta y cambia la tabla.**

## El camino de un vídeo (objetivo: ~1 h)
| Paso | Comando o acción (desde `videos/_base/`) | Tiempo |
|---|---|---|
| 1. Escribir `clip.json` | Pasar el guion del otro chat a pulsos (tabla de jugadas, abajo). | 15-25 min |
| 2. Vista instantánea | `python motor/video.py videos/<n> vista`, abrir `gm-vista` (launch.json) en `index.html?vista=0.3` y en el navegador usar `await gmVer(t)`. | 1 s por fotograma |
| 3. Revisión en la vista | `await gmQC()`: cabezas fuera o tapadas con el cuerpo visible, burbujas fuera de sitio o encima del chip, texto de tarjeta pequeño. Tiene que salir `[]`. | 6 s |
| 4. Borrador | `python motor/video.py videos/<n> render --borrador`: mp4 a 30 fps, con sonido. | ~3 min |
| 5. Revisión del mp4 | `python motor/qc.py videos/<n>`: duración, blancos, trama quieta, empalme y sonido. Saca `qc/hoja-mp4.jpg` y `qc/ciegas.jpg`. | 15 s |
| 6. Prueba a ciegas | Un Sonnet nuevo mira SOLO `qc/ciegas.jpg` y cuenta qué pasa. Si no sale la frase del guion (mínimo 4/5), se arregla antes de enseñarlo. | 2 min |
| 7. Dil ve el borrador | Se le manda el mp4 del borrador; cambia lo que diga. | |
| 8. Final | `python motor/video.py videos/<n> render`, luego `qc.py` y copiar a `finales/redes-sociales/`. | ~6 min |

Un grupo de tres: mientras se renderiza el borrador del 1, se escribe el `clip.json` del 2. Una tanda a la vez (candado común).

## clip.json
```json
{ "name": "...", "size": [1080, 1920], "duration": 10.4, "ending": true,
  "sitio": { "tipo": "sala-espera", "opts": { "disposicion": "v41" } },
  "reparto": { "chico": { "asiento": { "z": -1.5, "n": 2 }, "hold": { "R": "phone" }, "emocion": 4 } },
  "foco": "chico", "chip": "LIVE | WEEK 06",
  "tarjetas": { "coach": { "label": "coach", "num": "01", "title": "Coach", "sub": "from €1.05/min", "icon": "chat" } },
  "pulsos": [ { "t": 0, "dur": 2.7, "jugada": "dibujar-sitio", "quien": ["chico"] }, ... ],
  "golpes_extra": [ { "t": 4.0, "tipo": "tic" } ] }
```
- **Fijo:** `cell` 4 y `camStep` 12. Son los valores por defecto; no se tocan salvo que Dil lo pida.
  - Con la celda 6, las personas salen como manchas.
  - La cámara a saltos la eligió Dil el 08/10.
- **`duration`:** la historia sin el final. Con `ending: true` se añaden los 6,6 s del final de siempre (`final/logo.html`).
- **`sitio.tipo`:** `sala-espera` (opciones en `sala-espera/CATALOGO.md`) o `edificio` (`edificio/CATALOGO.md`). `ocultar`: nombres de piezas que estorban (por defecto, `sala:muro-frente`).
- **`reparto`:** id del elenco (ver `personajes/CATALOGO.md`) con estos campos:
  - `asiento` (número o `{z, n}`: la fila a esa profundidad, n-ésimo de izquierda a derecha);
  - o bien `pos` y `rotY`;
  - `pose`, `hold` y `emocion` (0 a 5).
- **`tarjetas`:** las de la serie. Siempre el diseño del anuncio; solo cambia el contenido. Iconos: `chat`, `hourglass`, `heart`.
- **Sonido:** los golpes salen solos de los pulsos (corte, lápiz, burbuja, tarjeta, naranja, resolver, subida). `golpes_extra` sirve para sonidos sueltos. Tipos: `sonido/LEEME.md`.

## Capítulos (varios sitios o luces en un vídeo)
`"capitulos": [{desde, sitio, reparto, foco, coleccion, pulsos}, ...]` en lugar de `sitio/reparto/pulsos`: cada capítulo se construye entero (su mundo, sus luces, su gente, sus pulsos con tiempos absolutos) y solo se ve el del momento. Para pasar de uno a otro: `borrar-sitio` al final del capítulo y `dibujar-sitio` al empezar el siguiente. Ejemplo: `edificio-vivo/hacer_clip.py` (mañana, sala de espera, consulta, tarde, noche).

## Jugadas (el vocabulario de los pulsos)
| jugada | campos | qué hace |
|---|---|---|
| `dibujar-sitio` | `t, dur (2.7), quien: [ids]` | Como la v4.1. El hilo traza el contorno de cada cosa desde arriba a la izquierda, en el sentido de las agujas del reloj:<br>1. primero el cuadro del sitio;<br>2. luego hasta 6 objetos, de izquierda a derecha;<br>3. por último las personas (la última de `quien` es la protagonista).<br>Cada cosa se rellena al cerrarse su contorno; lo pequeño entra junto como «detalles». Al acabar, el hilo descansa como un rizo sobre la cabeza de la protagonista. |
| `camara-plano` | `de, alto (3.0), giro, alza` | Vista plana de frente, el 2D de antes. `alto` = metros de alto que entran en el plano. |
| `abrir-3d` | `de, dur (1.4), giro (32), alto (1.9), fov (52), alza (9)` | De la vista plana al 3D: aparece la perspectiva y la cámara gira. |
| `camara` | `de, dur, lado (-30), alza (-11), dist (2.25), fov (50), deriva, mira` | Corte seco a un ángulo alrededor de la persona; deriva despacio. `alza` negativa = desde abajo. |
| `coger-movil` / `dejar-movil` | `quien, dur` | Sube o baja el móvil (sentado, con `hold R: phone`). |
| `emocion` | `quien, nivel` | Cambia la densidad del garabato. |
| `resolver` | `quien, dur (0.9)` | Desenredo: el garabato se desenrolla en un hilo que sube y se enrolla en la espiral, y la cabeza se aclara. |
| `burbuja` | `quien, dur (mín. 1,3), cara, lado` | LA burbuja, dibujada por el lápiz: el hilo llega desde la cabeza, traza el contorno y dibuja la carita (~1,1 s). Caras: `neutral worried sad surprised happy curious`. La patita va sola hacia la cabeza; `lado: 'L'/'R'` la fuerza. |
| `tarjeta-en-sala` | `quien, tarjeta, dur (mín. 1.9), donde, camara` | El hilo viaja desde la cabeza y traza SOLO el borde; la tarjeta (con grosor, balanceo y sombra de puntos) se rellena y su interior entra como en la v4.1 (letras que suben desde un desenfoque, icono que se construye) mientras el lápiz subraya el título. Se va sola con la siguiente tarjeta o a los ~3,2 s. `camara: false` = no mueve la cámara (pon tú un `camara`). |
| `tarjeta-pantalla` | `tarjeta, dur` | La cámara empuja, la tarjeta gira a cámara y se abre el fondo naranja (el aspecto del anuncio); el hilo hace su arco. |
| `tarjeta-al-movil` | `quien, tarjeta, dur (0.6)` | Va con una `camara` en el MISMO `t`: corte escondido bajo el naranja, la tarjeta vuela al móvil y el naranja se cierra. |
| `subir-al-logo` | `quien` | El mundo baja, el hilo sube desde la cabeza y empalma con el final. Siempre el último pulso, unos 0,85 s antes de `duration`. |
| `camara` (con sitio) | `nombre` (cámara del catálogo) o `pos, look, fov`; `dur, deriva, empuje, cerca` | Corte a una cámara fija con deriva lenta. En el edificio, con `sitio.frente` (-0.3) la cámara nunca entra detrás del frente abierto. Mejor para mirar dentro del edificio: cámara fuera (z 30) y `cerca` = distancia del punto mirado al plano que recorta (3,05 con `look` en z -3: recorta la calle y deja la casa de muñecas). `cerca` vale también en `recorrido`. |
| `recorrido` | `puntos: [{t, pos, look, fov} o {t, nombre}]` | Cámara continua por puntos (spline suave). |
| `colocar` | `quien, pos, giro (grados), pose, hold` | Cambia a alguien de sitio en un corte. |
| `caminar` | `quien, de, a, dur, pose ('walk'), fin, giro, hold` o `ruta: [[x,y,z],...]` (`de: false` = empieza en el primer punto) | Anda de A a B, o por una ruta; en los tramos con pendiente sube con `stairs-up` (rutas de la escalera: `edificio/rutas.js`, `subir(desde, hasta)`). Sin `dur`, a 1,25 m/s. |
| `pose` | `quien, pose, dur (0.5), hold, mira [x,y,z], giro` | Cambia de pose con mezcla suave; `hold` cambia el objeto (dar una llave = quitarla a uno y dársela a otro). |
| `vida` | `quien, pose, periodo` | Pose en bucle (tejer `knit`/`knit-sit`, `drum`, `knead`, `paint`, `rock`, `water`, `type`, `read`). Solo se mueve si se ve. |
| `chip` | `texto` | El lápiz traza la caja del chip y el texto sube letra a letra. Sin `chip` en los pulsos vale el `chip` de siempre. |
| `dibujar-vivienda` | `t, dur (0.6-1.4), viviendas [ids], objetos [nombres], quien [ids], sin [ids]` | El lápiz dibuja esas casas (y su gente) antes de que llegue la cámara; `sin`: gente de esa casa que está en otro sitio (si no, queda oculta hasta que se dibuja la casa). |
| `borrar-sitio` | `t, dur (2.7)` | El lápiz deshace todo lo dibujado, lo último primero; acaba en papel en blanco (bucle). |
| `garabato` | `t, dur (1.0), quien, icono, lado ('L'/'R')` | El lápiz dibuja un dibujito 2D (`motor/garabatos.js`: ovillo, hueso, auriculares, baquetas, osito, zapatilla, bebe, mapa, regadera, pincel, gato, pan, llave, casa, corazon, taza) junto a `quien`; luego vuela a la colección que flota sobre `coleccion.de` (clave del clip). |
| `abanico` | `t, dur, centro` | La colección se abre en un aro grande alrededor de `centro`. |
| `repartir` | `t, dur (2.0)` | Cada dibujito vuela de vuelta a su vecino y se va (invitación). |
| `burbuja` con `texto` | `texto` (1-3 palabras, inglés) | La misma burbuja, más ancha; la palabra entra letra a letra (no la escribe el lápiz). |

**El hilo nunca se para:** entre tareas da una vuelta lenta sobre la cabeza de quien protagoniza (o viaja a lo siguiente).
**Bucle sin final:** `"ending": false, "bucle": true, "bpm": 112` (60 s = 28 compases); `qc.py` compara primer y último fotograma.

**¿Falta una jugada?** Se añade UNA vez en `motor/jugadas.js`, se apunta en esta tabla y en `sonido`, y queda para todos los vídeos. Si es algo de un solo vídeo, un `clip.js` propio puede importar `jugadas.js` y añadir lo suyo (con `"module": "clip.js"` en `clip.json`). Referencia del primer clip escrito a mano: `prueba-3d-2d/clip-a-mano.js.txt`.

## Piezas por dentro (todas en `motor/`)
| Pieza | Archivo | Uso |
|---|---|---|
| Jugadas | `jugadas.js` | Toca `clip.json`; también `qc(t)` para `gmQC()`. |
| Hilo en pantalla | `hilo2d.js` | `thread(svg).set(puntos, punta)`, `hop`, `part`, `cr`, `SEAM` (empalme). |
| Burbuja | `burbuja.js` | Una forma (mensaje de WhatsApp) y un tamaño. |
| Tarjeta | `tarjeta.js` | `tarjeta({...})`, `.show(k)`, `.outline()`. Va en la capa nítida. |
| Poses suaves | `personas.js` | `blendPose(persona, [A, opts], [B, opts], k)`. |
| Página del vídeo | `video.html` | Capas: mundo retro, fondo naranja, 3D nítido, hilo y burbujas, y chip. |
| Comandos | `video.py`, `qc.py` | `snap`, `vista`, `render [--borrador]`, y revisión del mp4. |

## Lo aprendido (no repetir)
- **Vista:** después de editar con `sed` (cambia el archivo y rompe el enlace), vuelve a lanzar `vista`. El servidor es `motor/servidor_vista.mjs` (Node; el de Python cortaba three.js con ERR_CONNECTION_RESET), en el puerto 8767 y sin caché. Si la página no carga, cierra las pestañas viejas del navegador: cada una con 3D se come recursos.
- **El hilo lleva un halo claro** para leerse sobre zonas oscuras; se quita solo en la subida al logo.
- **HyperFrames va fijado en `videos/package.json` (0.8.142).** Los scripts usan ese binario; con `npx` se perdieron 32 min descargando. Cambiar de versión solo entre grupos, y probarla con la prueba.
- **Para mostrar `field` o `hud`:** `style.display = 'block'`, nunca `''`.
- **Fotogramas:** la vista instantánea es para mirar; `snap` (3 min de arranque) solo si hace falta una hoja de alta calidad, y entonces UNA tanda con todos los momentos.
- **Nunca matar un render que trabaja:** el registro en `render/render.log` va en vivo.
- **Medidos el 08/10:** fotograma en la vista, 0,3-0,9 s; `gmQC` de 10 s, 6 s; borrador, ~3 min; final de 17 s, ~6 min; `qc.py`, 15 s.
