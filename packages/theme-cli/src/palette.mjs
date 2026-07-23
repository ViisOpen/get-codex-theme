import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_INPUT_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_INPUT_PIXELS = 64 * 1024 * 1024;
const ANALYSIS_EDGE = 160;
const MAX_ANALYSIS_SAMPLES = 25_600;
const MIN_VISIBLE_ALPHA = 16;
const CLUSTER_COUNT = 6;
const KMEANS_ITERATIONS = 8;

const HEX_RE = /^#[0-9A-F]{6}$/;
const CSS_COLOR_RE = /^(#[0-9A-F]{6}|rgba?\([^\r\n]+\))$/i;
const REQUIRED_PALETTE_KEYS = [
  "accent", "background", "foreground", "muted", "surface", "surfaceElevated",
  "border", "codeBackground", "codeForeground", "inputBackground",
  "buttonBackground", "buttonForeground",
];

/**
 * Read and analyze a local image without uploading it or writing derived files.
 */
export async function extractThemeCandidatesFromFile(filePath, options = {}) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new TypeError("filePath must be a non-empty string");
  }
  const absolutePath = path.resolve(filePath);
  const file = await stat(absolutePath);
  if (!file.isFile()) throw new Error(`Image is not a regular file: ${absolutePath}`);
  const maxInputBytes = validateLimit(options.maxInputBytes, DEFAULT_MAX_INPUT_BYTES, "maxInputBytes");
  if (file.size > maxInputBytes) {
    throw new Error(`Image exceeds the ${maxInputBytes}-byte input limit`);
  }
  const bytes = await readFile(absolutePath);
  return extractThemeCandidates(bytes, options);
}

/**
 * Decode PNG, JPEG, or WebP bytes locally and generate light/dark candidates.
 */
export async function extractThemeCandidates(input, options = {}) {
  const bytes = toUint8Array(input);
  const maxInputBytes = validateLimit(options.maxInputBytes, DEFAULT_MAX_INPUT_BYTES, "maxInputBytes");
  const maxInputPixels = validateLimit(options.maxInputPixels, DEFAULT_MAX_INPUT_PIXELS, "maxInputPixels");
  if (bytes.byteLength === 0) throw new Error("Image input is empty");
  if (bytes.byteLength > maxInputBytes) throw new Error(`Image exceeds the ${maxInputBytes}-byte input limit`);

  const format = detectImageFormat(bytes);
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch (error) {
    throw new Error("PNG/JPEG/WebP decoding requires the package's sharp dependency", { cause: error });
  }

  const decoder = sharp(bytes, {
    animated: false,
    failOn: "error",
    limitInputPixels: maxInputPixels,
    sequentialRead: true,
  });
  const metadata = await decoder.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Image dimensions could not be read");
  if (metadata.width * metadata.height > maxInputPixels) {
    throw new Error(`Image exceeds the ${maxInputPixels}-pixel input limit`);
  }

  const { data, info } = await decoder
    .rotate()
    .resize({
      width: ANALYSIS_EDGE,
      height: ANALYSIS_EDGE,
      fit: "inside",
      withoutEnlargement: true,
      kernel: "nearest",
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const analysis = analyzePixels({ data, width: info.width, height: info.height, channels: info.channels });
  const source = {
    format,
    width: metadata.autoOrient?.width ?? metadata.width,
    height: metadata.autoOrient?.height ?? metadata.height,
    analyzedWidth: info.width,
    analyzedHeight: info.height,
    localOnly: true,
  };
  return buildResult(source, analysis, options);
}

/**
 * Analyze an RGB/RGBA pixel buffer. This API is deterministic and has no I/O.
 */
export function analyzePixels({ data, width, height, channels = 4 }, options = {}) {
  validatePixels(data, width, height, channels);
  const maxSamples = validateLimit(options.maxSamples, MAX_ANALYSIS_SAMPLES, "maxSamples");
  const sampled = samplePixels(data, width, height, channels, maxSamples);
  const visible = sampled.pixels.filter((pixel) => pixel.a >= MIN_VISIBLE_ALPHA);
  if (visible.length < Math.max(4, Math.ceil(sampled.pixels.length * 0.005))) {
    throw new Error("Image has too few visible pixels to derive a theme");
  }

  const clusters = clusterPixels(visible);
  const dominant = clusters[0];
  const secondary = chooseSecondary(clusters, dominant);
  const accent = chooseAccent(clusters, dominant, secondary);
  const luminance = weightedAverage(visible, (pixel) => pixel.luminance);
  const brightness = luminance < 0.22 ? "dark" : luminance > 0.64 ? "light" : "mixed";
  const saliency = analyzeSaliency(sampled, visible, dominant);

  return deepFreeze({
    schemaVersion: 1,
    dimensions: { width, height, sampledWidth: sampled.width, sampledHeight: sampled.height },
    visiblePixelRatio: round(visible.reduce((sum, pixel) => sum + pixel.a / 255, 0) / sampled.pixels.length, 4),
    averageLuminance: round(luminance, 5),
    brightness,
    extractedColors: {
      dominant: colorSummary(dominant),
      secondary: colorSummary(secondary),
      accent: colorSummary(accent),
    },
    extractedContrast: {
      dominantToSecondary: round(contrastRatio(dominant.rgb, secondary.rgb), 2),
      dominantToAccent: round(contrastRatio(dominant.rgb, accent.rgb), 2),
      secondaryToAccent: round(contrastRatio(secondary.rgb, accent.rgb), 2),
    },
    clusters: clusters.map(colorSummary),
    focusPoint: saliency.focusPoint,
    subjectRegion: saliency.subjectRegion,
    safeArea: saliency.safeArea,
    method: "deterministic-oklab-kmeans-and-edge-saliency-v1",
  });
}

/**
 * Turn analysis output into accessible, schema-compatible light/dark candidates.
 */
export function generateThemeCandidates(analysis, options = {}) {
  validateAnalysis(analysis);
  const modes = options.modes ?? ["dark", "light"];
  if (!Array.isArray(modes) || modes.length === 0 || modes.some((mode) => !["dark", "light"].includes(mode))) {
    throw new TypeError("modes must be a non-empty array containing dark and/or light");
  }
  if (new Set(modes).size !== modes.length) throw new TypeError("modes must not contain duplicates");
  return modes.map((mode) => createCandidate(mode, analysis));
}

/**
 * Return the exact manifest/tokens fragment consumed by the theme-pack layer.
 */
export function candidateToThemeTokens(candidate, { id } = {}) {
  validateCandidate(candidate);
  const result = {
    schemaVersion: 2,
    mode: candidate.mode,
    palette: structuredClone(candidate.palette),
    layout: structuredClone(candidate.layout),
    uiTokens: structuredClone(candidate.uiTokens),
    backgroundTreatment: structuredClone(candidate.backgroundTreatment),
  };
  if (id !== undefined) {
    if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new TypeError("id must be lowercase kebab-case");
    }
    result.id = id;
  }
  return result;
}

export function contrastRatio(colorA, colorB) {
  const a = typeof colorA === "string" ? parseHex(colorA) : colorA;
  const b = typeof colorB === "string" ? parseHex(colorB) : colorB;
  const high = Math.max(relativeLuminance(a), relativeLuminance(b));
  const low = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (high + 0.05) / (low + 0.05);
}

export function detectImageFormat(input) {
  const bytes = toUint8Array(input);
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  throw new Error("Unsupported image format; expected PNG, JPEG, or WebP");
}

function buildResult(source, analysis, options) {
  return deepFreeze({
    schemaVersion: 1,
    source,
    analysis,
    candidates: generateThemeCandidates(analysis, options),
  });
}

function samplePixels(data, width, height, channels, maxSamples) {
  const aspect = width / height;
  const targetWidth = Math.min(width, Math.max(1, Math.floor(Math.sqrt(maxSamples * aspect))));
  const targetHeight = Math.min(height, Math.max(1, Math.floor(maxSamples / targetWidth)));
  const pixels = [];
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor(((y + 0.5) * height) / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor(((x + 0.5) * width) / targetWidth));
      const offset = (sourceY * width + sourceX) * channels;
      const rgb = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
      pixels.push({
        ...rgb,
        a: channels === 4 ? data[offset + 3] : 255,
        x,
        y,
        nx: (x + 0.5) / targetWidth,
        ny: (y + 0.5) / targetHeight,
        lab: rgbToOklab(rgb),
        luminance: relativeLuminance(rgb),
      });
    }
  }
  return { pixels, width: targetWidth, height: targetHeight };
}

function clusterPixels(pixels) {
  const histogram = new Map();
  for (const pixel of pixels) {
    const key = `${pixel.r >> 4},${pixel.g >> 4},${pixel.b >> 4}`;
    const weight = pixel.a / 255;
    const entry = histogram.get(key) ?? { r: 0, g: 0, b: 0, weight: 0, key };
    entry.r += pixel.r * weight;
    entry.g += pixel.g * weight;
    entry.b += pixel.b * weight;
    entry.weight += weight;
    histogram.set(key, entry);
  }
  const bins = [...histogram.values()].map((entry) => {
    const rgb = { r: entry.r / entry.weight, g: entry.g / entry.weight, b: entry.b / entry.weight };
    return { ...rgb, lab: rgbToOklab(rgb), weight: entry.weight, key: entry.key };
  }).sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
  const count = Math.min(CLUSTER_COUNT, bins.length);
  const centroids = [copyCentroid(bins[0])];
  while (centroids.length < count) {
    let best = null;
    for (const bin of bins) {
      const distance = Math.min(...centroids.map((centroid) => labDistanceSquared(bin.lab, centroid.lab)));
      const score = distance * Math.sqrt(bin.weight);
      if (!best || score > best.score || (score === best.score && bin.key < best.bin.key)) best = { bin, score };
    }
    centroids.push(copyCentroid(best.bin));
  }

  let assignments = [];
  for (let iteration = 0; iteration < KMEANS_ITERATIONS; iteration += 1) {
    assignments = centroids.map(() => ({ r: 0, g: 0, b: 0, weight: 0 }));
    for (const pixel of pixels) {
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < centroids.length; index += 1) {
        const distance = labDistanceSquared(pixel.lab, centroids[index].lab);
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      }
      const weight = pixel.a / 255;
      assignments[nearest].r += pixel.r * weight;
      assignments[nearest].g += pixel.g * weight;
      assignments[nearest].b += pixel.b * weight;
      assignments[nearest].weight += weight;
    }
    for (let index = 0; index < centroids.length; index += 1) {
      if (assignments[index].weight === 0) continue;
      const rgb = {
        r: assignments[index].r / assignments[index].weight,
        g: assignments[index].g / assignments[index].weight,
        b: assignments[index].b / assignments[index].weight,
      };
      centroids[index] = { ...rgb, lab: rgbToOklab(rgb) };
    }
  }

  const totalWeight = assignments.reduce((sum, assignment) => sum + assignment.weight, 0);
  return centroids.map((centroid, index) => ({
    rgb: clampRgb(centroid),
    lab: centroid.lab,
    weight: assignments[index].weight,
    ratio: assignments[index].weight / totalWeight,
  })).filter((cluster) => cluster.weight > 0)
    .sort((a, b) => b.weight - a.weight || toHex(a.rgb).localeCompare(toHex(b.rgb)));
}

function chooseSecondary(clusters, dominant) {
  if (clusters.length === 1) return dominant;
  return clusters.slice(1).map((cluster) => ({
    cluster,
    score: Math.pow(cluster.ratio, 0.5) * Math.sqrt(labDistanceSquared(cluster.lab, dominant.lab)),
  })).sort((a, b) => b.score - a.score || toHex(a.cluster.rgb).localeCompare(toHex(b.cluster.rgb)))[0].cluster;
}

function chooseAccent(clusters, dominant, secondary) {
  return clusters.map((cluster) => {
    const chroma = Math.hypot(cluster.lab.a, cluster.lab.b);
    const distance = Math.sqrt(labDistanceSquared(cluster.lab, dominant.lab));
    const luminanceGuard = 0.35 + Math.min(cluster.lab.L, 1 - cluster.lab.L) * 1.3;
    return {
      cluster,
      score: (chroma + 0.018) * (0.55 + Math.min(distance * 3, 1)) * Math.pow(cluster.ratio, 0.32) * luminanceGuard,
    };
  }).sort((a, b) => b.score - a.score || toHex(a.cluster.rgb).localeCompare(toHex(b.cluster.rgb)))[0]?.cluster ?? secondary;
}

function analyzeSaliency(sampled, visible, dominant) {
  const grid = Array.from({ length: sampled.height }, () => Array(sampled.width).fill(null));
  for (const pixel of sampled.pixels) grid[pixel.y][pixel.x] = pixel;
  const scores = [];
  let maxScore = 0;
  for (const pixel of visible) {
    const neighbors = [
      grid[pixel.y]?.[pixel.x - 1], grid[pixel.y]?.[pixel.x + 1],
      grid[pixel.y - 1]?.[pixel.x], grid[pixel.y + 1]?.[pixel.x],
    ].filter((neighbor) => neighbor?.a >= MIN_VISIBLE_ALPHA);
    const edge = neighbors.length === 0 ? 0 : neighbors.reduce((sum, neighbor) => sum + Math.sqrt(labDistanceSquared(pixel.lab, neighbor.lab)), 0) / neighbors.length;
    const rarity = Math.sqrt(labDistanceSquared(pixel.lab, dominant.lab));
    const chroma = Math.hypot(pixel.lab.a, pixel.lab.b);
    const score = (edge * 0.58 + rarity * 0.27 + chroma * 0.15) * (pixel.a / 255);
    maxScore = Math.max(maxScore, score);
    scores.push({ ...pixel, score });
  }
  const floor = maxScore * 0.04 + 0.00001;
  const focusWeight = scores.reduce((sum, pixel) => sum + Math.pow(pixel.score + floor, 2), 0);
  const focusX = scores.reduce((sum, pixel) => sum + pixel.nx * Math.pow(pixel.score + floor, 2), 0) / focusWeight;
  const focusY = scores.reduce((sum, pixel) => sum + pixel.ny * Math.pow(pixel.score + floor, 2), 0) / focusWeight;

  const sorted = [...scores].sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  const salient = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.18)));
  const subjectRegion = boundsFor(salient);
  const safeArea = chooseSafeArea(scores);
  return {
    focusPoint: { x: round(focusX * 100, 2), y: round(focusY * 100, 2) },
    subjectRegion,
    safeArea,
  };
}

function chooseSafeArea(scores) {
  const candidates = [
    { contentSide: "center", x: 34, width: 32 },
    { contentSide: "left", x: 2, width: 32 },
    { contentSide: "right", x: 66, width: 32 },
  ].flatMap((candidate) => [8, 28].map((y) => ({ ...candidate, y, height: 64 })));
  const evaluated = candidates.map((candidate, preference) => {
    const inside = scores.filter((pixel) => pointInPercentRect(pixel, candidate));
    const meanSaliency = inside.reduce((sum, pixel) => sum + pixel.score, 0) / Math.max(inside.length, 1);
    const meanLuminance = inside.reduce((sum, pixel) => sum + pixel.luminance, 0) / Math.max(inside.length, 1);
    const variance = inside.reduce((sum, pixel) => sum + Math.pow(pixel.luminance - meanLuminance, 2), 0) / Math.max(inside.length, 1);
    return { candidate, preference, score: meanSaliency + Math.sqrt(variance) * 0.24 };
  }).sort((a, b) => a.score - b.score || a.preference - b.preference)[0];
  return deepFreeze({
    x: evaluated.candidate.x,
    y: evaluated.candidate.y,
    width: evaluated.candidate.width,
    height: evaluated.candidate.height,
    contentSide: evaluated.candidate.contentSide,
    confidence: round(1 / (1 + evaluated.score * 8), 4),
  });
}

function createCandidate(mode, analysis) {
  const extractedDominant = parseHex(analysis.extractedColors.dominant.hex);
  const extractedSecondary = parseHex(analysis.extractedColors.secondary.hex);
  const extractedAccent = parseHex(analysis.extractedColors.accent.hex);
  const dominantHsl = rgbToHsl(extractedDominant);
  const accentHsl = rgbToHsl(extractedAccent);
  const secondaryHsl = rgbToHsl(extractedSecondary);
  const dark = mode === "dark";

  const background = hslToRgb({ h: dominantHsl.h, s: Math.min(dominantHsl.s * 0.38, 0.18), l: dark ? 0.065 : 0.965 });
  const foreground = hslToRgb({ h: dominantHsl.h, s: Math.min(dominantHsl.s * 0.22, 0.12), l: dark ? 0.96 : 0.105 });
  const accent = ensureAccentContrast(extractedAccent, background, dark);
  const secondary = ensureAccentContrast(
    hslToRgb({ h: secondaryHsl.h, s: Math.max(secondaryHsl.s, 0.35), l: dark ? clamp(secondaryHsl.l, 0.55, 0.78) : clamp(secondaryHsl.l, 0.28, 0.5) }),
    background,
    dark,
  );
  const muted = findToneForContrast({ h: dominantHsl.h, s: Math.min(dominantHsl.s * 0.32, 0.18) }, background, dark, 4.5);
  const surfaceBase = hslToRgb({ h: dominantHsl.h, s: Math.min(dominantHsl.s * 0.42, 0.2), l: dark ? 0.095 : 0.985 });
  const elevatedBase = hslToRgb({ h: dominantHsl.h, s: Math.min(dominantHsl.s * 0.48, 0.22), l: dark ? 0.14 : 0.995 });
  const codeBase = hslToRgb({ h: dominantHsl.h, s: Math.min(dominantHsl.s * 0.48, 0.2), l: dark ? 0.045 : 0.925 });
  const buttonForeground = bestBlackOrWhite(accent);
  const borderRgb = dark ? foreground : backgroundForBorder(foreground);
  const borderAlpha = minimumAlphaForContrast(borderRgb, background, 3.1);
  const focus = ensureAccentContrast(
    hslToRgb({ h: accentHsl.h, s: Math.max(accentHsl.s, 0.58), l: dark ? 0.7 : 0.42 }),
    background,
    dark,
  );

  const palette = {
    accent: toHex(accent),
    secondary: toHex(secondary),
    success: dark ? "#55D993" : "#087A47",
    warning: dark ? "#F6C65B" : "#8A5700",
    danger: dark ? "#FF7B84" : "#B42332",
    focusRing: toHex(focus),
    background: toHex(background),
    foreground: toHex(foreground),
    muted: toHex(muted),
    surface: toRgba(surfaceBase, dark ? 0.88 : 0.9),
    surfaceElevated: toRgba(elevatedBase, dark ? 0.95 : 0.96),
    border: toRgba(borderRgb, borderAlpha),
    codeBackground: toRgba(codeBase, 0.94),
    codeForeground: toHex(foreground),
    inputBackground: toRgba(elevatedBase, dark ? 0.92 : 0.94),
    buttonBackground: toHex(accent),
    buttonForeground: toHex(buttonForeground),
  };

  const uiTokens = {
    sidebar: {
      background: palette.surface,
      foreground: palette.foreground,
      muted: palette.muted,
      selectedBackground: withAlpha(accent, dark ? 0.24 : 0.16),
      selectedForeground: palette.foreground,
      border: palette.border,
    },
    card: {
      background: palette.surfaceElevated,
      foreground: palette.foreground,
      muted: palette.muted,
      border: palette.border,
    },
    input: {
      background: palette.inputBackground,
      foreground: palette.foreground,
      placeholder: palette.muted,
      border: palette.border,
      focusRing: palette.focusRing,
    },
    button: {
      background: palette.buttonBackground,
      foreground: palette.buttonForeground,
      hoverBackground: toHex(adjustLightness(accent, dark ? 0.07 : -0.07)),
      focusRing: palette.focusRing,
    },
    text: {
      primary: palette.foreground,
      secondary: palette.muted,
      accent: palette.accent,
    },
    border: {
      subtle: palette.border,
      focus: palette.focusRing,
    },
  };

  const layout = {
    focusX: analysis.focusPoint.x,
    focusY: analysis.focusPoint.y,
    overlayStrength: 0,
    contentSide: analysis.safeArea.contentSide,
  };
  const backgroundTreatment = {
    globalOverlay: "none",
    localSurfacesOnly: true,
    safeArea: structuredClone(analysis.safeArea),
    subjectRegion: structuredClone(analysis.subjectRegion),
  };
  const surfaceOpaque = composite(surfaceBase, background, dark ? 0.88 : 0.9);
  const borderOpaque = composite(borderRgb, background, borderAlpha);

  return deepFreeze({
    id: mode,
    name: `Image ${dark ? "Dark" : "Light"}`,
    mode,
    palette,
    uiTokens,
    layout,
    backgroundTreatment,
    accessibility: {
      foregroundOnBackground: round(contrastRatio(foreground, background), 2),
      mutedOnBackground: round(contrastRatio(muted, background), 2),
      foregroundOnSurface: round(contrastRatio(foreground, surfaceOpaque), 2),
      borderOnBackground: round(contrastRatio(borderOpaque, background), 2),
      buttonText: round(contrastRatio(buttonForeground, accent), 2),
    },
  });
}

function ensureAccentContrast(rgb, background, dark) {
  if (contrastRatio(rgb, background) >= 3) return clampRgb(rgb);
  const hsl = rgbToHsl(rgb);
  const start = dark ? Math.max(hsl.l, 0.52) : Math.min(hsl.l, 0.48);
  for (let index = 0; index <= 48; index += 1) {
    const l = dark ? clamp(start + index * 0.01, 0, 0.9) : clamp(start - index * 0.01, 0.1, 1);
    const candidate = hslToRgb({ h: hsl.h, s: Math.max(hsl.s, 0.42), l });
    if (contrastRatio(candidate, background) >= 3) return candidate;
  }
  return dark ? { r: 180, g: 190, b: 255 } : { r: 45, g: 55, b: 145 };
}

function findToneForContrast({ h, s }, background, dark, target) {
  for (let index = 0; index <= 80; index += 1) {
    const l = dark ? 0.48 + index * 0.006 : 0.48 - index * 0.005;
    const candidate = hslToRgb({ h, s, l: clamp(l, 0.12, 0.88) });
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return dark ? { r: 190, g: 190, b: 196 } : { r: 75, g: 75, b: 82 };
}

function validatePixels(data, width, height, channels) {
  if (!(data instanceof Uint8Array) && !Buffer.isBuffer(data)) throw new TypeError("data must be a Uint8Array or Buffer");
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {
    throw new TypeError("width and height must be positive safe integers");
  }
  if (![3, 4].includes(channels)) throw new TypeError("channels must be 3 (RGB) or 4 (RGBA)");
  const expected = width * height * channels;
  if (!Number.isSafeInteger(expected) || expected > data.length || data.length !== expected) {
    throw new RangeError(`pixel buffer length must equal width * height * channels (${expected})`);
  }
}

function validateAnalysis(analysis) {
  if (!analysis || analysis.schemaVersion !== 1) throw new TypeError("analysis must be a schemaVersion 1 palette analysis");
  for (const key of ["dominant", "secondary", "accent"]) {
    if (!HEX_RE.test(analysis.extractedColors?.[key]?.hex ?? "")) throw new TypeError(`analysis.extractedColors.${key}.hex is invalid`);
  }
  if (!isPercent(analysis.focusPoint?.x) || !isPercent(analysis.focusPoint?.y)) {
    throw new TypeError("analysis focusPoint coordinates must be between 0 and 100");
  }
  if (!analysis.safeArea || !["left", "center", "right"].includes(analysis.safeArea.contentSide)) {
    throw new TypeError("analysis safeArea must include a valid contentSide");
  }
  for (const key of ["x", "y", "width", "height"]) {
    if (!isPercent(analysis.safeArea[key])) throw new TypeError(`analysis safeArea.${key} must be between 0 and 100`);
  }
  if (analysis.safeArea.x + analysis.safeArea.width > 100 || analysis.safeArea.y + analysis.safeArea.height > 100) {
    throw new TypeError("analysis safeArea must stay inside the image");
  }
}

function validateCandidate(candidate) {
  if (!candidate || !["dark", "light"].includes(candidate.mode)) throw new TypeError("candidate mode must be dark or light");
  if (!candidate.palette || !candidate.layout || !candidate.uiTokens || !candidate.backgroundTreatment) {
    throw new TypeError("candidate is missing palette, layout, uiTokens, or backgroundTreatment");
  }
  if (candidate.layout.overlayStrength !== 0 || candidate.backgroundTreatment.globalOverlay !== "none") {
    throw new Error("candidate must not prescribe a global overlay");
  }
  for (const key of REQUIRED_PALETTE_KEYS) {
    if (!CSS_COLOR_RE.test(candidate.palette[key] ?? "")) throw new TypeError(`candidate palette.${key} is invalid`);
  }
  if (!isPercent(candidate.layout.focusX) || !isPercent(candidate.layout.focusY)) {
    throw new TypeError("candidate focus coordinates must be between 0 and 100");
  }
  if (!["left", "center", "right"].includes(candidate.layout.contentSide)) {
    throw new TypeError("candidate contentSide must be left, center, or right");
  }
}

function validateLimit(value, fallback, label) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${label} must be a positive safe integer`);
  return value;
}

function colorSummary(cluster) {
  return deepFreeze({
    hex: toHex(cluster.rgb),
    ratio: round(cluster.ratio, 4),
    luminance: round(relativeLuminance(cluster.rgb), 5),
    chroma: round(Math.hypot(cluster.lab.a, cluster.lab.b), 5),
  });
}

function weightedAverage(pixels, selector) {
  let sum = 0;
  let weight = 0;
  for (const pixel of pixels) {
    const alpha = pixel.a / 255;
    sum += selector(pixel) * alpha;
    weight += alpha;
  }
  return sum / weight;
}

function boundsFor(pixels) {
  const minX = Math.min(...pixels.map((pixel) => pixel.nx));
  const maxX = Math.max(...pixels.map((pixel) => pixel.nx));
  const minY = Math.min(...pixels.map((pixel) => pixel.ny));
  const maxY = Math.max(...pixels.map((pixel) => pixel.ny));
  return deepFreeze({
    x: round(minX * 100, 2),
    y: round(minY * 100, 2),
    width: round((maxX - minX) * 100, 2),
    height: round((maxY - minY) * 100, 2),
  });
}

function pointInPercentRect(pixel, rect) {
  const x = pixel.nx * 100;
  const y = pixel.ny * 100;
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function copyCentroid(bin) {
  return { r: bin.r, g: bin.g, b: bin.b, lab: { ...bin.lab } };
}

function toUint8Array(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError("image input must be a Buffer, Uint8Array, or ArrayBuffer");
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function clampRgb(rgb) {
  return {
    r: clamp(Math.round(rgb.r), 0, 255),
    g: clamp(Math.round(rgb.g), 0, 255),
    b: clamp(Math.round(rgb.b), 0, 255),
  };
}

function toHex(rgb) {
  const { r, g, b } = clampRgb(rgb);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function parseHex(hex) {
  if (!HEX_RE.test(hex)) throw new TypeError(`Invalid six-digit hex color: ${hex}`);
  return { r: Number.parseInt(hex.slice(1, 3), 16), g: Number.parseInt(hex.slice(3, 5), 16), b: Number.parseInt(hex.slice(5, 7), 16) };
}

function toRgba(rgb, alpha) {
  const { r, g, b } = clampRgb(rgb);
  return `rgba(${r}, ${g}, ${b}, ${round(alpha, 2)})`;
}

function withAlpha(rgb, alpha) {
  return toRgba(rgb, alpha);
}

function bestBlackOrWhite(background) {
  const black = { r: 10, g: 11, b: 14 };
  const white = { r: 255, g: 255, b: 255 };
  return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

function backgroundForBorder(foreground) {
  return adjustLightness(foreground, 0.1);
}

function minimumAlphaForContrast(foreground, background, target) {
  let low = 0;
  let high = 1;
  for (let index = 0; index < 16; index += 1) {
    const candidate = (low + high) / 2;
    if (contrastRatio(composite(foreground, background, candidate), background) >= target) high = candidate;
    else low = candidate;
  }
  return clamp(Math.ceil(high * 100) / 100, 0, 1);
}

function adjustLightness(rgb, amount) {
  const hsl = rgbToHsl(rgb);
  return hslToRgb({ ...hsl, l: clamp(hsl.l + amount, 0, 1) });
}

function composite(foreground, background, alpha) {
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  };
}

function relativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToOklab(rgb) {
  const linear = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  const l = 0.4122214708 * linear[0] + 0.5363325363 * linear[1] + 0.0514459929 * linear[2];
  const m = 0.2119034982 * linear[0] + 0.6806995451 * linear[1] + 0.1073969566 * linear[2];
  const s = 0.0883024619 * linear[0] + 0.2817188376 * linear[1] + 0.6299787005 * linear[2];
  const l3 = Math.cbrt(l);
  const m3 = Math.cbrt(m);
  const s3 = Math.cbrt(s);
  return {
    L: 0.2104542553 * l3 + 0.793617785 * m3 - 0.0040720468 * s3,
    a: 1.9779984951 * l3 - 2.428592205 * m3 + 0.4505937099 * s3,
    b: 0.0259040371 * l3 + 0.7827717662 * m3 - 0.808675766 * s3,
  };
}

function labDistanceSquared(a, b) {
  return Math.pow(a.L - b.L, 2) + Math.pow(a.a - b.a, 2) + Math.pow(a.b - b.b, 2);
}

function rgbToHsl(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const hue = ((h % 1) + 1) % 1;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = l - chroma / 2;
  let rgb;
  if (hue < 1 / 6) rgb = [chroma, x, 0];
  else if (hue < 2 / 6) rgb = [x, chroma, 0];
  else if (hue < 3 / 6) rgb = [0, chroma, x];
  else if (hue < 4 / 6) rgb = [0, x, chroma];
  else if (hue < 5 / 6) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return clampRgb({ r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 });
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPercent(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
