export const THEME_DETAIL_COPY = {
  layoutPreviewsLabel: "Layout previews",
  layoutPreviewsTitle: "Home and active task.",
  designStoryLabel: "Designed for real work",
  includedLabel: "Included",
  includedItems: [
    "Theme manifest and complete visual tokens",
    "Landscape background with gradient fallback",
    "Three responsive background layouts",
    "Checksums and CLI installation guidance",
    "Asset license and compatibility notes",
  ],
  compatibilityLabel: "Compatibility",
  compatibility: "Native color themes and advanced visual themes are separate compatibility paths. Image backgrounds are not represented as an official Codex feature unless the current app explicitly exposes them.",
} as const;

export type PublicPreviewMetadata = {
  kind: "illustrative" | "verified-capture";
  renderer?: string;
  platform?: string;
  codexVersion?: string;
};

export function publicPreviewStatement(metadata: PublicPreviewMetadata) {
  if (metadata.kind === "verified-capture") {
    const platform = metadata.platform === "macos" ? "macOS" : metadata.platform === "windows" ? "Windows" : "the recorded platform";
    return `These images were rendered from the native Codex page structure and styles on ${platform}, using Codex ${metadata.codexVersion ?? "the recorded version"}.`;
  }
  if (metadata.renderer === "html-css") {
    return "Home and active-task states are rendered from a deterministic HTML/CSS Codex-like shell using fixed demo content. The renderer does not open Codex or read user data.";
  }
  return "Home and task states use one consistent coded Codex-like shell over the theme artwork. They are illustrative previews—not live Codex captures.";
}

export function publicPackSafetyStatement(source: "community" | "first-party") {
  return `This ${source} pack is local-first and reversible. It does not replace the signed Codex application or take ownership of system application directories. Advanced image backgrounds use the open-source compatibility layer only when the current Codex version supports it.`;
}
