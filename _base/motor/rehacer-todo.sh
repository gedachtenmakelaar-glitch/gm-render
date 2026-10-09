#!/bin/bash
# Re-render every base sheet (after an engine look change). One job at a time (the lock does it anyway).
cd "$(dirname "$0")/.."
for j in sala-espera/jobs/sala-espera-ancho.json sala-espera/jobs/sala-espera-angulos.json edificio/jobs/completo.json edificio/jobs/entorno.json edificio/jobs/movimiento.json edificio/jobs/angulosA.json edificio/jobs/angulosB.json personajes/jobs/elenco.json personajes/jobs/mascotas.json personajes/jobs/hojas-1.json personajes/jobs/hojas-2.json personajes/jobs/hojas-3.json; do
  echo "== $j $(date +%H:%M:%S)"; python motor/still.py "$j" 2>&1 | tail -3
done
echo "== fin $(date +%H:%M:%S)"
