import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from figure import PARTS

src = sys.argv[1] if len(sys.argv) > 1 else "r5.png"
anch = json.load(open(src.replace(".png", ".json")))
img8 = np.asarray(Image.open(src).convert("RGB")).astype(np.float64) / 255
lin = img8 ** 2.2
H, W = lin.shape[:2]
ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
S = np.array(anch["screen"])
vx, vy = S[0] - xs, S[1] - ys
dist = np.sqrt(vx ** 2 + vy ** 2) + 1e-6
vx /= dist; vy /= dist
fall = 1 / (1 + (dist / 190) ** 2)
TINT = np.array([0.74, 0.86, 1.0])

MAT = {
    "skin": np.array([0.50, 0.36, 0.30]), "hair": np.array([0.05, 0.043, 0.04]),
    "cloth": np.array([0.055, 0.06, 0.07]), "cloth2": np.array([0.08, 0.085, 0.095]),
    "trousers": np.array([0.04, 0.043, 0.05]), "shoe": np.array([0.03, 0.028, 0.026]),
}
names = list(MAT)
alpha = np.zeros((H, W)); matmap = np.zeros((H, W), np.int8)
for name, mat, _ in PARTS:
    m = np.asarray(Image.open(f"masks/{name}.png").convert("RGBA"))[..., 3] / 255.0
    alpha = np.maximum(alpha, m)
    matmap = np.where(m > 0.5, names.index(mat), matmap)
    # the unlit side: dark, but not dead black; a little of the tent's glow
    lin = lin * (1 - m[..., None]) + (MAT[mat] * 0.006)[None, None, :] * m[..., None]

def facing(mask, sig):
    b = nd.gaussian_filter(mask, sig)
    gy, gx = np.gradient(b)
    g = np.sqrt(gx ** 2 + gy ** 2) + 1e-9
    e = np.clip(g / (g.max() + 1e-9) * 1.7, 0, 1)
    f = np.clip((-gx / g) * vx + (-gy / g) * vy, 0, 1)
    return f, e

f1, e1 = facing(alpha, 1.5)     # crisp rim
f2, e2 = facing(alpha, 9.0)     # broad turn into the light
skin = (matmap == names.index("skin")) & (alpha > 0.5)
tone = np.stack([MAT[n] / MAT[n].max() for n in names])[matmap]
rim = f1 ** 1.8 * e1 * alpha
wash = f2 * np.clip(e2 * 2.5, 0, 1) * alpha
k_rim = np.where(skin, 0.34, 0.20)
k_wash = np.where(skin, 0.05, 0.0)
light = (rim * k_rim + wash * k_wash) * fall
# a faint edge from the lit canvas behind, so the back reads against the dark flap
b = nd.gaussian_filter(alpha, 1.5); gy, gx = np.gradient(b); g = np.sqrt(gx ** 2 + gy ** 2) + 1e-9
back = np.clip((-gx / g) * -0.95 + (-gy / g) * -0.3, 0, 1) ** 2 * np.clip(g / (g.max() + 1e-9) * 1.7, 0, 1) * alpha
light = light + back * 0.020
lin = lin + light[..., None] * TINT * (0.55 + 0.45 * tone)

# grade: cool the shadows a touch, deepen the blacks, grain, vignette
out = lin ** (1 / 2.2)
out = np.clip((out - 0.012) / 0.988, 0, 1)
vig = 1 - 0.28 * (((xs - W * 0.52) / (W * 0.62)) ** 2 + ((ys - H * 0.55) / (H * 0.8)) ** 2)
out = out * np.clip(vig, 0.5, 1)[..., None]
rng = np.random.default_rng(5)
out = np.clip(out + rng.standard_normal((H, W, 1)) * 0.009, 0, 1)
res = Image.fromarray((out * 255 + 0.5).astype(np.uint8))
res.save("full2.png")
res.crop((1180, 660, 1640, 1220)).save("fig2_zoom.png")
res.resize((1200, 800), Image.LANCZOS).save("full2_small.png")
print("ok")
