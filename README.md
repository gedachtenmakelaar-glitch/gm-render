# gm-render

Render machine for Gedachten Makelaar's short animated videos: a 3D world drawn in a retro 1-bit style (three.js, rendered
frame by frame with HyperFrames in headless Chrome). GitHub Actions renders each video in parts on several machines at once
and joins them with the sound mix.

This repository only holds what a render needs. Videos are made and reviewed in the main (private) project; this copy is
refreshed from there.

- `_base/` the world (building, waiting room, characters, engine, sound), `_base/videos/<clip>/clip.json` one video.
- `.github/workflows/render.yml` the render (Actions > render > Run workflow).

All rights reserved, Gedachten Makelaar. 3D models by Kenney (CC0). Fonts: Plus Jakarta Sans and JetBrains Mono (SIL OFL).
