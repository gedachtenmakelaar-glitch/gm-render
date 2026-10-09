# Sonido del mundo base (mezcla de un vídeo en segundos)

## Uso en 3 líneas
1. Escribe `<carpeta del clip>/golpes.json` (duración sin final, `final`, `bpm`, `musica_desde` y la lista de golpes; ejemplo: `_base/videos/prueba-3d-2d/golpes.json`).
2. `python _base/sonido/mezcla.py <carpeta del clip> [--grafico ruta.png]`
3. Sale `<carpeta del clip>/render/mezcla.wav`: 48 kHz, estéreo, 16 bit, largo exacto (duración + 6,6 si `final`), -14 LUFS, pico real <= -1 dBTP. Se imprime lo medido. Mismo `golpes.json`, mismos bytes.

Campos de cabecera: `duracion` (historia SIN el final), `final` (true añade el final aprobado de 6,6 s en t = duracion), `bpm` (110), `musica_desde` (segundos; `null` = sin cama). Cada golpe admite `g` (multiplicador de volumen, 1 por defecto) y `pan` (-1 a 1). `subida` admite `hasta` (cuándo aterriza; por defecto el inicio del final).

## Modo bucle (vídeo que se repite sin cortes)
`"bucle": true` en `golpes.json` (`video.py` lo pasa desde `clip.json`; fuerza `final: false`). La cama suena desde t = 0 en régimen (se renderiza con 4 compases de arranque que se descartan, así lo que suena al empezar es la cola del último compás), sin compás dulce, sin fade in ni fade out. Los efectos se dejan sonar sobre un colchón de 1 s antes de 0 y 4 s después del final, y esa cola se dobla: lo que pasa del final se suma al principio, lo anterior a 0 al final; el seguidor del ducking y el limitador también son circulares. Largo exacto = `duracion`; pide que `duracion x bpm / 60` sea múltiplo de 16 pulsos (60 s a 112 BPM = 28 compases) o avisa. Una mezcla de 60 s tarda unos 4 min.
`qc.py` con `"bucle": true` y `ending` false comprueba PSNR primer/último fotograma >= 45 dB y que el sonido empalma (RMS de los últimos y primeros 50 ms a < 3 dB, sin salto de muestra grande).

## Música real en lugar de la cama (`musica` en `clip.json`)
Sin la clave, todo es como antes (misma cama sintetizada, mismos bytes). Con ella, la cama se sustituye por una pista de audio (mp3/wav/ogg) y `golpes.json` solo aporta los efectos. No se combina con `bucle`.
```json
"musica": {"archivo": "sonido/musica/detour.mp3", "desde": 12.0, "gain_db": 0, "bpm": null, "primer_pulso": null, "alinear": false}
```
- `archivo`: ruta absoluta, o relativa a `_base/` (se prueba también en la carpeta del clip y en `sonido/`). `desde`: segundo de la pista donde empieza la historia (0 por defecto). `gain_db`: sube o baja la música (0 = música sola a -17 LUFS dentro de la mezcla final). `bpm` y `primer_pulso` (segundo de la pista del primer 1 del compás): si van a `null`, los estima `pulso.py` (con caché en `musica/_pulso-cache.json`) y se anotan en `render/render.log`. `alinear: true` mueve `desde` (el valor dado es el punto de partida) a la fase del pulso que acerca más los `corte` al pulso.
- Se corta a `duracion` (la historia), entrada de 0,15 s y salida de 1,5 s en coseno que termina EN el último pulso antes del final (hasta un pulso, ~0,5 s, de silencio antes del logo); luego entra el final de 6,6 s como siempre.
- Ducking: bajo cada efecto la música baja 2 dB (lápiz, subida), 3 dB (corte, burbuja, entra-hilo, naranja, resolver, tic) o 3,5 a 4 dB (tarjeta, golpe); ataque 60 ms, suelta 120 ms, anticipado 50 ms. Tabla `DUCK` en `mezcla.py`.
- Nivel: la música sola queda en -17 LUFS (+ `gain_db`) tras normalizar la mezcla a -14 LUFS / pico real <= -1 dBTP; se ajusta en 2 a 6 pasadas (una mezcla de 60 s tarda ~30 s). La línea de resultado de siempre se imprime y se añade una de música (también al `render.log`).
- `python sonido/pulso.py <audio> [--clip <carpeta> | --cortes 6.5,41.1 --dur 54] [--cerca 12]`: BPM, primer pulso y el mejor `desde`. El primer 1 del compás se decide por la energía grave: puede equivocarse de pulso en música sin bombo claro (pon `primer_pulso` a mano).
- Prueba: `python sonido/musica/_generar-prueba.py` crea `_prueba-112.wav` (3 min, 112 BPM, primer pulso en 0,20 s, 31 MB, se puede borrar). `sonido/_prueba-clip/` es un clip de prueba (copia de terraza con la clave).

## Eventos
| tipo | campos | qué suena | de dónde sale |
|---|---|---|---|
| `corte` | `t` | whoosh que empieza 0,15 s ANTES de t (rota entre 3 variantes) | casa: whoosh, whoosh_b, whoosh_c, g 0,4 |
| `lapiz` | `t0`, `t1` | garabato de lápiz bajo el hilo durante todo el rango (bucle sin costura, entrada 50 ms, salida 120 ms) | casa: scribble x3, g 0,25 |
| `entra-hilo` | `t` | golpe grave suave y barrido de pluma que se abre | kit low_thump + pluma sintética |
| `burbuja` | `t` | pop suave; el tono cambia cada vez (1,0 / 1,08 / 0,94) y el panorama alterna | kit pared_bubble_pop, g 0,3 |
| `tarjeta` | `t` | papel que se despliega (desde t-0,05) y aterrizaje suave (t+0,1) | kit pared_paper_unfold + casa stamp |
| `naranja` | `t` | el campo naranja se abre: oleaje suave de ruido grave, pad Do-Sol-Mi que florece y un whoosh muy bajo | sintetizado como la inundación y el pad del final |
| `resolver` | `t` | la cabeza se desenreda: pluma que se aquieta (antes de t), D5 a C5 con mazo y acorde de Do mayor cálido | sintetizado, notas del final |
| `subida` | `t`, `hasta` opcional | el hilo sube hacia el final: ruido que se abre, tono que sube y el riser de la casa aterrizando justo al final | el riser del kit (s05) + casa riser |
| `golpe` | `t` | golpe suave genérico | kit low_thump + casa click |
| `tic` | `t` | tic de reloj, alterna dos alturas | casa tick |

Un tipo desconocido, un `lapiz` sin `t0`/`t1` o un golpe fuera del clip paran con un error claro y sin escribir nada.

## Qué lleva la mezcla (la identidad es la de Nudos 1 y la v4.1)
- **Cama:** la de la casa, 110 BPM, Do mayor, C - Am - F - G: rhodes, pad, bajo en 1 y 3, arpegio de pizzicato, escobillas. Entra en `musica_desde` (suave) y crece; el último compás antes del final es el dulce (como s07 en Nudos). Se mide a un nivel fijo (el de Nudos 1 + 2,5 dB, porque una historia nueva tiene menos efectos que Nudos) y baja 3 dB bajo cada efecto (seguidor 40 ms / 200 ms). Cae a cero EXACTO en t = duracion con 3 ms de rampa, igual que en el kit. La cama es la de `synth_music_45.py`, sin el arco de Nudos y sin el acorde final (ese viene en el final).
- **Final:** `recursos/final-6.6s.wav` es el final de Nudos 1 TAL CUAL (plumas, inundación, latido, notas pentatónicas por letra, acorde de Do mayor en la última, su propia música), extraído una vez con `herramientas/extraer_final.py` ejecutando el `build_mix.py` del kit con su cronograma. Se coloca en t = duracion. Si el final cambia (nuevos `cues.json`), se vuelve a extraer.
- **Normalización:** dos pasadas hechas a mano con `ebur128` (medir; subir la ganancia y limitar; repetir la medida hasta -14,0). El `loudnorm` de ffmpeg no sirve aquí: los efectos son picudos, no cabe en modo lineal y mide ~1 dB distinto en clips cortos. El limitador retrasa 143 muestras y se recortan (comprobado: el final cae en lag 0).

## Añadir un tipo de evento nuevo
1. En `mezcla.py` escribe `def ev_<nombre>(c, ev, k)`: coloca con `c.bus.place(señal, tiempo, ganancia, pan)`; usa `c.rng(k)` si necesitas ruido (da una semilla propia por golpe, así añadir un golpe no cambia el sonido de los demás) y `c.n['<tipo>']` para variar entre apariciones.
2. Añádelo al diccionario `EVENTOS` y a la lista `TIPOS` (un `assert` comprueba que coinciden).
3. Si usa un WAV, cópialo a `recursos/sfx-casa/` o `recursos/sfx-kit/` y apunta su origen abajo. Añade una fila a la tabla de arriba.

## Recursos (copiados; `_base` no depende de `_kit`)
- `recursos/sfx-casa/` (20 WAV): de `gm-hook-test/composition/assets/sfx-hook/` (whoosh x3, scribble x3, stroke x3, pop1-3, tick, click, stamp, riser, chime, boom, psst, typing2).
- `recursos/sfx-kit/` (13 WAV): de `_kit/composition/assets/audio/sfx/` (low_thump, pared_bubble_pop, pared_bubble_out, pared_paper_slide, pared_paper_unfold, pared_hit_clear, pared_hit_muffled, pared_pencil_short, nod_tick, tension_bip, pop_open, sweep_up, cable_tug_1). Sin usar todavía: quedan listas para tipos nuevos.
- `recursos/final-6.6s.wav` y `final-ref.json`: el final aprobado y el nivel de cama de Nudos 1 (ver arriba). `recursos/cues-final.json`: copia de `_kit/composition/assets/logo12/cues.json` (los tiempos del final, solo de referencia).
- `herramientas/`: `build_mix.py` y `synth_music_45.py` (copias del kit, origen de todo), `timeline-nudos1.json` (cronograma de Nudos 1 que usa la extracción, de `_kit/work/short-bak/`), `extraer_final.py`.

## Medido (clip de prueba `prueba-3d-2d`: 10,4 s + final)
- 816000 muestras = 17,000 s exactos; -14,0 LUFS integrado; pico real -1,70 dBTP; ganancia aplicada +5,4 dB.
- Una mezcla tarda unos 11 s (casi todo son las repeticiones de medida de ffmpeg y la síntesis de la cama).
- Dos ejecuciones seguidas dan el mismo hash MD5.
- Gráfico: `prueba-mezcla.png` (forma de onda con los golpes marcados y nivel RMS).

## Lo débil
- Nadie ha oído esto: está comprobado con medidas y gráfico, no a oído. Los eventos nuevos (`entra-hilo`, `naranja`, `resolver`, `subida`, `tarjeta`, `golpe`) mezclan SFX del kit con síntesis nueva y sus ganancias son una primera estimación; ajustar con `g` por golpe o en la función.
- La `subida` es discreta (mismo nivel que el riser de Nudos).
- La cama no tiene el arco de Nudos (pico en el caos, silencio antes del giro): sube suave y se mantiene.
- El final es 4 dB más fuerte que una historia con pocos efectos (en Nudos eran 1,3 dB) porque el final es el aprobado, sin tocar.
