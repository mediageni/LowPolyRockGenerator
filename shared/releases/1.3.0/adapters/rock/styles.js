// Selectable visual styles: a rig (ground + lights with shadows), a sky, and a
// material set (the rock) for the low-poly stones.

import * as THREE from "three";

import {
  col,
  std,
  groundPlane,
  gradientSky,
  sunRig,
} from "@engine/materials.js";

const rig = (options) =>
  sunRig({
    ...options,
    size: 300,
    extent: 16,
    far: 80,
    hemiIntensity: 0.75,
    roughness: 1,
  });

const mats = (p) => ({
  rock: std({ color: col(p.color.rock), roughness: 0.95, metalness: 0.0 }),
});

// --- Meadow: sunny day, green grass ------------------------------------------
const meadow = {
  label: "Meadow",
  background: gradientSky([
    [0, "#7cb8e8"],
    [0.55, "#aed4ef"],
    [1, "#dcecf6"],
  ]),
  exposure: 1.0,
  rig() {
    return rig({
      ground: 0x86a25a,
      hemi: [0xffffff, 0x6f8a4a],
      sun: [-22, 38, 26],
      sunColor: 0xfff4e0,
      sunInt: 1.7,
    });
  },
  materials(p) {
    return mats(p);
  },
};

// --- Desert: warm sand, red-rock country -------------------------------------
const desert = {
  label: "Desert",
  background: gradientSky([
    [0, "#e9b15a"],
    [0.4, "#f0cf8c"],
    [1, "#f6e6c4"],
  ]),
  exposure: 1.05,
  rig() {
    return rig({
      ground: 0xcaa066,
      hemi: [0xfff0d0, 0xb58a4a],
      sun: [-24, 34, 22],
      sunColor: 0xffe6b0,
      sunInt: 1.85,
    });
  },
  materials(p) {
    return mats(p);
  },
};

// --- Snow: cold overcast, white ground ---------------------------------------
const snow = {
  label: "Snow",
  background: gradientSky([
    [0, "#b9cfe2"],
    [0.55, "#d6e4ef"],
    [1, "#eef4fa"],
  ]),
  exposure: 1.05,
  rig() {
    return rig({
      ground: 0xe9f0f6,
      hemi: [0xffffff, 0xc4d2de],
      sun: [-20, 36, 24],
      sunColor: 0xeaf2ff,
      sunInt: 1.6,
    });
  },
  materials(p) {
    return mats(p);
  },
};

// --- Studio: clean neutral showroom ------------------------------------------
const studio = {
  label: "Studio",
  background: new THREE.Color("#e9edf2"),
  exposure: 1.0,
  rig() {
    return rig({
      ground: 0xeef2f6,
      hemi: [0xffffff, 0xc4ccd4],
      sun: [-18, 40, 28],
      sunColor: 0xffffff,
      sunInt: 1.8,
      grid: [0xc0c8d0, 0xd8dee6],
    });
  },
  materials(p) {
    return mats(p);
  },
};

export const STYLES = { meadow, desert, snow, studio };
export const STYLE_KEYS = Object.keys(STYLES);
