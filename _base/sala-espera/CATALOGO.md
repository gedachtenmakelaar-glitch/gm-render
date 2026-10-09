# Sala de espera (agente Sala)

Uso (3 líneas):
```js
import { build, update } from '../sala-espera/escena.js';           // dentro de una escena o de still.py ("module": "sala-espera/escena.js")
const b = build(scene, { gente:'media', disposicion:'v41', mood:'dia' });  // b.cameras, b.seats, b.anclas
update(t, scene, b);                                                      // todo en bucle de 12 s (LOOP)
```
Ejes: fondo en -z (ventana a la izquierda, reloj, tablero, recepción a la derecha), la cámara mira a -z. Sala pública 10 x 10 x 3,2 m; consulta privada 7 x 7 x 2,9 m. Sin texto, sin caras.

## Opciones de build(scene, opts)
| opción | valores | qué hace |
|---|---|---|
| `variante` | `'publica'` (por defecto), `'consultorio'` | sala de médico o consulta privada (sofá, sillón, mesa baja, alfombra, lámpara de pie y de mesa cálidas, librería, cortinas, suelo de tablones; sin recepción, tablero ni dispensador) |
| `disposicion` (publica) | `'v41'` (3 bancos mirando a cámara + 2 sillas), `'enfrentadas'` (2 filas de 5 frente a frente), `'pared'` (fila de 7 sillas contra el fondo + 3 en el lateral), `'pocas'` (3 sillas + sillón) | |
| `mood` | `'dia'`, `'tarde'`, `'noche'` | cielo, sol/luna, luces puntuales, casas con ventanas naranjas de noche (luces globales las pone still.py) |
| `recepcion` | `true`/`false` | mostrador, ventanilla, persiana, telaraña, trastienda, silla |
| `gente` | `'vacia'`, `'pocas'` (30 %), `'media'` (60 %), `'llena'`, o 0..1 | rellena asientos con `person(id,'sit')` |
| `ids` | lista de ids | por defecto vecina, chico, abuelo, abuela, nina, pareja, estudiante |
| `ocupar` | `{indiceAsiento: id}` | manda sobre `gente` |
| `de_pie` | `true` o `[[ancla, id],...]` | personas de pie en anclas |
| `recepcionista` | `false` para quitarla | por defecto sentada en la ventanilla (`recepcionista`) |
| `techo` | `false` | quita techo (cenital) |
| `semilla` | número | reparto de asientos |
| `asientoCam` | `[i, j]` | asientos de las cámaras `asiento-1` y `asiento-2` |

## Asientos: `built.seats`
`[{ i, pos:[x,0,z], rotY, tipo, grupo, ocupado? }]`. `pos` es donde va el ORIGEN de `person(id,'sit')` (pelvis); `rotY` hacia dónde mira (rotY 0 = mira a +z). Altura del asiento 0,44 m. Colocar: `p.position.set(...s.pos); p.rotation.y = s.rotY`. Pública `v41`: 11 en bancos + 2 sillas (índices 0-3 banco del fondo, 4-7 banco central, 8-10 banco derecho, 11-12 sillas). El orden depende de la disposición: mirar `built.seats` y `tipo`/`grupo`.

## Anclas de pie / sitios: `built.anclas` ({pos, rotY})
Pública: `recepcionista`, `cliente_mostrador`, `cola_mostrador`, `puerta_consultas`, `entrada`, `enfriador`, `perchero`, `rincon_ninos`. Consulta: `puerta`.

## Cámaras (nombres exactos, en `built.cameras`)
Cada una existe en ancho (3:2) y como `<nombre>-v` para 1080x1920.
`ancho-puerta` (desde la entrada) · `v41` (frente a los bancos, como la v4.1) · `inverso-ventana` (desde la ventana hacia la sala) · `recepcion-hombro` (sobre el hombro del cliente, a la ventanilla) · `reloj` (primer plano reloj y péndulo) · `contrapicado-suelo` · `cenital` (usar `techo:false`) · `asiento-1`, `asiento-2` (primeros planos de dos asientos; ver `asientoCam`). Ambas variantes tienen todas salvo `recepcion-hombro`.

## Piezas (objetos.js; cada una es una función con nombre)
Muebles: `banco({plazas,tono})`, `silla({tono,brazos})`, `sofa({plazas,cojin})`, `sillon()`, `mesaBaja()`, `alfombra({r})`, `estanteria({w,h})`, `lamparaPie()`, `lamparaMesa()`.
Sala: `planta({alto,hojas,seed})` (hojas se mecen), `dispensadorAgua()` (burbujas), `revistero()`, `perchero()` (abrigos, bufanda naranja, paragüero con patito de goma), `rinconNinos()` (alfombra, mesita, torre de cubos, tren, osito, pelota naranja).
Pared: `reloj({r,pendulo})` (segundero a saltitos, péndulo), `tablero()` (SIN texto ni cifras: panel blanco encendido con una fila de 9 puntitos y UN punto naranja que va y viene), `cartel(tipo)` (`sol`,`arbol`,`corazon`,`nubes`,`manos`,`mapa`), `tablonAnuncios()`, `ventana({w,h,cortinas})` (sin cristal), `puerta({abierta,piloto})`, `persiana()`, `telarana()`, `aplique()`.
Recepción: `mostrador()`, `trastienda()`.
Vida: `paloma()` (picotea cada 1,5 s), `mosca()` (con rastro de puntos, ruta Lissajous), `polvo(caja,n)`, `cieloVentana({mood})` (cielo, sol que se mueve, casas holandesas, nubes, luna y estrellas de noche), `luzSuelo()` (mancha de sol con sombra del marco).
Estructura (sala.js): `muro(len,h,aberturas,{tono,zocalo})`, `salaPublica(root,o)`, `consultorio(root,o)`.
Humor: paraguas goteando en un cubo (`paraguasGoteando`), caja de perdidos con un solo calcetín (`cajaPerdidos`), planta inclinada hacia la ventana (`planta({inclinar})`), bolso olvidado (`bolsa`, primer plano), patito de goma en el paragüero, telaraña en la ventanilla, paloma con la ventana, mosca con rastro, hoja suelta de la planta camino del revistero, osito en el rincón infantil.

## Movimiento: `update(t, scene, built)`
Pura de t, bucle de 12 s: segundero (12 saltos), péndulo (2 s), tablero, paloma, mosca, polvo, sol (se desplaza), hojas, burbujas.

## Orden de dibujo (para el hilo)
1. `sala:suelo` (baldosas), 2. `sala:muro-fondo`, `-der`, `-izq`, `-frente`, `sala:techo`, 3. `sala:ventana`, `sala:cielo` (sol y casas), `sala:luzSuelo`, 4. `sala:reloj`, `sala:tablero`, carteles (`sala:cartel-*`), `sala:aplique`, 5. `sala:recepcion-marco`, `sala:persiana`, `sala:telarana`, `sala:trastienda`, `sala:mostrador`, 6. puertas (`sala:puerta`, `sala:luz-de-la-calle`), 7. bancos y sillas (`sala:banco`, `sala:silla`, uno a uno), 8. props (`sala:planta`, `sala:dispensadorAgua`, `sala:revistero`, `sala:perchero`, `sala:rinconNinos`, `sala:mesaBaja`), 9. vida (`sala:paloma`, `sala:mosca`, `sala:polvo`), 10. personas (`persona:*`).

## Archivos
`escena.js` (entrada), `sala.js` (estructura y variantes), `objetos.js` (piezas), `jobs/sala-espera-ancho.json`, `jobs/sala-espera-angulos.json`, `hojas/`.
Render: los jobs usan `"light": 0.7` por plano; la hoja grande se pide directamente a 3600x2400, cell 4 (still.py hace las teselas). Ventana: casas holandesas de enfrente (campana, escalera, cuello) con ventanas altas de marco blanco, árbol y sol entero (posiciones calculadas para la cámara `v41`). Los tubos de luz (`sala:colgantes`) quedan aunque se quite el techo.

Modelos Kenney (tercera pasada): `MODELOS` se exporta desde `escena.js`. Papelera, planta, lámpara de pie, tazas, libros y botella en la pública; mesita con lámpara, papelera, taza, libros, radio y plantita en el consultorio. Noche: charcos de luz (`sala:charco-de-luz`), ventana oscura con ventanas naranjas de las casas de enfrente. Cámaras `asiento-1/2`: ahora a 2,4 m y de lado, la persona entera cabe.
