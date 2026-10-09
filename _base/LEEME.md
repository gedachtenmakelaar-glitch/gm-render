# Mundo base GM (léeme primero)

La base reutilizable de todas las historias desde el 08/10/2026. Es un mundo 3D de verdad, con materiales grises, que el motor convierte en trama retro: puntos navy y naranja sobre beige, como los objetos de las tarjetas del anuncio v4. Hay un solo modelo y una sola cámara, así que cualquier ángulo cuadra con el sitio. Sustituye al `archivo/_kit/` 2D para todo lo nuevo.

| Carpeta | Qué hay | Catálogo |
|---|---|---|
| `motor/` | `gm3d.js`: piezas, tonos, luces, cámaras, modelos, hilo grueso, siluetas y `drawOn`, el hilo que dibuja. `still.py`: imágenes retro. `retro.js`: el retro en vídeo. `personas.js`: de dónde salen las personas (+ `blendPose`). Vídeo: `video.py` + `video.html`, `hilo2d.js` (el hilo en pantalla), `burbuja.js` (LA burbuja), `tarjeta.js` (LA tarjeta), `recursos/` (fuentes e icono). | `CONTRATO.md` |
| `edificio/` | Bloque holandés de 22 m: planta baja con panadería y portero, 5 pisos, ático y sótano, con 17 espacios y su vecino en cada uno. Casas de canal a los lados, calle con tranvía, bicis, canal y barco, y ciudad al fondo. Movimiento: coches, ciclistas, paseantes, gaviotas, palomas y nubes. Luz de día, tarde y noche. Unas 80 cámaras. | `edificio/CATALOGO.md` |
| `sala-espera/` | La sala de la v4.1 rehecha y modular: variante pública o consultorio, 4 disposiciones, cuánta gente, recepción, noche, asientos con anclas y 9 cámaras. | `sala-espera/CATALOGO.md` |
| `personajes/` | 13 personajes, más perro y gato. Esqueleto completo con 12 agarres (el móvil en la palma), más de 40 poses, poses de dos, cabeza de garabato del 0 al 5 o resuelta, y 10 objetos de mano. | `personajes/CATALOGO.md` |
| `modelos/kenney/` | 895 modelos CC0 (muebles, comida, coches, calles, naturaleza). Se cargan con `modelo()` y salen en nuestro estilo. | `CONTRATO.md` §9 |
| `videos/` | **Los vídeos.** Una carpeta por vídeo (`clip.json` + `clip.js`); `prueba-3d-2d/` es el modelo a copiar. Cómo se hace: `videos/LEEME.md`. | `videos/LEEME.md` |
| `final/` | `logo.html`: el final de siempre (6,6 s, aprobado; copia del kit). `video.py` lo añade solo. | |
| `hojas/` | Las hojas de entrega para Dil (numeradas). Se rehacen con `motor/rehacer-todo.sh` y `python motor/hojas_finales.py`. | |

## Reglas que mandan aquí
- `CONTRATO.md`: quién toca qué, unidades, aspecto y una sola tanda de imágenes a la vez.
- **El hilo lo construye todo** (§8): las cosas no aparecen, las dibuja el hilo.
- Diseño de las historias: `videos/_docs/DISENO-HISTORIAS.md`.

## Lo que falta antes del primer vídeo de verdad (08/10, tras la prueba 3D/2D)
- Movimiento de la trama: medido; con cámara suave los puntos resbalan. Dil eligió cámara a saltos (`camStep` 12, por defecto).
- La cabeza resuelta no muestra la espiral encima en el vídeo de prueba (revisar `setEmotion(0, true)`).
- Sonido: la prueba es muda; falta llevar la cama musical y los efectos del kit (`archivo/_kit/tools/audio`) al motor de vídeo.
- Render: 17 s con 4 personas en ~6 min (bien).

## Pendiente tras la prueba 3D/2D (Dil, 08/10; para lo próximo, el vídeo no se toca)
- **Tarjeta con profundidad 3D de verdad** (`motor/tarjeta.js`): canto visible en capas, sombra que se separa y balanceo, como en el anuncio. Ahora se ve plana.
- **Interior de la tarjeta como en la v4.1:** el hilo dibuja solo el borde; el texto entra letra a letra subiendo desde un desenfoque y el icono con su propia construcción. Hoy lo escribe el lápiz (`write()` en `tarjeta.js` y la jugada `tarjeta-en-sala`): hay que cambiarlo.
- **El hilo nunca parado** (`motor/jugadas.js`, `hiloAt`): el rizo de descanso sobre la cabeza y algunos tramos se quedan quietos. Si no dibuja, viaja, vive (se mueve un poco) o sale.

## Lo que queda por mejorar (anotado el 08/10, al cerrar la primera versión)
- Interiores del edificio con poca variedad de tono, todo en un azul medio.
- El ascensor por dentro es pobre, y los árboles parecen setas.
- Falda al sentarse: hace un disco sobre la silla.
- Garabatos 0 a 2 apenas se distinguen a cuerpo entero.
- Personas detrás de muebles oscuros: se mezclan si los dos tienen el mismo tono. La curva de contraste del 08/10 lo mejoró.
- Sala de noche: el techo queda pálido y los charcos de luz son discos.
- Para animar a una persona en vídeo se usa `userData.repose()` en vez de reconstruirla. Construirla cuesta de 20 a 100 ms y unas 5.000 mallas.
- Se vio en la integración, en la vista ancha de la sala: con muchas personas detalladas en un mismo plano el render se hace lento.
