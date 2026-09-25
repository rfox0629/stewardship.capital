# Tent MAiKER hero image

`public/tentmaiker/tent-wide-*.webp` and `tent-narrow-*.webp` are rendered
from these files. Nothing here ships with the site; it is kept so the picture
can be changed and rendered again rather than redrawn.

- `scene/` is a three.js scene: the canvas tent (sagging roof panels on a
  ridge pole, crossed poles, low walls, ridge seam, flaps gathered and tied
  open, guy ropes and stakes), the stool, table and laptop, the laptop's light,
  faint moonlight, and an invisible stand-in for the person that casts their
  shadow. It also reports where the person's joints land in the frame.
- `figure.py` draws the person in profile to those joints.
- `composite.py` lays the figure over the render and lights it from the
  screen, then grades the result.

Needs Node with `playwright-core`, `three@0.169.0` and a Chromium with WebGL
(SwiftShader is fine), and Python 3 with numpy, scipy and Pillow.

```
cd design/tentmaiker
ln -s <a node_modules containing three> scene/node_modules
python3 -m http.server 8765 --bind 127.0.0.1 &      # ES modules need http, not file://
Q="cx=-4.3&cy=1.4&cz=5.5&tx=0.15&ty=1.08&tz=-1.2&fov=30&fill=0.5&hemi=0.35&exp=1.3&rim=0.35&moon=1.6&px=0.36&pz=-1.1"
node render3d.mjs render.png "$Q" 2400 1600          # render.png + render.json (joint positions)
python3 -c "import json; from figure import PARTS; json.dump([[n,d] for n,m,d in PARTS], open('parts.json','w'))"
mkdir -p masks && node render_masks.mjs parts.json masks
python3 composite.py render.png                     # full2.png
```

Crops exported to WebP at quality 86:
wide `(140, 90, 2400, 1560)` at 2260/1130, narrow `(420, 250, 2240, 1600)` at 1820/910.
Generated files are not committed.
