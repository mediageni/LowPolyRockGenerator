// Rock parameters: form presets + seed -> params, URL (de)serialization.
// Pure data, no Three.js. These drive a REAL flat-shaded low-poly rock mesh
// (a displaced icosahedron, scattered/stacked by `form`).

import { makeRng, rng } from './rng.js';

const r2 = (v) => Math.round(v * 1000) / 1000;

// Defaults every form inherits; forms override the distinctive bits.
// [lo,hi] number pair = sampled range. Array = random pick. Scalar = fixed.
const BASE = {
  form: 'single',          // single | cluster | stack | cliff | pebbles
  size: [1.8, 2.6],        // base radius of the (largest) stone
  detail: [1, 1],          // icosahedron subdivision (1 = chunky, 2 = rounder)
  jagged: [0.18, 0.34],    // displacement amplitude (how craggy)
  squashY: [0.6, 0.85],    // vertical squash (>1 = tall)
  elong: [1.0, 1.35],      // horizontal stretch of the footprint
  count: [3, 5],           // stones, for cluster / stack / pebbles
};

export const ARCHETYPES = {
  boulder: { label: 'Boulder', form: 'single', size: [1.8, 2.6], jagged: [0.16, 0.3],
             squashY: [0.62, 0.85], elong: [1.05, 1.4] },
  cluster: { label: 'Cluster', form: 'cluster', size: [1.2, 1.8], jagged: [0.2, 0.36],
             squashY: [0.6, 0.85], count: [3, 6] },
  cliff:   { label: 'Cliff', form: 'cliff', size: [2.2, 3.0], jagged: [0.3, 0.5],
             squashY: [1.5, 2.3], elong: [1.5, 2.1], detail: [1, 2] },
  spire:   { label: 'Spire', form: 'single', size: [1.2, 1.8], jagged: [0.24, 0.42],
             squashY: [1.7, 2.6], elong: [0.85, 1.05] },
  stack:   { label: 'Cairn', form: 'stack', size: [1.3, 1.9], jagged: [0.14, 0.26],
             elong: [1.1, 1.5], count: [3, 5] },
  pebbles: { label: 'Pebbles', form: 'pebbles', size: [0.6, 1.0], jagged: [0.18, 0.34],
             count: [10, 20] },
};
export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

// `forms` limits which forms show the slider; omitted = always shown.
export const SLIDERS = [
  { key: 'size',    label: 'Size',     min: 0.5, max: 3.2, step: 0.05 },
  { key: 'jagged',  label: 'Craggy',   min: 0.05, max: 0.55, step: 0.01 },
  { key: 'squashY', label: 'Height',   min: 0.3, max: 2.8, step: 0.05 },
  { key: 'elong',   label: 'Stretch',  min: 0.7, max: 2.2, step: 0.05 },
  { key: 'detail',  label: 'Smoothness', min: 1, max: 2, step: 1 },
  { key: 'count',   label: 'Stones',   min: 2, max: 22, step: 1, forms: ['cluster', 'stack', 'pebbles'] },
];

function sample(r, spec) {
  if (Array.isArray(spec)) {
    if (spec.length === 2 && typeof spec[0] === 'number' && typeof spec[1] === 'number')
      return r2(rng.range(r, spec[0], spec[1]));
    return rng.pick(r, spec);
  }
  return spec;
}
const PARAM_KEYS = Object.keys(BASE);

export function paramsFromSeed(seed, archetype) {
  const r = makeRng(seed);
  const key = archetype && ARCHETYPES[archetype] ? archetype : rng.pick(r, ARCHETYPE_KEYS);
  const a = { ...BASE, ...ARCHETYPES[key] };
  const p = { seed: seed >>> 0, archetype: key };
  for (const k of PARAM_KEYS) p[k] = sample(r, a[k]);
  p.detail = Math.round(p.detail);
  p.color = {
    rock: { h: r2(rng.range(r, 0.05, 0.12)), s: r2(rng.range(r, 0.05, 0.22)), l: r2(rng.range(r, 0.38, 0.58)) },
  };
  return p;
}

export function setDerived(p, key, value) { p[key] = value; }
export const getDerived = (p, key) => p[key];

export function encodeConfig(p) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/=+$/, ''); }
  catch { return ''; }
}
export function decodeConfig(str) {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(str))));
    return p && typeof p === 'object' && p.color ? p : null;
  } catch { return null; }
}
