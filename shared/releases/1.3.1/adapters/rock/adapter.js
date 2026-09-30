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
import { std } from "@engine/materials.js";
import { enrichRock, ROCK_SCHEMA, ROCK_OPTIONS } from "./details.js";
const samples = Object.keys(ARCHETYPES).flatMap((key) =>
  [0, 1, 42, 12345, 4294967295].map((seed) => paramsFromSeed(seed, key)),
);
export const adapter = {
  id: "rock",
  path: "low-poly-rock-generator",
  label: "Rock & Cliff",
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
  schema: schemaFromSamples(samples, SLIDERS, ROCK_SCHEMA),
  enrich: enrichRock,
  legacyConfig: (params) => params?.detailVersion === undefined,
  options: ROCK_OPTIONS,
  optionsLabel: "Surface & parts",
  firstType: "boulder",
  build: buildRock,
  materials: (style, params) => ({
    ...style.materials(params),
    moss: std({ color: 0x728f4b, roughness: 1 }),
    quartz: std({ color: 0xd4e7e8, roughness: 0.27, metalness: 0.15 }),
    ground: std({ color: 0x8d9773, roughness: 1 }),
  }),
  paletteSlots: {
    rock: "rock",
    moss: "foliage",
    quartz: "glass",
    ground: "ground",
  },
  camera: {
    fov: 42,
    near: 0.1,
    far: 500,
    min: 1,
    max: 80,
    direction: [0.6, 0.35, 1],
  },
};
