// Pure builder: params -> THREE.Group (real, flat-shaded low-poly rocks).
// Every stone is a low-detail icosahedron whose vertices are pushed in/out by a
// POSITION-hash noise (not index/seed jitter) so shared corners move together and
// the mesh stays watertight — no cracks. Forms stack/scatter those stones into
// boulders, clusters, cairns, cliffs and pebble fields. Deterministic from seed.

import * as THREE from "three";
import { TessellateModifier } from "three/addons/TessellateModifier.js";
import { shapeFinish } from "@engine/finish.js";
import { makeRng } from "@engine/rng.js";
import { addRockDetails, sculptStone } from "./details.js";
import { detailed } from "@engine/options.js";
import { part } from "@engine/geometry.js";

// value-ish noise on a unit direction — identical for identical positions, so the
// duplicated corner vertices of a flat-shaded polyhedron displace in lockstep.
function dirNoise(x, y, z, s) {
  const a = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s) * 43758.5453;
  const b =
    Math.sin(x * 39.346 + y * 11.135 + z * 83.155 + s * 1.7) * 24634.6345;
  return (a - Math.floor(a) + (b - Math.floor(b))) * 0.5; // 0..1
}

// Build one grounded stone: a displaced icosahedron, squashed + elongated, with
// its lowest point resting on y=0 (the caller can then sink/move it).
function makeStone(
  mat,
  { radius, detail, jagged, squashY, elong, seedf, params },
) {
  const basalt = detailed(params) && params.surface === "basalt";
  let geo = basalt
    ? new THREE.CylinderGeometry(radius * 0.78, radius, radius * 2, 6, 3)
    : new THREE.IcosahedronGeometry(radius, detail);
  const p = geo.attributes.position;
  const t = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    t.fromBufferAttribute(p, i);
    const len = t.length() || 1;
    const n = dirNoise(t.x / len, t.y / len, t.z / len, seedf);
    t.multiplyScalar(1 + jagged * (n - 0.5) * 2);
    p.setXYZ(i, t.x, t.y, t.z);
  }
  geo.scale(elong, squashY, 1 / Math.sqrt(elong)); // ellipsoid footprint
  sculptStone(geo, params);
  geo.computeVertexNormals();
  if (shapeFinish() !== "angular") {
    // Add facets on the existing stone, preserving its seeded vertices and
    // footprint. Sampling new noisy sphere vertices would create another rock.
    const refined = new TessellateModifier(radius * 0.3, 1).modify(geo);
    geo.dispose();
    geo = refined;
  }
  geo.computeBoundingBox();
  const m = new THREE.Mesh(geo, mat);
  m.position.y = -geo.boundingBox.min.y; // rest its lowest point on y=0
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const spinY = (mesh, r) => {
  mesh.rotation.y = r() * Math.PI * 2;
  return mesh;
};

function buildSingle(g, p, mat, r) {
  g.add(
    spinY(
      makeStone(mat, {
        radius: p.size,
        detail: p.detail,
        jagged: p.jagged,
        squashY: p.squashY,
        elong: p.elong,
        seedf: p.seed % 1000,
        params: p,
      }),
      r,
    ),
  );
}

// a few boulders piled together, biggest in the middle
function buildCluster(g, p, mat, r) {
  const n = Math.max(2, Math.round(p.count));
  for (let i = 0; i < n; i++) {
    const k = i === 0 ? 1 : 0.45 + 0.5 * r();
    const s = makeStone(mat, {
      radius: p.size * k,
      detail: p.detail,
      jagged: p.jagged,
      squashY: p.squashY * (0.85 + 0.3 * r()),
      elong: p.elong * (0.85 + 0.3 * r()),
      seedf: (p.seed + i * 131) % 1000,
      params: p,
    });
    const a = (i / n) * Math.PI * 2 + r() * 1.4,
      rr = i === 0 ? 0 : p.size * (0.7 + 0.6 * r());
    s.position.x = Math.cos(a) * rr;
    s.position.z = Math.sin(a) * rr;
    s.position.y -= p.size * 0.18 * r(); // settle into the pile
    g.add(spinY(s, r));
  }
}

// a balanced cairn — flattish stones stacked smallest-on-top
function buildStack(g, p, mat, r) {
  const n = Math.max(3, Math.round(p.count));
  let y = 0;
  for (let i = 0; i < n; i++) {
    const k = 1 - i / (n + 1);
    const s = makeStone(mat, {
      radius: p.size * (0.5 + 0.6 * k),
      detail: p.detail,
      jagged: p.jagged * 0.7,
      squashY: 0.42 + 0.12 * r(),
      elong: p.elong * (1.0 + 0.25 * r()),
      seedf: (p.seed + i * 257) % 1000,
      params: p,
    });
    const h = s.geometry.boundingBox.max.y - s.geometry.boundingBox.min.y;
    s.position.y = y - s.geometry.boundingBox.min.y;
    s.position.x = (r() - 0.5) * p.size * 0.18;
    s.position.z = (r() - 0.5) * p.size * 0.18;
    g.add(spinY(s, r));
    y += h * 0.74;
  }
}

// a tall eroded outcrop: a big elongated mass + a little rubble at its foot
function buildCliff(g, p, mat, r) {
  g.add(
    spinY(
      makeStone(mat, {
        radius: p.size,
        detail: p.detail,
        jagged: p.jagged,
        squashY: p.squashY,
        elong: p.elong,
        seedf: p.seed % 1000,
        params: p,
      }),
      r,
    ),
  );
  const rubble = 2 + Math.floor(r() * 3);
  for (let i = 0; i < rubble; i++) {
    const s = makeStone(mat, {
      radius: p.size * (0.22 + 0.22 * r()),
      detail: p.detail,
      jagged: p.jagged,
      squashY: 0.7 + 0.3 * r(),
      elong: 1 + 0.4 * r(),
      seedf: (p.seed + i * 71 + 9) % 1000,
      params: p,
    });
    const a = r() * Math.PI * 2,
      rr = p.size * (0.7 + 0.5 * r());
    s.position.x = Math.cos(a) * rr;
    s.position.z = Math.sin(a) * rr;
    g.add(spinY(s, r));
  }
}

// a scatter of small flat stones on the ground
function buildPebbles(g, p, mat, r) {
  const n = Math.max(6, Math.round(p.count));
  for (let i = 0; i < n; i++) {
    const s = makeStone(mat, {
      radius: p.size * (0.5 + 0.8 * r()),
      detail: 1,
      jagged: p.jagged,
      squashY: 0.32 + 0.16 * r(),
      elong: 1 + 0.6 * r(),
      seedf: (p.seed + i * 53) % 1000,
      params: p,
    });
    const a = r() * Math.PI * 2,
      rr = p.size * (0.3 + 3.4 * Math.sqrt(r()));
    s.position.x = Math.cos(a) * rr;
    s.position.z = Math.sin(a) * rr;
    s.rotation.z = (r() - 0.5) * 0.3;
    g.add(spinY(s, r));
  }
}

const FORMS = {
  single: buildSingle,
  cluster: buildCluster,
  stack: buildStack,
  cliff: buildCliff,
  pebbles: buildPebbles,
};

export function buildRock(p, mats) {
  const g = new THREE.Group();
  g.name = "rock";
  const r = makeRng((p.seed ^ 0x5eed7a11) >>> 0);
  (FORMS[p.form] || buildSingle)(g, p, mats.rock, r);
  if (detailed(p)) {
    if (p.form === "cliff") {
      const rubble = part(g, "Rubble");
      for (const stone of [...g.children].slice(1))
        if (stone !== rubble) {
          if (p.rubbleOn) rubble.add(stone);
          else {
            g.remove(stone);
            stone.geometry.dispose();
          }
        }
    } else if (p.rubbleOn && p.form !== "pebbles") {
      const rubble = part(g, "Rubble"),
        rr = makeRng(p.seed ^ 0x58b016c3);
      for (let i = 0; i < 5; i++) {
        const a = rr() * Math.PI * 2,
          s = makeStone(mats.rock, {
            radius: p.size * (0.1 + rr() * 0.1),
            detail: 1,
            jagged: p.jagged,
            squashY: 0.55,
            elong: 1.2,
            seedf: p.seed + i,
            params: { ...p, surface: "natural" },
          });
        s.position.x = Math.cos(a) * p.size * (1.1 + rr() * 0.45);
        s.position.z = Math.sin(a) * p.size * (1.1 + rr() * 0.45);
        rubble.add(s);
      }
    }
    addRockDetails(g, p, mats);
  }

  // sink the whole thing slightly so nothing looks like it floats
  let box = new THREE.Box3().setFromObject(g);
  g.position.y = -box.min.y - (box.max.y - box.min.y) * 0.06;

  box = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3(),
    center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  g.userData.size = size;
  g.userData.center = center;
  return g;
}
