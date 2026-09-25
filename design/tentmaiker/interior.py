"""Raytrace the tent interior and light it with the laptop screen."""
import numpy as np
from scene import *

rng = np.random.default_rng(7)

def value_noise(shape, cell, seed):
    r = np.random.default_rng(seed)
    gh, gw = shape[0] // cell + 2, shape[1] // cell + 2
    g = r.random((gh, gw))
    yy = np.linspace(0, gh - 1.001, shape[0]); xx = np.linspace(0, gw - 1.001, shape[1])
    y0 = yy.astype(int); x0 = xx.astype(int); fy = (yy - y0)[:, None]; fx = (xx - x0)[None, :]
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy

def fbm1d(t, seed, octaves=4):
    r = np.random.default_rng(seed)
    out = np.zeros_like(t)
    amp, freq = 1.0, 1.0
    for _ in range(octaves):
        ph = r.random() * 6.28
        out += amp * np.sin(t * freq * 6.28 + ph + 0.7 * np.sin(t * freq * 2.1 + ph))
        amp *= 0.5; freq *= 2.1
    return out

H, W = H_IMG, W_IMG
ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
dx = (xs + 0.5 - CX) / F
dy = -(ys + 0.5 - CY) / F
dz = np.ones_like(dx)
O = np.array([0.0, HC, 0.0])

INF = 1e9
t_best = np.full((H, W), INF)
surf = np.full((H, W), -1, dtype=np.int8)   # 0 floor 1 lwall 2 rwall 3 lroof 4 rroof 5 back 6 poles

def consider(t, valid, sid):
    global t_best, surf
    ok = valid & (t > 0) & (t < t_best)
    t_best = np.where(ok, t, t_best)
    surf = np.where(ok, sid, surf)

def point(t):
    return O[0] + dx * t, O[1] + dy * t, O[2] + dz * t

# Entrance: the ray must cross the front plane inside the gable.
tf = Z0
fx_, fy_, _ = point(tf)
roof_at = HE + (HR - HE) * (1 - np.abs(fx_) / HW)
inside_front = (np.abs(fx_) <= HW) & (fy_ >= 0) & (fy_ <= np.where(np.abs(fx_) <= HW, roof_at, 0))

with np.errstate(divide="ignore", invalid="ignore"):
    # floor
    t = (0 - HC) / dy; x, y, z = point(t)
    consider(t, (dy < 0) & (np.abs(x) <= HW) & (z >= Z0) & (z <= Z1), 0)
    # walls
    for sid, sx in ((1, -HW), (2, HW)):
        t = sx / dx; x, y, z = point(t)
        consider(t, (y >= 0) & (y <= HE) & (z >= Z0) & (z <= Z1), sid)
    # roofs: y = HE + (HR-HE)(1 - |x|/HW) for each side
    k = (HR - HE) / HW
    for sid, sgn in ((3, -1), (4, 1)):
        # y = HR - k*sgn*x  -> HC + dy t = HR - k sgn dx t
        t = (HR - HC) / (dy + k * sgn * dx); x, y, z = point(t)
        consider(t, (sgn * x >= 0) & (sgn * x <= HW) & (z >= Z0) & (z <= Z1), sid)
    # back wall
    t = Z1 / dz; x, y, z = point(t)
    ra = HE + (HR - HE) * (1 - np.abs(x) / HW)
    consider(t, (np.abs(x) <= HW) & (y >= 0) & (y <= ra), 5)

    # Poles: vertical posts at the walls, the back centre post, the ridge pole.
    def vcyl(cx_, cz_, r, y0, y1, sid):
        # ray-cylinder (vertical axis) intersection
        ox, oz = O[0] - cx_, O[2] - cz_
        a = dx * dx + dz * dz; b = 2 * (ox * dx + oz * dz); c = ox * ox + oz * oz - r * r
        disc = b * b - 4 * a * c
        t = (-b - np.sqrt(np.maximum(disc, 0))) / (2 * a)
        x, y, z = point(t)
        consider(t, (disc > 0) & (y >= y0) & (y <= y1), sid)
    for zp in POSTS:
        vcyl(-HW + 0.05, zp, 0.045, 0, HE + 0.02, 6)
        vcyl(HW - 0.05, zp, 0.045, 0, HE + 0.02, 6)
    vcyl(0.0, Z1 - 0.06, 0.035, 0, HR, 6)
    # ridge pole: horizontal cylinder along z
    ox, oy = O[0] - 0.0, O[1] - (HR - 0.05)
    a = dx * dx + dy * dy; b = 2 * (ox * dx + oy * dy); c = ox * ox + oy * oy - 0.045 ** 2
    disc = b * b - 4 * a * c
    t = (-b - np.sqrt(np.maximum(disc, 0))) / (2 * a); x, y, z = point(t)
    consider(t, (disc > 0) & (z >= Z0) & (z <= Z1), 6)


# ---- props: table, stool, laptop (axis aligned and oriented boxes)
def box(lo, hi, sid, origin=None, axes=None):
    """Slab test. With axes, the box is oriented: lo/hi are in local coords."""
    global t_best, surf
    if axes is None:
        ox_, oy_, oz_ = O
        ddx, ddy, ddz = dx, dy, dz
    else:
        u, v, w = axes
        rel = O - origin
        ox_, oy_, oz_ = rel @ u, rel @ v, rel @ w
        ddx = dx * u[0] + dy * u[1] + dz * u[2]
        ddy = dx * v[0] + dy * v[1] + dz * v[2]
        ddz = dx * w[0] + dy * w[1] + dz * w[2]
    with np.errstate(divide="ignore", invalid="ignore"):
        tx1 = (lo[0] - ox_) / ddx; tx2 = (hi[0] - ox_) / ddx
        ty1 = (lo[1] - oy_) / ddy; ty2 = (hi[1] - oy_) / ddy
        tz1 = (lo[2] - oz_) / ddz; tz2 = (hi[2] - oz_) / ddz
    tmin = np.maximum.reduce([np.minimum(tx1, tx2), np.minimum(ty1, ty2), np.minimum(tz1, tz2)])
    tmax = np.minimum.reduce([np.maximum(tx1, tx2), np.maximum(ty1, ty2), np.maximum(tz1, tz2)])
    hit = (tmax >= tmin) & (tmin > 0)
    consider(np.where(hit, tmin, INF), hit, sid)

TABLE = dict(x0=-0.27, x1=0.33, z0=3.36, z1=3.80, top=TABLE_Y)
box((TABLE["x0"], TABLE_Y - 0.04, TABLE["z0"]), (TABLE["x1"], TABLE_Y, TABLE["z1"]), 7)
for lx in (TABLE["x0"] + 0.03, TABLE["x1"] - 0.07):
    for lz in (TABLE["z0"] + 0.03, TABLE["z1"] - 0.07):
        box((lx, 0, lz), (lx + 0.04, TABLE_Y - 0.04, lz + 0.04), 7)
STOOL = dict(x0=-0.50, x1=-0.12, z0=2.82, z1=3.10, top=0.45)
box((STOOL["x0"], 0.41, STOOL["z0"]), (STOOL["x1"], 0.45, STOOL["z1"]), 7)
for lx in (STOOL["x0"] + 0.03, STOOL["x1"] - 0.065):
    for lz in (STOOL["z0"] + 0.03, STOOL["z1"] - 0.065):
        box((lx, 0, lz), (lx + 0.035, 0.41, lz + 0.035), 7)
# laptop: deck in front of the hinge, lid behind the screen
Nh = np.array([SCREEN_N[0], 0, SCREEN_N[2]]); Nh /= np.linalg.norm(Nh)
Uh = np.array([SCREEN_U[0], 0, SCREEN_U[2]]); Uh /= np.linalg.norm(Uh)
hinge = SCREEN_C - SCREEN_V * SCREEN_H / 2
deck_o = np.array([hinge[0], TABLE_Y, hinge[2]])
box((-SCREEN_W / 2 - 0.005, 0.0, 0.0), (SCREEN_W / 2 + 0.005, 0.016, 0.22), 8, deck_o, (Uh, np.array([0, 1.0, 0]), Nh))
lid_o = SCREEN_C
box((-SCREEN_W / 2 - 0.008, -SCREEN_H / 2 - 0.008, -0.012), (SCREEN_W / 2 + 0.008, SCREEN_H / 2 + 0.008, -0.001), 8, lid_o, (SCREEN_U, SCREEN_V, SCREEN_N))
# the screen itself, a thin emissive face just in front of the lid
box((-SCREEN_W / 2, -SCREEN_H / 2, -0.001), (SCREEN_W / 2, SCREEN_H / 2, 0.0005), 9, lid_o, (SCREEN_U, SCREEN_V, SCREEN_N))

surf = np.where(inside_front, surf, -1)
t_best = np.where(surf >= 0, t_best, np.nan)
PX, PY, PZ = point(t_best)

# ---------------------------------------------------------------- normals
NX = np.zeros((H, W)); NY = np.zeros((H, W)); NZ = np.zeros((H, W))
NY[surf == 0] = 1
NX[surf == 1] = 1
NX[surf == 2] = -1
k = (HR - HE) / HW
nr = 1 / np.sqrt(1 + k * k)
NX[surf == 3] = k * nr; NY[surf == 3] = -nr
NX[surf == 4] = -k * nr; NY[surf == 4] = -nr
NZ[surf == 5] = -1
# poles: normal from axis
pole = surf == 6
vx = PX.copy(); vz = PZ.copy()
for zp in POSTS + [Z1 - 0.06]:
    pass
# approximate pole normal: horizontal toward camera side, good enough for thin poles
with np.errstate(invalid="ignore"):
    ln = np.sqrt(PX ** 2 + (PZ - 0) ** 2) + 1e-9
NX = np.where(pole, -np.nan_to_num(PX) / ln * 0.3, NX)
NZ = np.where(pole, -1.0, NZ)

# ---------------------------------------------------------------- fabric folds
# Walls: vertical folds, their phase travelling along z.
zz = np.nan_to_num(PZ)
fold_w = fbm1d(zz / 0.30, 11) * 0.42
m = (surf == 1) | (surf == 2)
NZ = np.where(m, NZ + fold_w, NZ)
# folds fade toward the top where the cloth is pulled taut to the eave
NZ = np.where(m, NZ * (0.55 + 0.45 * np.clip(1 - np.nan_to_num(PY) / HE, 0, 1)), NZ)
# Walls also sag a little between posts near the top.
# Roof: panels sag between rafters, with long folds running down the slope.
seg = np.nan_to_num(PZ)
rafters = np.array([Z0] + POSTS + [Z1])
idx = np.clip(np.searchsorted(rafters, seg) - 1, 0, len(rafters) - 2)
r0 = rafters[idx]; r1 = rafters[idx + 1]
u = np.clip((seg - r0) / (r1 - r0), 0, 1)
sag = np.cos(u * np.pi) * 0.5           # slope of the sag along z
roof = (surf == 3) | (surf == 4)
along = np.nan_to_num(np.abs(PX)) / HW
diag = fbm1d(seg / 0.45 + along * 1.6, 23) * 0.2
NZ = np.where(roof, NZ + sag + diag, NZ)
# Back wall: gentle vertical folds.
bf = fbm1d(np.nan_to_num(PX) / 0.26, 31) * 0.35
NX = np.where(surf == 5, NX + bf, NX)

# props: tops face up, everything else faces the camera side
propm = (surf == 7) | (surf == 8)
top_face = propm & (np.abs(PY - TABLE_Y) < 0.004) | (surf == 7) & (np.abs(PY - 0.45) < 0.004) | (surf == 8) & (PY > TABLE_Y + 0.0155) & (PY < TABLE_Y + 0.0175)
NX = np.where(propm, 0.0, NX); NY = np.where(propm, np.where(top_face, 1.0, 0.0), NY); NZ = np.where(propm, np.where(top_face, 0.0, -1.0), NZ)
nl = np.sqrt(NX ** 2 + NY ** 2 + NZ ** 2) + 1e-9
NX /= nl; NY /= nl; NZ /= nl

# ---------------------------------------------------------------- albedo
albedo = np.zeros((H, W))
weave = value_noise((H, W), 3, 1) * 0.10 + value_noise((H, W), 40, 2) * 0.16 + value_noise((H, W), 160, 3) * 0.14
canvas = 0.52 + weave - 0.2
albedo = np.where((surf >= 1) & (surf <= 5), canvas, albedo)
# seams: walls vertical every 0.9 m of z (at the posts too) and horizontal courses;
# roof courses parallel to the ridge; back wall vertical seams.
def line_mask(v, spacing, width, offset=0.0):
    f = np.abs(((v - offset) / spacing) % 1.0 - 0.5) * spacing
    return np.clip(1 - (spacing / 2 - f) / width, 0, 1)
with np.errstate(invalid="ignore"):
    wall_course = line_mask(np.nan_to_num(PZ), 0.62, 0.010, 0.1)
    roof_course = line_mask(np.nan_to_num(np.abs(PX)), 0.40, 0.007, 0.05) * 0.7
    back_seam = line_mask(np.nan_to_num(PX), 0.40, 0.009, 0.2)
seam = np.zeros((H, W))
seam = np.where(m, wall_course, seam)
seam = np.where(roof, roof_course, seam)
seam = np.where(surf == 5, back_seam, seam)
albedo = albedo * (1 - 0.5 * seam)
crease = np.zeros((H, W))
crease = np.where(m, np.clip(-fbm1d(zz / 0.30, 11), 0, 2) * 0.22, crease)
crease = np.where(surf == 5, np.clip(-fbm1d(np.nan_to_num(PX) / 0.26, 31), 0, 2) * 0.22, crease)
crease = np.where(roof, np.clip(-np.cos(u * np.pi * 2), 0, 1) * 0.12, crease)
albedo = albedo * (1 - crease)
# floor: packed earth, a woven mat in the middle
earth = 0.16 + value_noise((H, W), 25, 5) * 0.10 + value_noise((H, W), 4, 6) * 0.06
mat = (np.abs(np.nan_to_num(PX) + 0.12) < 0.75) & (np.nan_to_num(PZ) > 2.5) & (np.nan_to_num(PZ) < 4.3)
matv = 0.24 + 0.025 * np.sin(np.nan_to_num(PX) * 90) + value_noise((H, W), 6, 8) * 0.05
border = (np.abs(np.abs(np.nan_to_num(PX) + 0.12) - 0.68) < 0.025) | (np.abs(np.nan_to_num(PZ) - 2.57) < 0.025) | (np.abs(np.nan_to_num(PZ) - 4.23) < 0.025)
matv = np.where(border, 0.30, matv)
albedo = np.where(surf == 0, np.where(mat, matv, earth), albedo)
albedo = np.where(pole, 0.22 + value_noise((H, W), 2, 9) * 0.08, albedo)
grain = np.sin(np.nan_to_num(PX) * 160 + value_noise((H, W), 30, 12) * 6) * 0.04
albedo = np.where(surf == 7, 0.26 + grain + value_noise((H, W), 3, 13) * 0.05, albedo)
albedo = np.where(surf == 8, 0.34, albedo)

# ---------------------------------------------------------------- lighting
# Occluders for shadows: the person (ellipsoids), the table top.
occ = [
    (np.array([-0.31, 0.72, 2.95]), np.array([0.22, 0.34, 0.16])),   # torso
    (np.array([-0.29, 1.22, 2.97]), np.array([0.10, 0.12, 0.10])),   # head
    (np.array([-0.31, 0.42, 2.95]), np.array([0.22, 0.06, 0.20])),   # stool/hips
    (np.array([-0.10, 0.80, 3.20]), np.array([0.14, 0.07, 0.22])),   # arms
]
def blocked(px, py, pz, qx, qy, qz):
    b = np.zeros(px.shape, dtype=bool)
    sx, sy, sz = qx - px, qy - py, qz - pz
    for c, r in occ:
        ox, oy, oz = (px - c[0]) / r[0], (py - c[1]) / r[1], (pz - c[2]) / r[2]
        ex, ey, ez = sx / r[0], sy / r[1], sz / r[2]
        a = ex * ex + ey * ey + ez * ez
        bb = 2 * (ox * ex + oy * ey + oz * ez)
        cc = ox * ox + oy * oy + oz * oz - 1
        disc = bb * bb - 4 * a * cc
        sq = np.sqrt(np.maximum(disc, 0))
        t1 = (-bb - sq) / (2 * a); t2 = (-bb + sq) / (2 * a)
        b |= (disc > 0) & (((t1 > 0.01) & (t1 < 0.99)) | ((t2 > 0.01) & (t2 < 0.99)))
    # table top rectangle at TABLE_Y
    with np.errstate(divide="ignore", invalid="ignore"):
        tt = (TABLE_Y - py) / sy
        ix, iz = px + sx * tt, pz + sz * tt
    b |= (tt > 0.01) & (tt < 0.99) & (np.abs(ix - 0.03) < 0.30) & (np.abs(iz - 3.58) < 0.22)
    return b

E = np.zeros((H, W))
valid = surf >= 0
px, py, pz = [np.nan_to_num(a) for a in (PX, PY, PZ)]
ns = 7
for i in range(ns):
    for j in range(4):
        q = SCREEN_C + SCREEN_U * SCREEN_W * ((i + 0.5) / ns - 0.5) + SCREEN_V * SCREEN_H * ((j + 0.5) / 4 - 0.5)
        lx, ly, lz = q[0] - px, q[1] - py, q[2] - pz
        r2 = lx * lx + ly * ly + lz * lz + 1e-6
        r = np.sqrt(r2)
        cos_s = np.maximum(0, -(lx * SCREEN_N[0] + ly * SCREEN_N[1] + lz * SCREEN_N[2]) / r)
        cos_r = np.maximum(0, (lx * NX + ly * NY + lz * NZ) / r)
        sh = blocked(px, py, pz, np.full_like(px, q[0]), np.full_like(py, q[1]), np.full_like(pz, q[2]))
        E += np.where(sh, 0, cos_s ** 2.2 * cos_r / r2)
E /= ns * 4
# a little bounce light so shadowed canvas is not dead black
bounce = 0.018 / (1 + ((px - 0.0) ** 2 + (py - 0.9) ** 2 + (pz - 3.4) ** 2))
rad = albedo * (E * 0.55 + bounce)
rad = np.where(valid, rad, 0)
rad = np.where(surf == 9, 1.0, rad)
np.save("surf.npy", surf)
np.save("pos.npy", np.stack([np.nan_to_num(PX), np.nan_to_num(PY), np.nan_to_num(PZ)]).astype(np.float32))

np.save("interior_rad.npy", rad.astype(np.float32))
np.save("interior_mask.npy", valid)
print("max", float(rad.max()), "p99", float(np.percentile(rad[valid], 99)))
