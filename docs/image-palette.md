# Image palette engine

Local-only image analysis for Get Codex Theme. The package decodes PNG, JPEG, and WebP images in memory, extracts a deterministic palette, estimates the subject and a low-detail safe area, and returns accessible light and dark theme candidates.

It never uploads an image, makes a network request, writes generated files, starts Codex, or injects a theme. Consumers decide how to preview or persist the returned data.

## API

```js
import {
  extractThemeCandidates,
  extractThemeCandidatesFromFile,
} from "get-codex-theme/palette";

const result = await extractThemeCandidatesFromFile("./background.webp");
const dark = result.candidates.find((candidate) => candidate.mode === "dark");

console.log(result.analysis.extractedColors);
console.log(dark.palette);   // compatible with manifest.palette
console.log(dark.uiTokens);  // sidebar/card/input/button/text/border tokens
console.log(dark.layout);    // focus point, content side, overlayStrength: 0
```

For tests, browser adapters, or already-decoded images, call `analyzePixels({ data, width, height, channels })` and then `generateThemeCandidates(analysis)`.

## Safety and constraints

- Image processing is local and in-memory.
- Inputs default to 32 MiB and 64 megapixels or less; both limits can be lowered.
- Transparent pixels are ignored during color and saliency analysis.
- Generated candidates use opaque or local translucent component surfaces. They never prescribe a full-page overlay.
- Subject and safe-area detection is a deterministic edge/color-saliency heuristic, not semantic object detection.
