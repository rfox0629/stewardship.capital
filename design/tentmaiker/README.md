# Tent MAiKER hero image

`public/tentmaiker/tent-*.webp` are rendered from these scripts. Nothing here
ships with the site; it is kept so the picture can be changed and rendered
again rather than redrawn.

The tent interior is raytraced in numpy with the laptop screen as the only
light. The figure, entrance curtains and lit construction lines are vector
layers, rendered to masks in Chromium and lit to match in the compositor.

Needs Python 3 with numpy, scipy and Pillow, and Node with `playwright-core`
and a Chromium (set `executablePath` in the two `.mjs` files).

```
cd design/tentmaiker
python3 interior.py                          # tent, props, light: interior_rad.npy, surf.npy, pos.npy
python3 front.py                             # front.svg, lines_front.svg, lines_inside.svg
python3 screen_ui.py                         # screen_ui.svg
python3 -c "import json; from figure import PARTS; json.dump([[n,d] for n,m,d in PARTS], open('parts.json','w'))"
mkdir -p masks && node render_masks.mjs parts.json masks
for f in front lines_front lines_inside screen_ui; do node render_svg.mjs "$PWD/$f.svg" "$f.png"; done
python3 composite.py 8.5                     # full.png, crop.png (desktop), crop_mobile.png (phone)
```

Then export the crops to WebP at 1640/820 (desktop) and 1280/640 (portrait).
Generated files (`*.npy`, `*.png`, `*.svg`, `masks/`, `parts.json`) are not
committed.
