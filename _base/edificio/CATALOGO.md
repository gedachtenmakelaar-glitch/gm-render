# Edificio y entorno GM (carpeta `_base/edificio/`)

Un bloque de pisos holandes de ladrillo (escuela de Amsterdam, 1920-30), 22 m de ancho, planta baja + 5 plantas + atico + sotano, con casas vecinas, calle, canal, tranvia y horizonte. Todo 3D con el motor (`../motor/gm3d.js`), sin texto y sin caras.

## Como se usa (3 lineas)
```js
import { build, update } from '../edificio/escena.js';          // dentro de un job: "module": "edificio/escena.js"
const built = build(scene, { cutaway: true, street: true, residents: true, mood: 'dia' });   // built.cameras['p3-chico-puerta']
update(t, scene, built);                                          // coches, bicis, gente, barco, aves, nubes, ascensor, sillon colgado
```
Job: `{"module":"edificio/escena.js","size":[1080,1920],"cell":4,"out":"edificio/hojas/x","opts":{"cutaway":["p3-chico"]},"shots":[{"name":"a","cam":"p3-chico-puerta","t":0,"mood":"dia"}]}`. Un `opts` dentro de un plano reconstruye la escena (agrupa los planos con las mismas opciones).

## Opciones de `build(scene, opts)`
| opcion | por defecto | que hace |
|---|---|---|
| `cutaway` | `true` | casa de munecas: sin fachada ni cubierta delantera. `false` = fachada cerrada. Lista de ids (`['p3-chico','p3-vecina']`) = solo se abren esas viviendas (el resto queda cerrado). |
| `street` | `true` | calle, acera, carril bici, calzada, canal, mobiliario urbano y todo lo que se mueve por el suelo (coches, tranvia, ciclistas, paseantes, barco). |
| `neighbours` | `true` | casa del canal (hastial de campana + viga de izar), casa antigua torcida (hastial escalonado) y las filas de casas a ambos lados. |
| `skyline` | `true` | capa `fondo`: casas lejanas, iglesia, molino, arboles, sol (naranja) o luna. |
| `farHouses` | `false` | fila de casas al otro lado del canal (solo para planos altos de ciudad: tapa el edificio desde la calle). |
| `residents` | `true` | maniquies provisionales en cada vivienda (cambian solos al integrar `personajes/`). |
| `homes` | todas | ids de viviendas cuyos interiores se construyen. |
| `roomLight` | `[]` | ids de viviendas con una luz puntual dentro (para planos interiores con fachada cerrada). |
| `bikeLaneAccent` | `true` | carril bici en naranja (acento). |
| `mood` | `dia` | `dia`, `tarde`, `noche` (cielo oscuro, ventanas encendidas en naranja, farolas). |

## Viviendas y elenco
`id` | nombre | planta | habitaciones | residentes (`id` del elenco) | detalle de humor. Las plantas: -1 sotano, 0 baja, 1-5 pisos, 6 atico. Todas las viviendas de las plantas 1-5 se abren a un rellano comun por una puerta en la pared del nucleo (escalera + ascensor).
| id | nombre | planta | habitaciones | elenco | humor |
|---|---|---|---|---|---|
| `pb-portero` | Piso del portero | 0 | taller + estar | `portero` (sentado) | tablero de llaves; bici colgada |
| `pb-panaderia` | Panaderia de la esquina | 0 | tienda | `panadera` (nueva) | pan gigante; gaviota con patata frita en la barandilla |
| `p1-abuela` | La abuela del gato | 1 | dormitorio + salon | `abuela` | gato sobre la tele; ovillo desenrollado |
| `p1-abuelo` | El abuelo del perro | 1 | salon + dormitorio | `abuelo`, perro (`mascota:perro`) | perro en el mejor sillon; ajedrez |
| `p2-pareja` | La pareja recien mudada | 2 | dormitorio + salon | `pareja` (2 figuras: `residente:pareja`, `residente:pareja#2`) | cajas y estanteria sin montar |
| `p2-estudiante` | La estudiante | 2 | estudio + cuarto | `estudiante` | torre de platos |
| `p3-nina` | La familia de Nina | 3 | cuarto-nina + salon | `nina`, `madre` | osito con su plato |
| `p3-chico` | El chico de la bateria | 3 | cuarto | `chico` (bateria completa) | huevera como aislante |
| `p3-vecina` | La vecina de la pared | 3 | cuarto | `vecina` | **pared comun con `p3-chico`** (x = 6.75); cuadro torcido |
| `p4-teletrabajo` | El teletrabajo | 4 | dormitorio + despacho | `teletrabajo` | planta que se asoma a la camara |
| `p4-bebe` | La familia del bebe | 4 | salon + cuarto-bebe | `familia-bebe` (+ carrito, cuna) | torre de panales |
| `p5-viajera` | La viajera | 5 | dormitorio + salon | `viajera` | mapa con chinchetas, maletas |
| `p5-plantera` | La del jardin interior | 5 | salon + cuarto | `plantera` | planta que se come la estanteria |
| `atico-artista` | Atico del artista | 6 | estudio | `artista` | sol naranja que no cabe en el lienzo |
| `atico-secadero` | Secadero del atico | 6 | secadero | | sabana-fantasma |
| `sotano-bicis` | Bicicletero | -1 | bicis | | 11 bicis |
| `sotano-lavanderia` | Lavanderia comun | -1 | lavanderia | | calcetin solitario |
Ademas: terraza en la azotea (mesa, banco, plantas, guirnalda de luces), portal con buzones, bicis y planta en el recibidor, escalera de 7 tramos con barandilla, ascensor con cabina visible por dentro, 7 balcones con jardinera.
Cada vivienda: `HOMES[i].rooms[j].items` en `viviendas.js` (`['sofa', u, v, giro, opciones, altura]`) y `cast` (`{id, pose, room, u, v, rot}`), asi que el agente de personajes puede mover o cambiar a la gente sin tocar nada mas. Las anclas estan en `built.anchors[id] = {x, y, z, w, rooms}`.

## Camaras (nombres exactos en `built.cameras`)
- Generales: `ciudad`, `calle`, `calleLarga`, `edificio` (fachada entera), `edificioContrapicado`, `casaMunecas` (ortografica inclinada, horizontal), `casaMunecasVertical`, `fachadaCerrada`, `entorno`, `entornoAlto`, `calleMov`.
- Cadena de zoom: `zoom-1-ciudad`, `zoom-2-calle`, `zoom-3-edificio`, `zoom-4-planta`, `zoom-5-sala` (las tres ultimas: usar `cutaway: ['p3-nina','p3-chico','p3-vecina']`).
- Por vivienda (3 cada una): `<id>-frente`, `<id>-tresCuartos`, `<id>-puerta`. Las tres estan DENTRO de la habitacion principal a 1,5 m de altura (con `cutaway: true` o una lista que incluya la vivienda): frente desde el borde abierto, tres cuartos desde una esquina delantera, puerta desde el umbral. `zoom-5-sala` = `p3-nina-frente`.
- Espacios comunes: `escalera` (corte frontal), `escaleraTresCuartos`, `escaleraSubiendo`, `escaleraBajando`, `recibidor`, `ascensorDentro` y `ascensorDentroTresCuartos` (cabina a t = 0 en la planta 3: puertas, espejo, pasamanos, panel de botones, lampara), `ascensorFuera`, `ascensorCorte`, `azotea`, `azoteaVista`, `sotanoBicis`, `sotanoLavanderia`.

## Piezas reutilizables
`muebles.js` (todas devuelven un Group con origen en el suelo, frente a +z): `sofa`, `armchair`, `chair`, `stool`, `officeChair`, `bench`, `table`, `coffeeTable`, `dresser`, `wardrobe`, `bookshelf`, `shelf`, `nightstand`, `desk`, `laptop`, `mug`, `bed`, `mattress`, `crib`, `pram`, `kitchen`, `fridge`, `washer`, `bathtub`, `toilet`, `basin`, `cookPot`, `plant` (`leafy`/`cactus`/`tall`/`jungle`), `lampFloor`, `lampTable`, `pendant`, `tv`, `frame`, `clock`, `rug`, `curtain`, `toyBlocks`, `teddy`, `toyBall`, `boxes`, `suitcase`, `globe`, `yarn`, `easel`, `guitar`, `drumKit`, `mailboxes`, `coatRack`, `shoes`, `bucketMop`, `broom`, `toolbox`, `laundryRack`, `basket`, `eggCartons`, `dishTower`, `recordPlayer`, `radio`, `chessBoard`, `newspaper`, `cat`, `dog`, `bird` (`pigeon`/`gull`, alas animables), `bike`, `tube`.
`entorno.js`: `casa` (casa de ladrillo con hastial `bell|step|neck|spout|flat`), `tree`, `gablePoly`, constantes `STREET`. `movimiento.js`: `car`, `tram`, `cloud`. Medidas en `medidas.js`.

## Movimiento (`update(t)`, funcion pura de t, bucle de 20 s)
8 coches (carril cercano hacia la izquierda, lejano hacia la derecha), tranvia (16 m), 6 ciclistas por el carril rojo (ruedas que giran) en ambos sentidos, 12 paseantes (acera y muelle), barco a la deriva con balanceo, 3 gaviotas en circulo con alas batiendo, 3 palomas volando y 4 caminando, 4 nubes, aspas del molino (cuarto de vuelta simetrico), sillon colgado de la viga que se balancea, ascensor (planta 3, 5, 3, 1, 3) y gaviota con patata en la barandilla. Al pasar el borde (+/-75 m) un coche o paseante reaparece por el otro lado.

## Orden de dibujo (como lo construiria el hilo)
1. `fondo:ciudad` (suelo lejano, filas de casas, iglesia, molino, arboles, sol o luna) y `fondo:nubes`.
2. `calle` (acera, carril rojo, calzada, rieles, muelle, agua, orilla lejana), `calle:barandilla`, farolas, arboles, soportes y bicis aparcadas, parada.
3. `vecinos`: `vecino:casa-canal` (con la viga y el sillon), `vecino:casa-antigua`, resto de casas por orden de cercania.
4. `edificio:estructura` (losas y muros), bandas de ladrillo, pilares de esquina, `nucleo:pared`.
5. `escalera` (tramo por tramo, de abajo arriba) y `ascensor` (hueco y `ascensor:cabina`).
6. `edificio:fachada` (`fachada:<vivienda>:s<planta>`, una pieza por vivienda y planta) con ventanas, `balcon:<vivienda>`, toldo, portal, escalones.
7. `tejado` (`tejado:fondo`, `tejado:frente-grupo`), `terraza`.
8. `edificio:viviendas` > `vivienda:<id>` (de abajo arriba) > `vivienda:<id>:<habitacion>` > cada mueble (`mueble:*`, `objeto:*`).
9. Personas: `residente:<id>`.
10. Lo que se mueve: `movimiento` (`calle:coche`, `calle:tranvia`, `calle:ciclista`, `calle:paseante`, `canal:barco`, `pajaro:*`, `mascota:*`).

## Hojas (en `hojas/`)
`edificio-completo.png`, `edificio-entorno.png`, `edificio-entorno-movimiento.png`, `edificio-angulos.png` (cada una con su version `-gris`). Los trabajos para repetirlas estan en `jobs/` (`completo`, `entorno`, `movimiento`, `angulos`).

## Limites conocidos
Los maniquies son los provisionales. Sin ventanas de cielo visibles desde dentro con cutaway (solo hueco). La fachada cerrada no deja ver el interior (paneles claros), por eso `roomLight`. Coches y paseantes saltan al cruzar el borde del bucle. Un plano con `opts` propios reconstruye la escena (unos 3 s).

## Segunda pasada (08/10)
`detalles.js` = objetos extra por habitacion (modelos Kenney `k:` muebles, `f:` comida, y props propios: `poster`, `cable`, `duck`, `flamingo`, `wateringCan`, `puddle`, `bikePots`); `escena.js` exporta `MODELOS` (todo lo que hay que precargar). Banos en 5 viviendas, bateria de `p3-chico` con amplificador, carteles (solo formas) y cables. Arboles propios (copa por capas con silueta). Coches, tranvia, ciclistas y paseantes se encogen a cero en los extremos del bucle (no saltan). Jobs de hojas: `completo`, `entorno`, `movimiento`, `angulosA` (planos de fuera) y `angulosB` (interiores); cada job lleva un primer plano `warm` de calentamiento que se borra.
