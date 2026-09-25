import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
from scene import *
from figure import PARTS

H, W = H_IMG, W_IMG
TINT = np.array([0.80, 0.89, 1.0])            # cool, restrained
rad = np.load("interior_rad.npy").astype(np.float64)
surf = np.load("surf.npy")
rad = np.where((surf == 3) | (surf == 4), rad * 0.38, rad)   # darker goat-hair roof
rad = np.where(surf == 7, rad * 0.5, rad)                   # table and stool: dark wood
rad = np.where(surf == 8, rad * 0.35, rad)                  # laptop: dark aluminium
img = rad[..., None] * TINT

ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
S = np.array(project(SCREEN_C))
vx, vy = S[0] - xs, S[1] - ys
dist = np.sqrt(vx ** 2 + vy ** 2) + 1e-6
vx /= dist; vy /= dist

# the screen: bright, with a few lines of text
scr = surf == 9
ui = np.asarray(Image.open("screen_ui.png").convert("RGBA"))[..., 3] / 255.0
scol = np.array([0.80, 0.90, 1.0]) * 0.11
img[scr] = scol * (1 - 0.55 * ui[scr])[:, None]

# light off the table top and keyboard, falling on the back wall and floor near the laptop
pos = np.load("pos.npy").astype(np.float64)
bx, by, bz = pos[0] - 0.03, pos[1] - 0.72, pos[2] - 3.62
dw = np.sqrt(bx ** 2 + by ** 2 + bz ** 2)
recv = np.isin(surf, [0, 1, 2, 5, 6])
bounce = np.where(recv, 0.030 / (1 + (dw / 0.55) ** 2), 0)
img = img + (bounce * rad.clip(0, None).mean() * 0 + bounce * 0.10)[..., None] * TINT
air = 0.0035 / (1 + (dist / 190) ** 2)
img = img + air[..., None] * TINT

# ---------------------------------------------------------------- figure
MAT = {
    "skin": np.array([0.50, 0.37, 0.31]),
    "hair": np.array([0.045, 0.040, 0.037]),
    "cloth": np.array([0.050, 0.055, 0.062]),
    "cloth2": np.array([0.075, 0.08, 0.09]),
    "shoe": np.array([0.03, 0.03, 0.03]),
}
fall = 1.0 / (1.0 + (dist / 320.0) ** 2)
# Lay the parts down flat and dark, remembering which material is on top.
figure_alpha = np.zeros((H, W))
matmap = np.zeros((H, W), dtype=np.int8)
MATS = list(MAT)
for name, mat, _ in PARTS:
    m = np.asarray(Image.open(f"masks/{name}.png").convert("RGBA"))[..., 3] / 255.0
    if m.max() == 0:
        continue
    figure_alpha = np.maximum(figure_alpha, m)
    matmap = np.where(m > 0.5, MATS.index(mat), matmap)
    img = img * (1 - m[..., None]) + (MAT[mat] * 0.0025)[None, None, :] * m[..., None]

def contour_light(mask, sig):
    blur = nd.gaussian_filter(mask, sig)
    gy, gx = np.gradient(blur)
    g = np.sqrt(gx ** 2 + gy ** 2) + 1e-9
    edge = np.clip(g / (g.max() + 1e-9) * 1.6, 0, 1)
    face = np.clip((-gx / g) * vx + (-gy / g) * vy, 0, 1)
    return face, edge

# Rim light only on the true outline of the figure, where it faces the screen.
face, edge = contour_light(figure_alpha, 1.6)
rim = face ** 2.0 * edge * figure_alpha
# Hands and face turn gently into the light as well.
skin = (matmap == MATS.index("skin")) & (figure_alpha > 0.5)
sface, sedge = contour_light(figure_alpha, 6)
soft = np.where(skin, sface * np.clip(sedge * 2, 0, 1), 0)
k = np.where(skin, 0.075, 0.042)
tone = np.stack([MAT[mm] / MAT[mm].max() for mm in MATS])[matmap]
lit = (rim * k + soft * 0.010) * fall
img = img + lit[..., None] * TINT * (0.6 + 0.4 * tone)

# ---------------------------------------------------------------- entrance
front = np.asarray(Image.open("front.png").convert("RGBA")).astype(np.float64) / 255.0
fa = front[..., 3:4]
flin = (front[..., :3] ** 2.2) * 0.16
img = img * (1 - fa) + flin * fa
# the sky outside: near black
sky = ((surf < 0) & (fa[..., 0] < 0.5))
img[sky] = np.array([0.0006, 0.0007, 0.0009])

# ---------------------------------------------------------------- lines
def lines_layer(name):
    return np.asarray(Image.open(name).convert("RGBA"))[..., 3].astype(np.float64) / 255.0
LF = lines_layer("lines_front.png")
LI = lines_layer("lines_inside.png")
occl = np.clip(figure_alpha + np.isin(surf, [7, 8, 9]) + fa[..., 0], 0, 1)
LI = LI * (1 - occl)
L = np.maximum(LF * 0.8, LI)
lw = 0.35 + 0.65 / (1.0 + (dist / 800.0) ** 2)
glow = nd.gaussian_filter(L, 5) * 0.8 + nd.gaussian_filter(L, 18) * 0.5
img = img + (L * 0.020 + glow * 0.006)[..., None] * lw[..., None] * np.array([0.72, 0.85, 1.0])

# ---------------------------------------------------------------- grade
exposure = float(sys.argv[1]) if len(sys.argv) > 1 else 9.0
x = img * exposure
bright = np.clip(x - 0.7, 0, None)
bloom = nd.gaussian_filter(bright, (6, 6, 0)) * 0.35 + nd.gaussian_filter(bright, (26, 26, 0)) * 0.18
x = x + bloom
a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
x = np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)
vig = 1 - 0.30 * (((xs - W * 0.5) / (W * 0.6)) ** 2 + ((ys - H * 0.6) / (H * 0.8)) ** 2)
x = x * np.clip(vig, 0.45, 1)[..., None]
x = x ** (1 / 2.2)
# deeper blacks, a gentle S
x = np.clip((x - 0.025) / 0.975, 0, 1)
x = x * x * (3 - 2 * x) * 0.35 + x * 0.65
rng = np.random.default_rng(3)
x = x + rng.standard_normal((H, W, 1)) * 0.010
x = np.clip(x, 0, 1)
out = Image.fromarray((x * 255 + 0.5).astype(np.uint8))
out.save("full.png")
out.crop((380, 0, 2020, 1600)).save("crop.png")
out.crop((860, 700, 1400, 1440)).save("figure_zoom.png")
out.crop((380, 0, 2020, 1600)).resize((410, 400), Image.LANCZOS).save("crop_phone.png")
out.crop((380, 0, 2020, 1600)).resize((1230, 1200), Image.LANCZOS).save("crop_small.png")
out.crop((560, 0, 1840, 1600)).save("crop_mobile.png")
out.crop((560, 0, 1840, 1600)).resize((390, 488), Image.LANCZOS).save("crop_mobile_small.png")
print("done")
