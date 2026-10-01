import * as THREE from "three";
import { makeRng } from "@engine/rng.js";
import { part, mesh, cylinder, mergePart } from "@engine/geometry.js";
import {
  detailOption,
  detailRule,
  booleanRule,
  detailed,
  choices,
  toggle,
} from "@engine/options.js";
export function enrichRock(params, legacy = false) {
  return {
    ...params,
    detailVersion: legacy ? 0 : 1,
    surface:
      params.archetype === "cliff"
        ? "strata"
        : params.archetype === "spire"
          ? "basalt"
          : "natural",
    mossOn: ["boulder", "cluster"].includes(params.archetype),
    quartzOn: false,
    rubbleOn: true,
    groundOn: false,
  };
}
export const ROCK_SCHEMA = {
  detailVersion: detailRule,
  detail: { type: "number", min: 1, max: 2, integer: true },
  surface: { type: "enum", values: ["natural", "strata", "basalt"] },
  ...Object.fromEntries(
    ["mossOn", "quartzOn", "rubbleOn", "groundOn"].map((key) => [
      key,
      booleanRule,
    ]),
  ),
};
export const ROCK_OPTIONS = [
  detailOption,
  choices(
    "surface",
    "Stone surface",
    [
      ["natural", "Natural facets"],
      ["strata", "Layered strata"],
      ["basalt", "Basalt columns"],
    ],
    detailed,
  ),
  toggle("mossOn", "Moss patches"),
  toggle("quartzOn", "Quartz crystals"),
  toggle(
    "rubbleOn",
    "Loose rubble",
    (p) => detailed(p) && p.form !== "pebbles",
  ),
  toggle("groundOn", "Ground patch"),
];
export function sculptStone(geometry, params) {
  if (!detailed(params) || params.surface !== "strata") return;
  const positions = geometry.getAttribute("position");
  const step = Math.max(0.08, params.size * 0.22);
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i),
      layer = y / step,
      f = Math.floor(layer),
      t = layer - f;
    positions.setY(i, (f + t * t * (3 - 2 * t)) * step);
  }
}
export function addRockDetails(root, p, mats) {
  if (!detailed(p)) return;
  const r = makeRng(p.seed ^ 0xd190cb4a),
    surfaces = [];
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!node.isMesh) return;
    const geo = node.geometry.index
      ? node.geometry.toNonIndexed()
      : node.geometry;
    const positions = geo.getAttribute("position");
    for (let i = 0; i < positions.count; i += 3) {
      const points = [0, 1, 2].map((j) =>
        new THREE.Vector3()
          .fromBufferAttribute(positions, i + j)
          .applyMatrix4(node.matrixWorld),
      );
      const normal = points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]))
        .normalize();
      if (normal.y > 0.32)
        surfaces.push({
          points,
          normal,
          center: points[0]
            .clone()
            .add(points[1])
            .add(points[2])
            .multiplyScalar(1 / 3),
        });
    }
    if (geo !== node.geometry) geo.dispose();
  });
  if (p.mossOn) paintMoss(root, p, mats);
  if (p.quartzOn && surfaces.length) {
    const group = part(root, "Quartz");
    for (let i = 0; i < Math.min(12, surfaces.length); i++) {
      const { center, normal } = surfaces[Math.floor(r() * surfaces.length)],
        h = p.size * (0.12 + r() * 0.2),
        radius = h * 0.2;
      const crystal = part(group, "Crystal");
      crystal.position.copy(center).addScaledVector(normal, -radius * 0.2);
      crystal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      cylinder(
        crystal,
        mats.quartz,
        radius,
        h * 0.7,
        [0, h * 0.35, 0],
        6,
        radius * 0.85,
      );
      cylinder(
        crystal,
        mats.quartz,
        radius * 0.85,
        h * 0.35,
        [0, h * 0.875, 0],
        6,
        0,
      );
      mergePart(crystal);
    }
  }
  if (p.groundOn) {
    const group = part(root, "Ground"),
      bounds = new THREE.Box3().setFromObject(root),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    const disc = cylinder(
      group,
      mats.ground,
      Math.max(size.x, size.z) * 0.57,
      0.08,
      [center.x, bounds.min.y + 0.025, center.z],
      12,
    );
    disc.receiveShadow = true;
  }
}

// Paint a continuous, subdued moss field into the stone itself. Subdivision is
// planar: it does not change the rock silhouette or add raised green polygons.
function paintMoss(root, p, mats) {
  const stones = [];
  root.traverse((node) => {
    if (node.isMesh) stones.push(node);
  });
  const tint = mats.rock.color.clone().lerp(mats.moss.color, 0.56);
  const material = mats.rock.clone();
  material.name = "moss-stone";
  material.color.set(0xffffff);
  material.vertexColors = true;
  const phase = (p.seed % 8191) * 0.37,
    scale = 2.8 / Math.max(0.1, p.size);
  const field = (point) => {
    const x = point.x * scale,
      y = point.y * scale,
      z = point.z * scale;
    return (
      (Math.sin(x * 1.1 + z * 0.9 + phase) +
        Math.cos(z * 1.6 - y * 0.7 + phase * 0.71) +
        0.35 * Math.sin(x * 4.2 + z * 3.7)) /
      2.35
    );
  };
  for (const stone of stones) {
    const source = stone.geometry.index
      ? stone.geometry.toNonIndexed()
      : stone.geometry;
    const attr = source.getAttribute("position"),
      positions = [],
      colors = [];
    const n = new THREE.Vector3(),
      world = new THREE.Vector3();
    function triangle(a, b, c, depth) {
      if (depth) {
        const ab = a.clone().lerp(b, 0.5),
          bc = b.clone().lerp(c, 0.5),
          ca = c.clone().lerp(a, 0.5);
        for (const points of [
          [a, ab, ca],
          [ab, b, bc],
          [ca, bc, c],
          [ab, bc, ca],
        ])
          triangle(...points, depth - 1);
        return;
      }
      n.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
      n.transformDirection(stone.matrixWorld);
      const exposure = THREE.MathUtils.smoothstep(n.y, 0.15, 0.75);
      for (const point of [a, b, c]) {
        positions.push(...point.toArray());
        world.copy(point).applyMatrix4(stone.matrixWorld);
        const amount =
          exposure * THREE.MathUtils.smoothstep(field(world), 0.04, 0.58);
        colors.push(...mats.rock.color.clone().lerp(tint, amount).toArray());
      }
    }
    for (let i = 0; i < attr.count; i += 3)
      triangle(
        ...[0, 1, 2].map((j) =>
          new THREE.Vector3().fromBufferAttribute(attr, i + j),
        ),
        2,
      );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    if (source !== stone.geometry) source.dispose();
    stone.geometry.dispose();
    stone.geometry = geometry;
    stone.material = material;
  }
}
