"""The entrance: front canvas, door poles, tied-back curtains; and the lit lines."""
import numpy as np
from scene import *

A = project((0, HR, Z0))                    # front apex
EL = project((-HW, HE, Z0)); ER = project((HW, HE, Z0))
DOOR = 0.95                                 # door poles at x = +-0.95 m
def gable_y(x):
    return HE + (HR - HE) * (1 - abs(x) / HW)
PL_top = project((-DOOR, gable_y(DOOR), Z0)); PR_top = project((DOOR, gable_y(DOOR), Z0))
TIE_H = 0.98
TL = project((-DOOR, TIE_H, Z0)); TR = project((DOOR, TIE_H, Z0))
BOT = 1600

def f(p): return f"{p[0]:.1f} {p[1]:.1f}"

def curtain(side):
    s = -1 if side == "L" else 1
    ax, ay = A
    top = PL_top if side == "L" else PR_top
    tie = TL if side == "L" else TR
    tx, ty = tie
    # inner edge: from the apex, falling steeply then sweeping out to the tie
    c1 = (ax + s * 90, ay + 260); c2 = (tx - s * 40, ty - 330)
    body = f"M{f(A)} L{f(top)} L{tx:.1f} {ty:.1f} C{f(c2)} {f(c1)} {f(A)} Z"
    # fold lines fanning from the gable edge to the tie
    folds = []
    for k in range(1, 9):
        t = k / 9
        sx = ax + (top[0] - ax) * t; sy = ay + (top[1] - ay) * t
        # inner edge point for this fold
        mx = sx + (tx - sx) * 0.55 - s * 30 * (1 - t); my = sy + (ty - sy) * 0.55 + 40 * (1 - t)
        folds.append((f"M{sx:.1f} {sy:.1f} Q{mx:.1f} {my:.1f} {tx + s * 4:.1f} {ty:.1f}", t))
    # gathered fall below the tie
    w_top, w_bot = 42, 150
    fall = (f"M{tx - w_top:.1f} {ty:.1f} C{tx - w_top - 10:.1f} {ty + 200:.1f} {tx - w_bot:.1f} {BOT - 300:.1f} {tx - w_bot:.1f} {BOT} "
            f"L{tx + w_bot:.1f} {BOT} C{tx + w_bot:.1f} {BOT - 300:.1f} {tx + w_top + 10:.1f} {ty + 200:.1f} {tx + w_top:.1f} {ty:.1f} Z")
    fall_folds = []
    for k in range(-4, 5):
        fall_folds.append(f"M{tx + k * 8:.1f} {ty + 6:.1f} C{tx + k * 12:.1f} {ty + 220:.1f} {tx + k * 30:.1f} {BOT - 260:.1f} {tx + k * 34:.1f} {BOT}")
    return body, folds, fall, fall_folds, tie

parts = []
# the exterior front wall: everything below the gable line, outside the door
front_wall = (f"M-60 {EL[1] + (A[1]-EL[1]) * (-60-EL[0])/(A[0]-EL[0]):.1f} L{f(A)} "
              f"L2460 {ER[1] + (A[1]-ER[1]) * (2460-ER[0])/(A[0]-ER[0]):.1f} L2460 {BOT} L-60 {BOT} Z")
door = f"M{f(A)} L{f(PR_top)} L{PR_top[0]:.1f} {BOT} L{PL_top[0]:.1f} {BOT} L{f(PL_top)} Z"

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_IMG}" height="{H_IMG}" viewBox="0 0 {W_IMG} {H_IMG}">',
       '<defs>',
       '<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0c0e"/><stop offset="1" stop-color="#060607"/></linearGradient>',
       '<linearGradient id="flapL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07090c"/><stop offset="0.72" stop-color="#101214"/><stop offset="0.95" stop-color="#2c3238"/><stop offset="1" stop-color="#5d6770"/></linearGradient>',
       '<linearGradient id="flapR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#07090c"/><stop offset="0.72" stop-color="#101214"/><stop offset="0.95" stop-color="#262b31"/><stop offset="1" stop-color="#4c555e"/></linearGradient>',
       '<linearGradient id="fallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#06070a"/><stop offset="0.6" stop-color="#101214"/><stop offset="0.93" stop-color="#2a3036"/><stop offset="1" stop-color="#58626b"/></linearGradient>',
       '<linearGradient id="fallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#06070a"/><stop offset="0.6" stop-color="#101214"/><stop offset="0.93" stop-color="#23282d"/><stop offset="1" stop-color="#48515a"/></linearGradient>',
       '<mask id="outside"><rect width="2400" height="1600" fill="#fff"/><path d="' + door + '" fill="#000"/></mask>',
       '</defs>',
       f'<path d="{front_wall}" fill="url(#wall)" mask="url(#outside)"/>']
# vertical seams on the front wall
for k in range(-6, 7):
    x = CX + F * (k * 0.32) / Z0
    if abs(k * 0.32) > DOOR + 0.05:
        svg.append(f'<path d="M{x:.1f} 0 V {BOT}" stroke="#141619" stroke-width="3" mask="url(#outside)"/>')
for side in ("L", "R"):
    body, folds, fall, fall_folds, tie = curtain(side)
    g = "flapL" if side == "L" else "flapR"
    svg.append(f'<path d="{body}" fill="url(#{g})"/>')
    for d, t in folds:
        svg.append(f'<path d="{d}" fill="none" stroke="#000" stroke-opacity="{0.35 + 0.2 * t:.2f}" stroke-width="{5 + 6 * t:.1f}"/>')
        svg.append(f'<path d="{d}" fill="none" stroke="#5a6068" stroke-opacity="{0.10 + 0.15 * t:.2f}" stroke-width="1.5" transform="translate({-3 if side == "L" else 3} 0)"/>')
    svg.append(f'<path d="{fall}" fill="url(#fall{side})"/>')
    for d in fall_folds:
        svg.append(f'<path d="{d}" fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="7"/>')
        svg.append(f'<path d="{d}" fill="none" stroke="#5a6068" stroke-opacity="0.22" stroke-width="1.5" transform="translate(4 0)"/>')
    # tie: a rope band around the gathered cloth
    tx, ty = tie
    svg.append(f'<path d="M{tx - 50:.1f} {ty - 6:.1f} Q{tx:.1f} {ty + 14:.1f} {tx + 50:.1f} {ty - 6:.1f}" fill="none" stroke="#2b2620" stroke-width="10" stroke-linecap="round"/>')
# door poles
for top in (PL_top, PR_top):
    x = top[0]
    svg.append(f'<rect x="{x - 15:.1f}" y="{top[1] - 30:.1f}" width="30" height="{BOT - top[1] + 30:.1f}" fill="#120f0c"/>')
    inner = 1 if x < CX else -1
    svg.append(f'<rect x="{x + inner * 13 - 1:.1f}" y="{top[1]:.1f}" width="2" height="{BOT - top[1]:.1f}" fill="#9aa6b2" opacity="0.45"/>')
svg.append('</svg>')
open("front.svg", "w").write("\n".join(svg))

# ---------------------------------------------------------------- the lines
# One line system following the construction: the gable edges, the ridge, the
# centre pole, and at the foot of the back wall it becomes circuitry.
def open_svg():
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_IMG}" height="{H_IMG}" viewBox="0 0 {W_IMG} {H_IMG}">']
G = open_svg(); I = open_svg()
gl = project((-HW - 0.2, HE - 0.14, Z0)); gr = project((HW + 0.2, HE - 0.14, Z0))
G.append(f'<path d="M{f(gl)} L{f(A)} L{f(gr)}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>')
ridge_front = project((0, HR - 0.1, Z0 + 0.02)); ridge_back = project((0, HR - 0.02, Z1))
I.append(f'<path d="M{f(ridge_front)} L{f(ridge_back)}" fill="none" stroke="#fff" stroke-width="1.8"/>')
def trace(pts, w=1.4, op=0.9):
    d = "M" + " L".join(f(project(p)) for p in pts)
    I.append(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="{w}" stroke-opacity="{op}" stroke-linejoin="round"/>')
z = Z1 - 0.005
# the back gable's edges carry the line down to the corners...
trace([(-HW, HE, z), (0, HR, z), (HW, HE, z)], 1.4, 0.7)
# ...where it becomes circuitry along the back wall, stopping short of the person
trace([(-HW, HE, z), (-HW, 1.16, z), (-1.30, 1.16, z), (-1.20, 1.06, z), (-0.86, 1.06, z)])
trace([(-HW, 1.16, z), (-HW, 0.92, z), (-1.36, 0.92, z)], 1.1, 0.6)
trace([(HW, HE, z), (HW, 1.16, z), (1.30, 1.16, z), (1.20, 1.06, z), (0.86, 1.06, z)])
trace([(HW, 1.16, z), (HW, 0.92, z), (1.36, 0.92, z)], 1.1, 0.6)
for p in [(-0.86, 1.06, z), (0.86, 1.06, z), (-1.36, 0.92, z), (1.36, 0.92, z)]:
    x, y = project(p)
    I.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.4" fill="none" stroke="#fff" stroke-width="1.3"/>')
for L_ in (G, I): L_.append('</svg>')
open("lines_front.svg", "w").write("\n".join(G))
open("lines_inside.svg", "w").write("\n".join(I))
print("apex", A)
