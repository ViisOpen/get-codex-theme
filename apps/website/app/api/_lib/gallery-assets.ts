import { GALLERY_ASSET_NAMES, type GalleryAssetName } from "./submission-validator";

export type StoredGalleryAsset = { key: string; contentType: string };

export function parseStoredGalleryAssets(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, { key?: unknown; contentType?: unknown }>;
    const assets: Partial<Record<GalleryAssetName, StoredGalleryAsset>> = {};
    for (const name of GALLERY_ASSET_NAMES) {
      const item = parsed[name];
      if (typeof item?.key !== "string" || typeof item.contentType !== "string") continue;
      assets[name] = { key: item.key, contentType: item.contentType };
    }
    return assets;
  } catch { return {}; }
}
