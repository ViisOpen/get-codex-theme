export type Guide = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  keyword: string;
  readTime: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
};

export const guides: Guide[] = [
  {
    slug: "codex-themes",
    title: "Codex Themes: The Complete Desktop Customization Guide",
    shortTitle: "Codex Themes Guide",
    description:
      "Understand native Codex themes, visual background themes, CLI themes, installation, sharing, and safety.",
    keyword: "Codex themes",
    readTime: "8 min",
    sections: [
      {
        heading: "What a Codex theme changes",
        paragraphs: [
          "A Codex theme changes the visual system around your work: base mode, accent, foreground and surface colors, code presentation, and—when using an advanced visual pack—the atmosphere behind the native interface.",
          "The useful distinction is native versus visual. Native themes use options Codex exposes. Visual themes add artwork and layout-aware overlays through a reversible local layer.",
        ],
      },
      {
        heading: "Choose the right type",
        paragraphs: [
          "Use a native theme when reliability matters most. Choose a visual theme when you want artwork, a stronger personal identity, or a branded workspace.",
        ],
        bullets: [
          "Native theme: colors and fonts, easiest to share.",
          "Visual theme: image, focal point, overlays, and a fuller palette.",
          "CLI theme: terminal syntax highlighting through a .tmTheme file.",
        ],
      },
      {
        heading: "Install safely",
        paragraphs: [
          "A safe theme should be local-first, reversible, and explicit about every file it changes. It should never rewrite provider credentials or modify the signed Codex application package.",
        ],
      },
    ],
  },
  {
    slug: "customize-codex",
    title: "How to Customize Codex Desktop",
    shortTitle: "Customize Codex",
    description:
      "A practical guide to Codex appearance settings, custom colors, fonts, image backgrounds, and reversible theme packs.",
    keyword: "customize Codex",
    readTime: "6 min",
    sections: [
      {
        heading: "Start with Appearance",
        paragraphs: [
          "Open Codex Settings and review Appearance first. Base mode, accent, foreground, background, UI font, and code font cover most practical customization without any external tool.",
        ],
      },
      {
        heading: "Add a visual background",
        paragraphs: [
          "For an image background, use a landscape source with calm negative space behind the reading area. A 16:10 image at 3200 × 2000 gives the builder enough room to create safe 16:9 and 4:3 crops.",
        ],
        bullets: [
          "Keep the subject in the right third.",
          "Avoid generated text and fake UI controls.",
          "Preview home, task, and narrow-window states.",
        ],
      },
      {
        heading: "Keep a restore path",
        paragraphs: [
          "Before applying an advanced theme, preserve the current configuration and use the fixed-version CLI restore command. A theme is not production-ready if it can be installed but not completely removed.",
        ],
      },
    ],
  },
  {
    slug: "change-codex-theme",
    title: "How to Change Your Codex Theme",
    shortTitle: "Change Codex Theme",
    description:
      "Change a Codex Desktop theme, import a custom pack, verify readability, and restore the default appearance.",
    keyword: "change Codex theme",
    readTime: "5 min",
    sections: [
      {
        heading: "Use the native picker first",
        paragraphs: [
          "For base colors and fonts, use Settings > Appearance. Preview the result in a real task containing prose, code, a diff, and input controls before sharing it.",
        ],
      },
      {
        heading: "Apply a downloaded visual theme",
        paragraphs: [
          "Copy the validated installation prompt to Codex or run the fixed-version CLI command. The CLI creates local backups; advanced themes use a loopback-only visual layer and leave the signed app untouched.",
        ],
      },
      {
        heading: "Verify and restore",
        paragraphs: [
          "Confirm the sidebar, composer, menus, task content, and keyboard focus remain native and usable. Run the included restore action if anything looks wrong after an update.",
        ],
      },
    ],
  },
  {
    slug: "codex-background-image",
    title: "Codex Background Images: Size, Crop, and Readability",
    shortTitle: "Codex Background Image",
    description:
      "Generate or prepare the right landscape image for a custom Codex background without broken crops or unreadable text.",
    keyword: "Codex background image",
    readTime: "7 min",
    sections: [
      {
        heading: "Use a 16:10 landscape master",
        paragraphs: [
          "The recommended master is 3200 × 2000. It matches common laptop displays and still gives enough room for 16:9 and 4:3 crops. A vertical phone wallpaper cannot be repaired by CSS without losing major content.",
        ],
      },
      {
        heading: "Design around the interface",
        paragraphs: [
          "Place the main subject toward the right third and keep the center-left calm. Do not bake labels, buttons, or chat windows into the image; they compete with the real interface and can mislead users.",
        ],
      },
      {
        heading: "Preview more than one window",
        paragraphs: [
          "A strong background works in a full desktop window, a normal task view, and a narrower window. Use focal coordinates and responsive overlays, but generate alternate crops when the composition is sensitive.",
        ],
      },
    ],
  },
  {
    slug: "install-codex-theme-macos",
    title: "Install a Custom Codex Theme on macOS",
    shortTitle: "macOS Installation",
    description:
      "Install, verify, switch, and restore a custom Codex Desktop theme on Apple Silicon or Intel macOS.",
    keyword: "Codex theme macOS",
    readTime: "5 min",
    sections: [
      {
        heading: "Before you install",
        paragraphs: [
          "Launch the official Codex app once, then copy the validated installation prompt to Codex. The fixed-version CLI downloads the theme-only pack, verifies it, and supplies the audited runtime.",
        ],
      },
      {
        heading: "Apply and verify",
        paragraphs: [
          "Let Codex run the exact fixed-version CLI command, then open a home screen and a normal task. The sidebar and composer must remain fully interactive.",
        ],
      },
      {
        heading: "After Codex updates",
        paragraphs: [
          "Visual layers may need to be reapplied after an app update. Never weaken the app signature or edit the application bundle to make a theme persist.",
        ],
      },
    ],
  },
  {
    slug: "install-codex-theme-windows",
    title: "Install a Custom Codex Theme on Windows",
    shortTitle: "Windows Installation",
    description:
      "Install and safely restore a Codex Desktop theme on Windows without changing WindowsApps ownership or package signatures.",
    keyword: "Codex theme Windows",
    readTime: "5 min",
    sections: [
      {
        heading: "Keep the Microsoft Store package intact",
        paragraphs: [
          "A safe Windows theme discovers and launches the current Codex package in its normal context. Do not take ownership of WindowsApps or replace packaged files.",
        ],
      },
      {
        heading: "Use the supplied launcher",
        paragraphs: [
          "Let Codex run the exact fixed-version CLI command. Start the visual layer only after saving active work; it must bind to 127.0.0.1 and stop when you restore the stock appearance.",
        ],
      },
      {
        heading: "Test maximized and narrow states",
        paragraphs: [
          "Windows compositor behavior can differ across hardware. Verify normal, maximized, and narrow windows before keeping a visual theme enabled for daily work.",
        ],
      },
    ],
  },
  {
    slug: "codex-theme-vs-skin-vs-background",
    title: "Codex Theme vs Skin vs Background: What Should You Call It?",
    shortTitle: "Theme vs Skin",
    description:
      "Why theme is the clearest English term for Codex customization, and when skin or background is still useful.",
    keyword: "Codex skin",
    readTime: "4 min",
    sections: [
      {
        heading: "Theme is the category word",
        paragraphs: [
          "In English product language, theme naturally covers a coordinated visual system: colors, surfaces, typography, and sometimes artwork. It is the clearest word for a collection users can browse, install, and share.",
        ],
      },
      {
        heading: "Background is one feature",
        paragraphs: [
          "Background accurately describes the image layer, but it does not describe the supporting palette, code surfaces, buttons, or installation behavior. Use it for image-specific guides and filters.",
        ],
      },
      {
        heading: "Skin is a bridge term",
        paragraphs: [
          "Skin is understood in gaming and desktop-customization communities, but can sound unofficial or cosmetic. Use it when referencing existing community projects, not as the primary product category.",
        ],
      },
    ],
  },
  {
    slug: "codex-appearance-settings",
    title: "Codex Appearance Settings Explained",
    shortTitle: "Appearance Settings",
    description:
      "Understand Codex base themes, accents, foreground and background colors, UI fonts, code fonts, and theme sharing.",
    keyword: "Codex appearance settings",
    readTime: "5 min",
    sections: [
      {
        heading: "Native appearance controls",
        paragraphs: [
          "Codex Desktop exposes a native appearance layer for base mode, accent, background and foreground colors, and UI and code fonts. Start there when you want the most update-resistant result.",
        ],
      },
      {
        heading: "Shareable themes",
        paragraphs: [
          "A shared native theme should preserve readable contrast across task content, code, diffs, menus, and composer controls. Test every exported theme on the current stable app before publishing it.",
        ],
      },
      {
        heading: "Where visual themes differ",
        paragraphs: [
          "Image backgrounds and decorative layout treatments go beyond the publicly described native controls. Treat them as a separate visual compatibility layer and always provide a restore path.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
