import { env } from "cloudflare:workers";
import { RequestError } from "./http";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/png": { extension: "png", signature: "png" },
  "image/jpeg": { extension: "jpg", signature: "jpeg" },
  "image/webp": { extension: "webp", signature: "webp" },
} as const;

export type SupportedImageType = keyof typeof IMAGE_TYPES;

export function sniffImageType(bytes: Uint8Array): SupportedImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export function imageDimensions(bytes: Uint8Array, type: SupportedImageType) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/png" && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "image/jpeg") {
    let offset = 2;
    const markers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (markers.has(marker) && offset + 7 <= bytes.length) {
        return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      }
      offset += Math.max(length, 2);
    }
  }
  if (type === "image/webp" && bytes.length >= 30) {
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    const uint24 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    if (kind === "VP8X") return { width: 1 + uint24(24), height: 1 + uint24(27) };
    if (kind === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
  }
  throw new RequestError(400, "invalid_image", "The image dimensions could not be read.");
}

export async function validateImage(file: File) {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new RequestError(400, "invalid_image_size", "Upload a non-empty image up to 10 MB.");
  }
  if (!(file.type in IMAGE_TYPES)) {
    throw new RequestError(400, "invalid_image_type", "Upload a PNG, JPEG, or WebP image.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(bytes);
  if (!detected || detected !== file.type) {
    throw new RequestError(400, "invalid_image_type", "The file contents do not match its image type.");
  }
  return { contentType: detected, extension: IMAGE_TYPES[detected].extension, ...imageDimensions(bytes, detected) };
}

export function themeAssets() {
  if (!env.THEME_ASSETS) throw new Error("Cloudflare R2 binding `THEME_ASSETS` is unavailable.");
  return env.THEME_ASSETS;
}
