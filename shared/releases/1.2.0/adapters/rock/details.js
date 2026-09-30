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
  if (p.mossOn) {
    const group = part(root, "Moss"),
      positions = [];
    for (const { points, normal } of surfaces)
      if (r() < 0.28)
        for (const point of points) {
          const padded = point.clone().addScaledVector(normal, p.size * 0.006);
          positions.push(...padded.toArray());
        }
    if (positions.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geo.computeVertexNormals();
      mesh(group, geo, mats.moss);
    }
  }
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
