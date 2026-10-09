# Mundo base GM: contrato común (léelo entero antes de tocar nada)

`videos/_base/` es la base reutilizable de todas las historias: un mundo 3D de verdad con materiales grises que el motor convierte en trama retro (puntos navy y naranja sobre beige), como los objetos de las tarjetas del anuncio v4 y la sala de espera v4.1 (`_referencias/`). Un solo modelo, una sola cámara: cualquier ángulo cuadra con el sitio.

## 1. Quién es dueño de qué (nadie toca carpetas ajenas)
| Carpeta | Dueño | Qué contiene |
|---|---|---|
| `motor/` | chat principal | `gm3d.js` (primitivas, tonos, luces, cámaras), `still.py` + `still.html` (render a imagen retro), `maniqui.js` (persona provisional), `personas.js` (de dónde salen las personas), `ejemplo.js` (escena modelo) |
| `edificio/` | agente Edificio | el edificio, las casas de al lado, la calle y todo el entorno con movimiento |
| `sala-espera/` | agente Sala | la sala de espera reutilizable |
| `personajes/` | agente Personajes | el elenco, sus poses, objetos en mano y mascotas |
| `hojas/` | chat principal | las hojas finales para Dil (cada agente deja las suyas en `<su carpeta>/hojas/`) |

Si necesitas un cambio en `motor/`, NO lo hagas: escríbelo al final de tu informe («Pedido al motor: …») y busca una salida dentro de tu carpeta mientras tanto.

## 2. Unidades y ejes
- 1 = 1 metro. `y` hacia arriba, suelo `y = 0`. Las fachadas miran a `+z`; la cámara suele mirar hacia `-z`. `x` a la derecha.
- Persona adulta ≈ 1,70; puerta 2,1 × 0,9; planta de vivienda 2,8 a 3,0 de suelo a suelo; peldaño 0,18.

## 3. Cómo se escribe una escena
- Un módulo ES en tu carpeta que exporta `build(scene, opts)` y devuelve `{ cameras: { nombre: spec } }`. Opcional: `update(t, scene, built)` para lo que se mueve (coches, bicis, gente, pájaros), función PURA de `t` (segundos): nada de `Math.random` ni relojes; usa `rng(semilla)` de `gm3d.js`.
- Patrón completo en `motor/ejemplo.js`. Importa todo de `../motor/gm3d.js` y las personas de `../motor/personas.js` (nunca de `maniqui.js` ni de `personajes/` directamente: el chat principal cambia esa línea al integrar).
- Cámara (datos): `{ pos:[x,y,z], look:[x,y,z], fov:30 }` en perspectiva o `{ pos, look, ortho: medioAlto }` sin perspectiva (casa de muñecas).
- Etiqueta todo con `tag(obj, 'zona:cosa', capa)`; capa `'fondo'`, `'medio'` (por defecto) o `'frente'`.

## 4. El aspecto (lo que hace que se vea retro y de la marca)
- **Solo grises**, con los tonos de `TONE` (`ink`, `dark`, `mid`, `light`, `pale`, `paper`). El tono es la densidad de puntos: usa contraste (cosas oscuras junto a claras) para que se lea; una escena toda en `mid` queda plana.
- **Naranja** (`{accent:true}`): solo acentos humanos o clave (una bufanda, la luz de una ventana de noche, una maceta, el punto del hilo). Menos del 10 % de la imagen.
- **Líneas de tinta**: las primitivas ya dibujan sus bordes; mantenlas, son el dibujo navy.
- **Formas con volumen y detalle real**, no cajas sueltas: marcos de ventana, alféizares, molduras, cortinas, objetos con su forma (lathe para tazas o lámparas, extrude para perfiles).
- **Sin texto** en el mundo (ni letreros ni números), salvo que el chat principal lo acuerde con Dil. Lo holandés se cuenta con la arquitectura y los objetos, no con palabras.
- **Sin caras** en ninguna persona. Personas: maniquí, cabeza de garabato.
- **Humor suave**: cada sitio con uno o dos detalles que hagan sonreír (un gato encima de la nevera, una gaviota con una patata frita, una planta que se come la estantería). Pequeños, nunca tapan la acción.
- Luz principal desde arriba a la izquierda (ya en `lights()`); `mood`: `dia`, `tarde`, `noche`.

## 5. Renderizar (y la regla de una tanda a la vez)
- `python _base/motor/still.py <job.json>` (formato en la cabecera de `still.py`). Saca `<nombre>.png` (final) y `<nombre>-gris.png` (para revisar).
- `still.py` coge un candado: solo hay una tanda de instantáneas a la vez en todo el equipo. Si otro agente está renderizando, espera solo. **No lances instantáneas por otra vía** (nada de `npx hyperframes snapshot` a mano).
- Agrupa los planos en un solo job (una tanda de 6 planos tarda casi lo mismo que una de 1). Tamaño normal 1080 × 1920 (vertical, como los vídeos), `cell` 4. Para hojas grandes, mismo `cell` y más píxeles.
- Mira tus imágenes tú mismo (Read) antes de darlas por buenas. Si sale en blanco, revisa la consola del módulo (error de JS): `still.py` avisa con «blank render».

## 6. Organización para reutilizar
- Cada pieza reutilizable es una función con nombre (`mueble.sofa(opts)`, `calle.bici(opts)`), en un archivo por familia, con una línea de comentario arriba: qué es y sus opciones.
- Cada carpeta lleva `CATALOGO.md`: lista de piezas, sitios y cámaras con su nombre exacto, y cómo se usan en una escena (3 líneas de ejemplo).
- Nada de rutas absolutas. Nada de archivos sueltos de prueba al final: lo que no sirve se borra; lo que sirve va en el catálogo.

## 7. Entrega de cada agente
- Tus módulos, tu `CATALOGO.md`, tus hojas en `<carpeta>/hojas/` y un informe corto: qué hay, qué falta, tiempos de render, pedidos al motor.
- Nunca digas que algo está hecho sin haber mirado la imagen.

## 8. El hilo lo construye todo (Dil, 08/10/2026: regla de marca)
- En los vídeos, las cosas no aparecen: **las dibuja el hilo**. Casas, cuartos, muebles, personajes, tarjetas. Primero el contorno (la línea navy con el punto naranja en la punta), luego el relleno de puntos. Cuando la historia pasa de un sitio a otro, el hilo viaja y va construyendo el siguiente.
- Motor: `drawOn(grupo, k)` y `drawSequence([{obj, t0, dur}], t)` en `gm3d.js` (devuelven la punta del lápiz; `screenOf(cam, punta, W, H)` la pasa a píxeles para el hilo 2D de la composición). Ejemplo funcionando: `motor/ejemplo.js` con `opts.draw`. En vídeo se usa `motor/retro.js` (el retro en directo, fotograma a fotograma).
- Para que funcione en tus piezas: todo sólido con contorno de tinta; cada cosa que debe aparecer como unidad es un grupo con nombre (`tag`); nunca fundir un edificio en una sola malla; en `CATALOGO.md`, una lista «Orden de dibujo».

## 9. Modelos ya hechos, hilo grueso y siluetas (08/10/2026)
- `modelos/kenney/`: 895 modelos CC0 (libres, sin atribución; licencia dentro de cada kit): `furniture-kit` (140 muebles), `food-kit` (200), `car-kit` (50), `city-kit-roads` (95), `city-kit-suburban` (40), `city-kit-commercial` (41), `nature-kit` (329: árboles, plantas, rocas). Mira los nombres con `ls`.
- Uso: en tu módulo `export const MODELOS = ['modelos/kenney/furniture-kit/loungeSofa.glb', ...]` (se precargan solos) y en `build()` `modelo(ruta, { l: 2.1 })` (`h`, `w`, `d` o `l` = lado horizontal más largo; `tone`, `tones`, `accent`). Salen en nuestros grises, con contorno de tinta y apoyados en y = 0. Ejemplo: `motor/prueba-modelos.js`.
- Úsalos para objetos y relleno (muebles, cocina, comida, coches, árboles, plantas). La arquitectura holandesa, el edificio y los personajes son nuestros.
- `hilo(pts, { px: 8.5, accent })`: el hilo de la marca en 3D con grosor fijo en pantalla.
- `silueta(mesh, grosor)`: contorno de tinta para formas redondas (cápsulas, esferas, cabezas).
