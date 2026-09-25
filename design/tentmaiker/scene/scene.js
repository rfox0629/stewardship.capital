import * as THREE from "three";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const P = new URLSearchParams(location.search);
const W = +(P.get("w") || 2400), H = +(P.get("h") || 1600);

/* ------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = +(P.get("exp") || 1.0);
document.body.appendChild(renderer.domElement);
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
{
  // a night sky: near black above, lifting very slightly toward the horizon
  const c = document.createElement("canvas"); c.width = 16; c.height = 512;
  const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#050608"); gr.addColorStop(0.45, "#0a0d12"); gr.addColorStop(0.62, "#141a22"); gr.addColorStop(0.66, "#0b0d10"); gr.addColorStop(1, "#060708");
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
scene.fog = new THREE.FogExp2(0x060708, 0.055);

/* ------------------------------------------------------------ dimensions */
const HW = 1.65;      // half width at the eaves
const EH = 0.55;      // eave (wall) height
const RH = 2.2;       // ridge height at the poles
const L = 3.6;        // length, front at z = 0, back at z = -L

/* The person: seated on a stool, facing right and a little toward us, so the
   camera sees a clean right profile. */
const PERSON = new THREE.Vector3(+(new URLSearchParams(location.search).get('px') || 0.02), 0, +(new URLSearchParams(location.search).get('pz') || -1.0));
const FACE = new THREE.Vector3(0.81, 0, 0.59).normalize();
const RIGHT = new THREE.Vector3().crossVectors(FACE, new THREE.Vector3(0, 1, 0)).normalize();
const local = (a, y, r = 0) =>
  PERSON.clone().addScaledVector(FACE, a).addScaledVector(RIGHT, r).setY(y);

/* ------------------------------------------------------------ textures */
function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
// Linen: a fine weave, slubs, a little staining.
const clothMap = canvasTexture(1024, (g, n) => {
  const r = rand(7);
  g.fillStyle = "#8f8a80"; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 26000; i++) {
    const x = r() * n, y = r() * n, l = 2 + r() * 10, v = 120 + r() * 40;
    g.strokeStyle = `rgba(${v},${v - 4},${v - 12},${0.08 + r() * 0.08})`;
    g.beginPath();
    if (r() < 0.5) { g.moveTo(x, y); g.lineTo(x + l, y); } else { g.moveTo(x, y); g.lineTo(x, y + l); }
    g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * n, y = r() * n, rad = 30 + r() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(40,36,30,${0.05 + r() * 0.06})`); gr.addColorStop(1, "rgba(40,36,30,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
});
clothMap.colorSpace = THREE.SRGBColorSpace;
const clothBump = canvasTexture(512, (g, n) => {
  const r = rand(11);
  g.fillStyle = "#808080"; g.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.05})`; g.fillRect(0, y, n, 1); }
  for (let x = 0; x < n; x += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`; g.fillRect(x, 0, 1, n); }
});
const earthMap = canvasTexture(1024, (g, n) => {
  const r = rand(3);
  g.fillStyle = "#2a2723"; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 40000; i++) {
    const v = 20 + r() * 40; g.fillStyle = `rgba(${v},${v - 2},${v - 5},0.5)`;
    g.fillRect(r() * n, r() * n, 1 + r() * 3, 1 + r() * 3);
  }
});
earthMap.colorSpace = THREE.SRGBColorSpace;
earthMap.repeat.set(10, 10);
const woodMap = canvasTexture(256, (g, n) => {
  const r = rand(5);
  g.fillStyle = "#3b2b1f"; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(20,12,6,${0.2 + r() * 0.3})`; g.beginPath(); const x = r() * n; g.moveTo(x, 0); g.bezierCurveTo(x + 8, n / 3, x - 8, 2 * n / 3, x + r() * 6, n); g.stroke(); }
});
woodMap.colorSpace = THREE.SRGBColorSpace;
const rugMap = canvasTexture(512, (g, n) => {
  g.fillStyle = "#3a2a24"; g.fillRect(0, 0, n, n);
  g.strokeStyle = "#5a4436"; g.lineWidth = 10; g.strokeRect(24, 24, n - 48, n - 48);
  g.lineWidth = 3; g.strokeRect(50, 50, n - 100, n - 100);
  for (let y = 70; y < n - 70; y += 26) { g.fillStyle = "rgba(90,70,56,0.35)"; g.fillRect(70, y, n - 140, 6); }
});
rugMap.colorSpace = THREE.SRGBColorSpace;

/* ------------------------------------------------------------ materials */
const SCREEN_POS = local(0.86, 0.84);
// Canvas lets a little of the laptop's light through: a faint glow on the
// cloth nearest the screen, seen from outside as well as in.
function clothMaterial(repeat) {
  const m = new THREE.MeshStandardMaterial({
    map: clothMap.clone(), bumpMap: clothBump.clone(), bumpScale: 0.6,
    roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
  });
  m.map.repeat.set(repeat[0], repeat[1]); m.bumpMap.repeat.set(repeat[0] * 8, repeat[1] * 8);
  m.map.needsUpdate = true; m.bumpMap.needsUpdate = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlowPos = { value: SCREEN_POS };
    sh.uniforms.uRim = { value: new THREE.Color(0x9fb3cc).multiplyScalar(+(P.get("rim") || 0.22)) };
    sh.uniforms.uGlow = { value: new THREE.Color(0x6f98c8).multiplyScalar(+(P.get("glow") || 0.35)) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorld;\nuniform vec3 uGlowPos;\nuniform vec3 uGlow;\nuniform vec3 uRim;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nfloat gd = distance(vWorld, uGlowPos);\ntotalEmissiveRadiance += uGlow * diffuseColor.rgb / (1.0 + gd * gd * 2.2);")
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nvec3 vdir = normalize(cameraPosition - vWorld);\nvec3 nw = normalize(inverseTransformDirection(normal, viewMatrix));\nfloat fr = pow(1.0 - abs(dot(nw, vdir)), 4.0);\nfloat up = smoothstep(0.2, 2.2, vWorld.y);\ntotalEmissiveRadiance += uRim * fr * (0.35 + 0.65 * up);");
  };
  return m;
}
const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.8 });
const rope = new THREE.MeshStandardMaterial({ color: 0x6f675a, roughness: 1 });

/* ------------------------------------------------------------ the tent */
const tent = new THREE.Group(); scene.add(tent);
const ridgeY = (v) => RH - 0.08 * Math.sin(Math.PI * v);
const eaveY = (v) => EH - 0.035 * Math.abs(Math.sin(3 * Math.PI * v));
const sagEave = (v) => 0.03 * Math.abs(Math.sin(3 * Math.PI * v));

function roof(s) {
  return new ParametricGeometry((u, v, t) => {
    const z = 0.04 - v * (L + 0.08);
    const ry = ridgeY(v), ey = eaveY(v);
    let x = s * u * (HW + 0.05), y = ry + (ey - ry) * u;
    // the cloth bellies inward between ridge and eave, most in the middle bays
    const belly = 0.07 * Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.abs(Math.sin(3 * Math.PI * v)));
    const slope = Math.atan2(RH - EH, HW);
    x -= s * belly * Math.sin(slope); y -= belly * Math.cos(slope);
    // tension folds running from the guy points toward the ridge
    y += 0.012 * Math.sin(22 * v + 6 * u) * u;
    t.set(x, y, z);
  }, 60, 90);
}
function wall(s) {
  return new ParametricGeometry((u, v, t) => {
    const z = -v * L;
    const ey = eaveY(v) - sagEave(v) * 0.2;
    const x = s * (HW + 0.05 + 0.08 * u + 0.015 * Math.sin(40 * v) * u);
    t.set(x, ey * (1 - u), z);
  }, 10, 90);
}
function gable(zPos) {
  // back gable (closed) as a shape
  const sh = new THREE.Shape();
  sh.moveTo(-HW - 0.12, 0); sh.lineTo(-HW - 0.05, EH); sh.lineTo(0, RH); sh.lineTo(HW + 0.05, EH); sh.lineTo(HW + 0.12, 0); sh.lineTo(-HW - 0.12, 0);
  const g = new THREE.ShapeGeometry(sh, 24);
  const m = new THREE.Mesh(g, clothMaterial([2, 2])); m.position.z = zPos; return m;
}
const addMesh = (geo, mat, cast = true, recv = true) => {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; tent.add(m); return m;
};
addMesh(roof(-1), clothMaterial([2, 3]));
addMesh(roof(1), clothMaterial([2, 3]));
addMesh(wall(-1), clothMaterial([3, 1]));
addMesh(wall(1), clothMaterial([3, 1]));
const back = gable(-L - 0.04); back.castShadow = back.receiveShadow = true; tent.add(back);

/* The front: fabric beside the door, and the two flaps gathered and tied back
   to the front poles. */
const TIE_Y = 1.02;
const poleFoot = (s) => new THREE.Vector3(s * 1.18, 0, 0.16);
const poleTop = (s) => new THREE.Vector3(-s * 0.26, RH + 0.32, 0.02);
const onPole = (s, y) => poleFoot(s).lerp(poleTop(s), y / (RH + 0.32));
function flap(s) {
  const apex = new THREE.Vector3(0, RH - 0.02, 0.05);
  const tie = onPole(s, TIE_Y).add(new THREE.Vector3(0, 0, 0.06));
  const c1 = new THREE.Vector3(s * 0.18, RH - 0.55, 0.08), c2 = new THREE.Vector3(s * 0.45, TIE_Y + 0.35, 0.1);
  const free = new THREE.CubicBezierCurve3(apex, c1, c2, tie);
  return new ParametricGeometry((w, t, out) => {
    // t: apex (0) -> eave corner (1) along the roof edge; w: roof edge (0) -> free edge (1)
    const edge = new THREE.Vector3(s * t * (HW + 0.05), RH - t * (RH - EH), 0.05);
    const f = free.getPoint(t);
    const p = edge.lerp(f, w);
    // gathered folds, deeper toward the tie
    const gather = Math.pow(t, 1.4) * w;
    p.z += 0.06 * gather * Math.sin(w * Math.PI * 6 + t * 3) + 0.05 * gather;
    out.copy(p);
  }, 40, 40);
}
function lowerFlap(s) {
  const tie = onPole(s, TIE_Y).add(new THREE.Vector3(0, 0, 0.06));
  return new ParametricGeometry((w, t, out) => {
    // t: tie (0) -> ground (1); w: outer (0) -> inner (1)
    const outerTop = new THREE.Vector3(s * (HW + 0.05), EH, 0.05);
    const o = outerTop.clone().lerp(new THREE.Vector3(s * (HW + 0.12), 0, 0.05), t);
    const innerX = tie.x + s * 0.05 + s * 0.22 * t;
    const inner = new THREE.Vector3(innerX, tie.y * (1 - t), 0.1 + 0.06 * t);
    const p = o.lerp(inner, w);
    p.z += 0.05 * Math.sin(w * Math.PI * 7) * (0.3 + t) * w;
    out.copy(p);
  }, 30, 30);
}
for (const s of [-1, 1]) {
  addMesh(flap(s), clothMaterial([1, 1]));
  addMesh(lowerFlap(s), clothMaterial([1, 1]));
}

/* Poles: crossed at each end, their tips standing above the ridge; a ridge
   pole resting in the crossing. */
function pole(a, b, r = 0.035) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r * 0.85, r, d.length(), 10);
  const m = new THREE.Mesh(g, wood);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; m.receiveShadow = true; tent.add(m); return m;
}
for (const s of [-1, 1]) {
  pole(poleFoot(s), poleTop(s));
  pole(new THREE.Vector3(s * 1.18, 0, -L - 0.16), new THREE.Vector3(-s * 0.26, RH + 0.32, -L - 0.02));
}
pole(new THREE.Vector3(0, RH + 0.02, 0.25), new THREE.Vector3(0, RH - 0.02, -L - 0.25), 0.03);
{
  const pts = []; for (let i = 0; i <= 40; i++) { const v = i / 40; pts.push(new THREE.Vector3(0, ridgeY(v) + 0.018, 0.04 - v * (L + 0.08))); }
  const seam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.018, 6), new THREE.MeshStandardMaterial({ color: 0x8e8778, roughness: 0.9 }));
  seam.castShadow = true; tent.add(seam);
}
// the tie: a few turns of rope around the gathered cloth
for (const s of [-1, 1]) {
  const c = onPole(s, TIE_Y);
  for (let k = 0; k < 3; k++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 6, 20), rope);
    t.position.copy(c).add(new THREE.Vector3(0, -0.03 + k * 0.03, 0.05)); t.rotation.x = Math.PI / 2; tent.add(t);
  }
}

/* Guy ropes and stakes: from the pole tips and the eave corners out to the ground. */
function guy(a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, d.length(), 5), rope);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; tent.add(m);
  const st = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.035), wood);
  st.position.copy(b).setY(0.07); st.rotation.z = Math.sign(b.x || 1) * 0.25; st.castShadow = true; tent.add(st);
}
guy(new THREE.Vector3(0, RH + 0.3, 0.02), new THREE.Vector3(0, 0, 2.3));
guy(new THREE.Vector3(0, RH + 0.3, -L - 0.02), new THREE.Vector3(0, 0, -L - 2.3));
for (const zc of [0, -L / 3, -2 * L / 3, -L]) {
  for (const s of [-1, 1]) guy(new THREE.Vector3(s * (HW + 0.05), EH, zc), new THREE.Vector3(s * (HW + 1.35), 0, zc + (zc === 0 ? 0.5 : zc === -L ? -0.5 : 0)));
}

/* ------------------------------------------------------------ inside */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: earthMap, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshStandardMaterial({ map: rugMap, roughness: 1 }));
rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.004, -1.5); rug.receiveShadow = true; scene.add(rug);

function box(w, h, d, mat, pos, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.copy(pos); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
const yaw = Math.atan2(-FACE.z, FACE.x);   // rotation that points local +x along FACE
// stool
const stoolC = local(-0.02, 0);
box(0.42, 0.04, 0.34, wood, stoolC.clone().setY(0.43), yaw);
for (const [a, r] of [[-0.17, -0.13], [0.17, -0.13], [-0.17, 0.13], [0.17, 0.13]]) box(0.035, 0.41, 0.035, wood, local(-0.02 + a, 0.205, r), yaw);
// table
const TABLE_Y = 0.64;
box(0.52, 0.05, 0.76, wood, local(0.78, TABLE_Y - 0.025), yaw);
for (const [a, r] of [[0.56, -0.32], [1.0, -0.32], [0.56, 0.32], [1.0, 0.32]]) box(0.055, TABLE_Y - 0.05, 0.055, wood, local(a, (TABLE_Y - 0.05) / 2, r), yaw);
// a cup, a bolt of cloth and a tool roll on the table: the old trade beside the new
box(0.06, 0.08, 0.06, new THREE.MeshStandardMaterial({ color: 0x3d3833, roughness: 0.6 }), local(0.72, TABLE_Y + 0.04, -0.26), yaw);

// laptop
const alu = new THREE.MeshStandardMaterial({ color: 0x3a3e44, metalness: 0.6, roughness: 0.35 });
box(0.21, 0.014, 0.31, alu, local(0.70, TABLE_Y + 0.007), yaw);
const lidAngle = THREE.MathUtils.degToRad(+(P.get("lid") || 121));
const hinge = local(0.805, TABLE_Y + 0.014);
const lid = new THREE.Group(); lid.position.copy(hinge); lid.rotation.y = yaw; scene.add(lid);
// the lid leans back, away from the person, so the screen looks up at their face
const lidInner = new THREE.Group(); lidInner.rotation.z = -(lidAngle - Math.PI / 2); lid.add(lidInner);
const lidBody = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.21, 0.31), alu);
lidBody.position.set(0.004, 0.105, 0); lidBody.castShadow = true; lidInner.add(lidBody);
// the screen: soft, not blown out
const screenTex = canvasTexture(512, (g, n) => {
  const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, "#c9dcf0"); gr.addColorStop(1, "#9fb8d4");
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  g.fillStyle = "rgba(30,50,80,0.45)";
  for (let i = 0; i < 12; i++) g.fillRect(50 + (i % 3) * 20, 60 + i * 32, 140 + ((i * 53) % 200), 9);
});
screenTex.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.19), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: true }));
screen.material.color.setScalar(+(P.get("scr") || 1.4));
screen.position.set(-0.0005, 0.105, 0); screen.rotation.y = -Math.PI / 2; lidInner.add(screen);

// the screen's light: an area light for the soft wash, a point light for shadows
const screenWorld = new THREE.Vector3(); screen.getWorldPosition(screenWorld);
const area = new THREE.RectAreaLight(0xbcd6f5, +(P.get("area") || 14), 0.29, 0.19);
area.position.copy(screenWorld); area.lookAt(local(0.24, 1.22)); scene.add(area);
const pl = new THREE.PointLight(0xbcd6f5, +(P.get("pl") || 1.6), 6, 1.6);
pl.position.copy(screenWorld).addScaledVector(FACE, -0.06); pl.castShadow = true;
pl.shadow.mapSize.set(2048, 2048); pl.shadow.bias = -0.002; pl.shadow.radius = 6; scene.add(pl);

/* Shadow proxy for the person drawn in 2D over the render: casts shadows,
   never seen. */
const J = {
  hip: local(0.0, 0.52), knee: local(0.44, 0.52), ankle: local(0.42, 0.08),
  chest: local(0.08, 0.86), shoulder: local(0.12, 1.02, 0.14), neck: local(0.16, 1.08),
  head: local(0.24, 1.22), elbow: local(0.30, 0.76, 0.18), wrist: local(0.58, 0.73, 0.12),
  hand: local(0.66, 0.725, 0.09),
};
const proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function capsule(a, b, r) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 4, 8), proxyMat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; scene.add(m);
}
capsule(J.hip, J.neck, 0.17); capsule(J.hip, J.knee, 0.08); capsule(J.knee, J.ankle, 0.06);
capsule(J.shoulder, J.elbow, 0.05); capsule(J.elbow, J.wrist, 0.04);
const headProxy = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), proxyMat);
headProxy.position.copy(J.head); headProxy.castShadow = true; scene.add(headProxy);

/* ------------------------------------------------------------ night light */
// moonlight from behind and to the right: a silver rim along the ridge and edges
const moon = new THREE.DirectionalLight(0xa9bdd8, +(P.get("moon") || 1.1));
moon.position.set(5, 7, -7); moon.target.position.set(0, 1, -1.5);
moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
scene.add(moon, moon.target);
// a faint cool fill from our side so the near canvas shows its weave
const fill = new THREE.DirectionalLight(0x7f93b0, +(P.get("fill") || 0.22));
fill.position.set(-6, 3, 6); scene.add(fill);
scene.add(new THREE.HemisphereLight(0x223044, 0x050506, +(P.get("hemi") || 0.25)));

/* ------------------------------------------------------------ camera */
const camera = new THREE.PerspectiveCamera(+(P.get("fov") || 30), W / H, 0.1, 100);
camera.position.set(+(P.get("cx") || -3.3), +(P.get("cy") || 1.35), +(P.get("cz") || 4.5));
camera.lookAt(+(P.get("tx") || 0.15), +(P.get("ty") || 1.0), +(P.get("tz") || -1.1));

/* ------------------------------------------------------------ render */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), +(P.get("bloom") || 0.35), 0.5, 0.82));
composer.addPass(new OutputPass());
composer.render();

// joints and anchors in pixels, for drawing the figure over the render
const px = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
const anchors = {};
for (const [k, v] of Object.entries(J)) anchors[k] = px(v);
anchors.screen = px(screenWorld); anchors.hinge = px(hinge);
anchors.deckFront = px(local(0.595, TABLE_Y + 0.014)); anchors.deckBack = px(local(0.805, TABLE_Y + 0.014));
anchors.lidTop = px(new THREE.Vector3(0, 0.21, 0).applyMatrix4(lidInner.matrixWorld));
anchors.stoolTop = px(local(-0.02, 0.45)); anchors.stoolFront = px(local(0.19, 0.45)); anchors.stoolBack = px(local(-0.23, 0.45));
anchors.tableFront = px(local(0.53, TABLE_Y)); anchors.floorKnee = px(local(0.44, 0));
anchors.toe = px(local(0.58, 0.02)); anchors.heel = px(local(0.36, 0.02));
window.__anchors = anchors;
window.__done = true;
