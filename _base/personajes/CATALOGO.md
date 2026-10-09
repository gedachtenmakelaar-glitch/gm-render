# Personajes: catálogo

Maniquíes 3D sin cara: extremidades redondeadas, manos de manopla con pulgar, cabeza = bola de garabato (más denso = más agobio; esfera limpia con espiral = resuelto). Todo con el motor (`motor/gm3d.js`), grises que el motor convierte en trama. Unidades en metros, pies en `y = 0`, miran a `+z`. Cada persona es un `THREE.Group`: gíralo para ver cualquier ángulo.

Importa SIEMPRE desde `motor/personas.js` (el chat principal apunta esa línea a `personajes/elenco.js`).

## Uso en una escena (3 líneas)
```js
import { person, pet, duo } from '../personajes/elenco.js';          // (desde una escena: vía ../motor/personas.js)
const abuelo = person('abuelo', 'walk', { phase: 0.25, hold: { R: 'cane' }, emotion: 3 }); abuelo.position.set(2, 0, 1); scene.add(abuelo);
const par = duo('pareja-a', 'pareja-b', 'hold-hands'); scene.add(par);   // dos personas colocadas y en contacto
```
Animar (en `update(t)`): `person(id, 'walk', { phase: (t * 0.9) % 1 })` reconstruye la pose (≈20 ms). Más barato: `g.userData.repose('walk', { phase })` sobre la misma persona.

## Elenco (ids fijos)
| id | quién | rasgo fijo (se lee a cualquier tamaño) |
|---|---|---|
| `chico` | adolescente baterista, delgado y alto | mochila grande + pelo de punta + sudadera con canguro (sin capucha) |
| `vecina` | adulta redonda | moño alto + falda ancha plisada + cardigan oscuro |
| `portero` | adulto ancho | gorra con visera + chaqueta de trabajo con bolsillos + llavero naranja |
| `nina` | niña de ~7 | coleta con goma NARANJA + impermeable acampanado + botas de agua |
| `abuelo` | mayor encorvado, dueño del perro | gorra plana + chaleco y tirantes + bastón |
| `abuela` | mayor, dueña del gato | rizos grises + gafas de aro + chal |
| `pareja-a` | hombre muy alto | abrigo largo de cuello alto + gorro con borla |
| `pareja-b` | mujer menuda | plumífero claro acolchado + pelo largo + bolsa de tela al hombro |
| `estudiante` | adolescente delgada | jersey ENORME con rayas y mangas sobre las manos + auriculares al cuello |
| `teletrabajo` | adulto | camisa y corbata ARRIBA, pijama de rayas y zapatillas de conejo ABAJO (humor) |
| `familia-bebe` | madre/padre | bebé en canguro delante + cochecito (pose `push-pram`) |
| `recepcionista` | adulta | americana + falda de tubo + auricular con micro + acreditación |
| `profesional` | coach/terapeuta | BUFANDA NARANJA (la del v4.1) + chaqueta larga + pelo rizado oscuro |
| `panadera` | panadera | DELANTAL claro con peto + GORRO DE PANADERA alto |
| `madre` | adulta, familia de `nina` | COLETA BAJA con goma naranja + JERSEY LARGO claro |
| `viajera` | viajera | MOCHILA DE VIAJE enorme con rollo encima + gorra con visera |
| `plantera` | jardinera | SOMBRERO DE ALA ANCHA de paja + PETO de jardin |
| `artista` | artista | BOINA ladeada + BATA larga con manchas (alguna NARANJA) |
Mascotas: `perro` (pequeño, desgreñado, collar naranja, lengua naranja al pedir) y `gato` (oscuro, cola larga, orejas de punta). `CAST` = id → descripción; `CAST_IDS`.

## `person(id, pose, opts)` → Group
`opts`: `emotion` 0..5 (densidad del garabato; por defecto 2, o el de la pose) · `resolved: true` (esfera limpia + espiral) · `hold: {R:'phone', L:'mug'}` (objeto en mano; o `{R:{prop:'mug', grip:'grip-cup'}}`) · `lookAt:[x,y,z]` (en espacio de la persona) · `h` (altura en m) · `phase` 0..1 · `role:'a'|'b'` · `variant` (otro garabato).
En el Group: `userData.rig` (anclas: `rig.anchor('head'|'handR'|'front'…)`, `rig.seatY()`), `userData.seatY` (altura del asiento para colocar la silla), `userData.repose(pose, opts)`, `userData.setEmotion(n, resolved)`.

## Poses (`POSE_NAMES`; todas valen desde cualquier ángulo)
Base: `stand`, `walk` (+ `walk-0..3`, o `phase` continuo 0..1), `run`, `sit-chair`, `sit-floor` (con las piernas cruzadas), `sit-sofa` (relajado), `lie`, `crouch`, `kneel`.
Gestos: `knock`, `wave`, `point`, `arms-crossed`, `hands-on-head` (agobio), `shrug`, `laugh` (solo cuerpo), `sad` (hundido).
Bucles de oficio (`phase` 0..1, cerrado; con objeto por defecto si no das `hold`): `knit` (agujas `needle` de 0,34 m, claras, en las dos manos, cruzadas en X abierta, con un ovillo naranja y su hilo colgando a un lado; `sit:true` o `knit-sit` = sentado en `sit-chair`), `knead` (de pie ante una mesa de ~0,84 m a ~0,6 m), `paint` (pincel `brush` en la derecha ante un caballete a ~0,7 m), `rock` (bebe en brazos, `carry:'baby'`), `water` (`wateringCan` en la derecha), `type` (sentado, mesa ~0,72 m a ~0,5 m; 3 golpes por ciclo). `stand`, `read` y `phone-call` aceptan `phase` (respiracion/balanceo; sin `phase` quedan como antes).
Con objeto: `phone-look`, `phone-call`, `carry-box` (trae su caja), `read`, `drink`, `drum`, `umbrella`, `push-pram`.
Lugar: `stairs-up-0/1` (peldaño `o.step`, 0,18), `lean-wall` (`o.side` 'L'|'R'; la pared a 0,46 m), `peek-corner`.
Dos personas (`duo(a, b, pose, {A:{…}, B:{…}})`): `hug`, `give-object` (ponga `A:{hold:{R:'letter'}}`), `hold-hands`, `talk`. Las coloca y apunta las manos a las anclas del otro.
Mascotas `pet(id, pose, {phase, h})`: `sit`, `stand`, `walk`, `lie`, `beg`. `petAnchor(g,'collar')` + `leadLine(a, b, sag)` para la correa.

## Objetos para la mano (`PROP_NAMES`) y agarres
`phone` (agarre `grip-phone`: en la palma, dedos rodeando el borde, pulgar sobre la pantalla), `mug` (`grip-handle` por el asa, o `grip-cup` por el cuerpo), `book` (`grip-book`), `bag` (`grip-handle`), `keys` y `letter` (`grip-pinch`), `umbrella`, `cane` (se ajusta sola hasta el suelo), `lead` (asa de correa), `sticks` (`grip-stick`, un palillo por mano), `wateringCan` (`grip-handle`), `brush` (`grip-stick`). Para escenas, exportados por `elenco.js`: `easel()` (caballete con lienzo, +z) y `table({w,d,h})`; `babyBundle(k)` (bulto claro grande con cabecita redonda por encima del brazo) y `yarnBall(k)` en `props.js`; `layout:'knit-rock'` (`jobs/knit-rock-check.json`) es la hoja de comprobación de `knit` y `rock`.
Manos sin objeto: `relaxed fist point open flat wave`. A mano: `person(...).userData.rig.attach(obj, 'handR', 'grip-handle')`; un objeto propio declara `userData.holds[grip] = {p, r, order}` en el marco de la mano derecha (x = palma, -y = dedos, +z = pulgar; la izquierda sale reflejada).

## Orden de dibujo (para `drawOn` del motor)
Cada parte lleva `name = 'parte:<nombre>'`; la persona es `persona:<id>`. `DRAW_ORDER` (en `elenco.js`) es el orden en que el hilo las traza y luego les da relleno:
`cabeza, garabato, torso, caderas, brazoR, brazoL, manoR, manoL, piernaR, piernaL, zapatoR, zapatoL, ropa, pelo, objeto`.
Todas las piezas llevan contorno de tinta propio: aristas (`ink`) en piezas con ángulos y trazos hechos a mano (`userData.stroke`) en superficies lisas (anillos de esferas, laterales de miembros, meridianos del torso).

## Faldas sentadas (`ropa.js` `skirt`, `rig.skirtUpdate`)
De pie y andando la falda es el cono de siempre. Cuando los dos muslos pasan de ~35 a ~58 grados respecto a la vertical (`sit-chair`, `sit-sofa`, `sit-floor`, `crouch`) el cono se apaga por ESCALA (sin saltos, `repose` y `blendPose` lo interpolan) y entran piezas colgadas de las piernas: núcleo en la cadera, un tubo sobre cada muslo y, si la falda llega más allá de la rodilla, bola en la rodilla + faldón que cae en vertical unos cm (`parte:ropa`, contorno de tinta). Falda corta (`nina`): tubo con tapa plana. Prueba: `jobs/falda-check.json` (layout `'falda'` de `escena-hoja.js`).

## Contorno y detalle
Cuerpo, cabeza, manos y prendas grandes llevan silueta de tinta (casco invertido, `userData.hull = true`, grosor ~0,0125 m a escala adulta; `setHull(t)` en `rig.js`) más trazos a mano. Si el motor pinta la máscara naranja, los cascos no deben taparla: se han probado la bufanda y la goma del pelo y salen bien. Las mascotas (`perro`, `gato`) llevan también poses `play` (reverencia de juego) y `beg` (pide con las patas).

## Hojas (`escena-hoja.js`) y render
`build(scene, {layout:'personaje', id})` hoja de personaje (3600 × 2400, cell 4): fila 1 giro en 5 vistas · fila 2 ocho poses (la 3.ª con el móvil bien cogido) · fila 3 emoción 0 a 5 y resuelto, objetos en mano, primer plano del rasgo. Otros: `layout:'nuevos'` (cinco nuevos de frente y 3/4 + poses de bucle en phase 0 y 0,5; `jobs/nuevos-check.json` → `hojas/_nuevos/nuevos.png`), `layout:'elenco'` (todos en fila), `'mascotas'`, `'prueba'` (`ids`, `pose`, `hold`), `bg:'oscuro'` para comprobar contraste.
Jobs en `jobs/hojas-1|2|3.json` (13 personajes), `elenco.json`, `elenco-oscuro.json` (comprobación de contraste sobre fondo oscuro), `mascotas.json`; `python motor/still.py personajes/jobs/hojas-1.json`. Tamaño 5376 × 3584 (3 baldosas de 1792: otros anchos dejan una franja rota a la derecha). Hojas en `hojas/` (`<id>.png` y `<id>-gris.png`).

## Reglas de contraste
Piel clara (0,74), prendas grandes entre 0,4 y 0,9, nunca grandes zonas en `ink`/`dark`: así se leen sobre fondo claro Y oscuro. Lo oscuro solo en pelo, suelas y detalles.
