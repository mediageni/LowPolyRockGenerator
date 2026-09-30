import { buildRock } from "./builder.js";
import {
  ARCHETYPES,
  SLIDERS,
  paramsFromSeed,
  getDerived,
  setDerived,
} from "./params.js";
import { STYLES } from "./styles.js";
import { schemaFromSamples } from "@engine/state.js";
const samples = Object.keys(ARCHETYPES).flatMap((key) =>
  [0, 1, 42, 12345, 4294967295].map((seed) => paramsFromSeed(seed, key)),
);
export const adapter = {
  id: "rock",
  path: "low-poly-rock-generator",
  label: "Low Poly Rock & Cliff",
  noun: "rock",
  filePrefix: "rock",
  defaultLook: "meadow",
  defaultType: null,
  colorKey: "rock",
  colorLabel: "Hue",
  archetypes: ARCHETYPES,
  sliders: SLIDERS,
  styles: STYLES,
  paramsFromSeed,
  getDerived,
  setDerived,
  schema: schemaFromSamples(samples, SLIDERS),
  build: buildRock,
  materials: (style, params) => style.materials(params),
  paletteSlots: { rock: "rock" },
  camera: {
    fov: 42,
    near: 0.1,
    far: 500,
    min: 1,
    max: 80,
    direction: [0.6, 0.35, 1],
  },
};
