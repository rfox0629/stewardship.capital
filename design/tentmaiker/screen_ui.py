"""A few lines of text on the laptop screen, in perspective."""
import numpy as np
from scene import *

def P(u, v):
    p = SCREEN_C + SCREEN_U * SCREEN_W * (u - 0.5) + SCREEN_V * SCREEN_H * (v - 0.5)
    return project(p)

rows = []
rng = np.random.default_rng(4)
for i in range(9):
    v = 0.86 - i * 0.085
    indent = [0.08, 0.08, 0.14, 0.14, 0.2, 0.14, 0.08, 0.14, 0.08][i]
    length = rng.uniform(0.25, 0.62)
    a = P(indent, v); b = P(min(indent + length, 0.92), v)
    rows.append(f'<path d="M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}" stroke="#000" stroke-width="3.2" '
                f'stroke-linecap="round" stroke-opacity="{0.35 if i % 3 else 0.55}"/>')
open("screen_ui.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_IMG}" height="{H_IMG}" '
                                 f'viewBox="0 0 {W_IMG} {H_IMG}">' + "".join(rows) + "</svg>")
