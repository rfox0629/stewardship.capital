"""Shared scene definition: camera, tent geometry, light, and projection."""
import numpy as np

W_IMG, H_IMG = 2400, 1600
F = 1716.0            # focal length in pixels
CX, CY = 1200.0, 840.0
HC = 1.1              # camera height, metres

# Tent: axis along +z, centred on x = 0.
HW = 1.6              # half width
HE = 1.4              # eave height
HR = 2.1              # ridge height
Z0 = 2.2              # front (entrance) plane
Z1 = 4.9              # back wall
POSTS = [3.1, 4.0]    # interior posts and rafters along each side

# Laptop screen: an area light facing the person.
PERSON = np.array([-0.30, 0.0, 2.95])
SCREEN_C = np.array([0.04, 0.84, 3.50])
_to_person = np.array([PERSON[0] - SCREEN_C[0], 0.0, PERSON[2] - SCREEN_C[2]])
_to_person /= np.linalg.norm(_to_person)
SCREEN_N = _to_person + np.array([0, 0.06, 0])
SCREEN_N /= np.linalg.norm(SCREEN_N)
# In-plane axes of the screen
SCREEN_U = np.cross(np.array([0, 1.0, 0]), SCREEN_N); SCREEN_U /= np.linalg.norm(SCREEN_U)
SCREEN_V = np.cross(SCREEN_N, SCREEN_U)
SCREEN_W, SCREEN_H = 0.31, 0.20
TABLE_Y = 0.70


def project(p):
    x, y, z = p
    return (CX + F * x / z, CY - F * (y - HC) / z)


def screen_corners():
    c = SCREEN_C
    u, v = SCREEN_U * SCREEN_W / 2, SCREEN_V * SCREEN_H / 2
    return [c - u - v, c + u - v, c + u + v, c - u + v]
