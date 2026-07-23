export type CodexTheme = {
  slug: string;
  name: string;
  mode: "dark" | "light";
  tagline: string;
  description: string;
  designStory?: string;
  accent: string;
  accentStrong: string;
  foreground: string;
  muted: string;
  surface: string;
  canvas: string;
  gradient: string;
  tags: string[];
  focusX: number;
  focusY: number;
  order: number;
  featured?: boolean;
  brandLogoUrl?: string;
  registry?: {
    version: string;
    category: "characters" | "brands" | "gaming" | "culture" | "aesthetic";
    authorName: string;
    authorUrl: string;
    license: string;
    previewMetadata?: {
      kind: "illustrative" | "verified-capture";
      label: string;
      renderer?: "html-css" | "native-capture" | "artwork";
      platform?: "macos" | "windows";
      codexVersion?: string;
    };
  };
};

export const themes: CodexTheme[] = [
  {
    slug: "codexhub",
    name: "Codex Hub",
    mode: "dark",
    tagline: "Build in black. Ship in orange.",
    description:
      "A sharp black-and-orange developer console with technical-grid artwork, high-contrast surfaces, and complete component coverage.",
    accent: "#FFA31A",
    accentStrong: "#FF7A00",
    foreground: "#F5F5F5",
    muted: "#9A9A9A",
    surface: "rgba(8, 8, 8, 0.90)",
    canvas: "#050505",
    gradient: "url(\"/theme-packs/codexhub/assets/background.jpg\") center / cover no-repeat",
    tags: ["Black", "Orange", "Developer", "Brand"],
    focusX: 54.17,
    focusY: 48.82,
    order: 5,
    featured: true,
    brandLogoUrl: "/theme-packs/codexhub/assets/brand-logo.png",
    registry: {
      version: "1.0.1",
      category: "brands",
      authorName: "VIIS Labs",
      authorUrl: "https://github.com/ViisOpen",
      license: "CC BY 4.0",
      previewMetadata: {
        kind: "illustrative",
        renderer: "html-css",
        label: "Illustrative HTML/CSS Codex preview — no user data",
      },
    },
  },
  {
    slug: "obsidian-orbit",
    name: "Obsidian Orbit",
    mode: "dark",
    tagline: "Quiet gravity for deep work.",
    description:
      "A restrained black-and-silver workspace with a cool orbital glow and high-contrast code surfaces.",
    accent: "#8da2ff",
    accentStrong: "#6f83ee",
    foreground: "#f4f6ff",
    muted: "#a3a9bd",
    surface: "rgba(12, 14, 22, 0.86)",
    canvas: "#06070b",
    gradient:
      "radial-gradient(circle at 78% 34%, rgba(122,145,255,.55), transparent 18%), radial-gradient(circle at 68% 54%, rgba(37,45,81,.8), transparent 34%), linear-gradient(135deg,#030408 0%,#0b0d16 48%,#171c31 100%)",
    tags: ["Minimal", "Space", "Focus"],
    focusX: 76,
    focusY: 44,
    order: 10,
    featured: true,
  },
  {
    slug: "aurora-glass",
    name: "Aurora Glass",
    mode: "dark",
    tagline: "Soft color. Sharp thinking.",
    description:
      "Blue-violet aurora light, translucent surfaces, and a calm reading field made for cinematic setups.",
    accent: "#9b87ff",
    accentStrong: "#7862e8",
    foreground: "#fbf9ff",
    muted: "#bbb5d0",
    surface: "rgba(18, 14, 31, 0.82)",
    canvas: "#090611",
    gradient:
      "radial-gradient(ellipse at 80% 20%, rgba(72,233,218,.52), transparent 25%), radial-gradient(ellipse at 72% 62%, rgba(143,84,255,.75), transparent 38%), linear-gradient(145deg,#05030b 0%,#17112b 50%,#142c38 100%)",
    tags: ["Aurora", "Glass", "Cinematic"],
    focusX: 74,
    focusY: 46,
    order: 20,
    featured: true,
  },
  {
    slug: "midnight-grid",
    name: "Midnight Grid",
    mode: "dark",
    tagline: "A technical calm after dark.",
    description:
      "Deep navy structure, faint grid lines, and a low-distraction center for long coding sessions.",
    accent: "#41b8ff",
    accentStrong: "#168bd1",
    foreground: "#eef8ff",
    muted: "#8fa6b8",
    surface: "rgba(5, 17, 27, 0.88)",
    canvas: "#030a10",
    gradient:
      "linear-gradient(rgba(77,161,216,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(77,161,216,.08) 1px,transparent 1px),radial-gradient(circle at 78% 48%,rgba(41,157,225,.38),transparent 29%),linear-gradient(140deg,#02070b,#071a27 58%,#0d2637)",
    tags: ["Grid", "Navy", "Developer"],
    focusX: 78,
    focusY: 50,
    order: 30,
  },
  {
    slug: "signal-drive",
    name: "Signal Drive",
    mode: "dark",
    tagline: "Momentum without the noise.",
    description:
      "A black-red motion study with controlled neon energy and a protected central reading area.",
    accent: "#ff4d58",
    accentStrong: "#d82f3d",
    foreground: "#fff5f5",
    muted: "#c4a9ab",
    surface: "rgba(19, 7, 10, 0.88)",
    canvas: "#080204",
    gradient:
      "radial-gradient(ellipse at 86% 48%,rgba(255,45,64,.7),transparent 16%),linear-gradient(112deg,transparent 50%,rgba(255,45,64,.34) 51%,transparent 54%),linear-gradient(145deg,#050102 0%,#160609 58%,#390b12 100%)",
    tags: ["Red", "Motion", "Sci-fi"],
    focusX: 82,
    focusY: 50,
    order: 40,
    featured: true,
  },
  {
    slug: "cloud-atelier",
    name: "Cloud Atelier",
    mode: "light",
    tagline: "A brighter place to build.",
    description:
      "Airy whites, sky blue structure, and architectural softness for a polished light workspace.",
    accent: "#168bd6",
    accentStrong: "#0b6fad",
    foreground: "#17222c",
    muted: "#61717f",
    surface: "rgba(255, 255, 255, 0.84)",
    canvas: "#eef7fb",
    gradient:
      "radial-gradient(ellipse at 78% 30%,rgba(255,255,255,.92),transparent 21%),radial-gradient(ellipse at 72% 66%,rgba(107,198,236,.65),transparent 36%),linear-gradient(145deg,#f9fcfd 0%,#dff3fb 48%,#a8d9eb 100%)",
    tags: ["Light", "Sky", "Clean"],
    focusX: 75,
    focusY: 46,
    order: 50,
    featured: true,
  },
  {
    slug: "sage-workshop",
    name: "Sage Workshop",
    mode: "light",
    tagline: "Natural focus, engineered well.",
    description:
      "Sage green, warm stone, and tactile natural surfaces with restrained contrast for everyday use.",
    accent: "#4c8068",
    accentStrong: "#315f4d",
    foreground: "#203029",
    muted: "#66756d",
    surface: "rgba(250, 252, 247, 0.86)",
    canvas: "#eaf0e8",
    gradient:
      "radial-gradient(circle at 82% 35%,rgba(210,232,196,.9),transparent 25%),radial-gradient(circle at 72% 66%,rgba(83,126,101,.38),transparent 36%),linear-gradient(140deg,#f4f3e9,#dbe7d6 55%,#9fb9a5)",
    tags: ["Sage", "Natural", "Calm"],
    focusX: 76,
    focusY: 49,
    order: 60,
  },
  {
    slug: "solar-paper",
    name: "Solar Paper",
    mode: "light",
    tagline: "Warm editorial energy.",
    description:
      "Cream paper, amber sunlight, and subtle editorial texture for writers, designers, and builders.",
    accent: "#d87921",
    accentStrong: "#ad5811",
    foreground: "#33261b",
    muted: "#78695b",
    surface: "rgba(255, 251, 240, 0.88)",
    canvas: "#f6ecd8",
    gradient:
      "radial-gradient(circle at 82% 32%,rgba(255,195,75,.82),transparent 20%),radial-gradient(circle at 72% 66%,rgba(198,101,31,.35),transparent 33%),linear-gradient(145deg,#fffaf0,#f4dfb9 54%,#d89b55)",
    tags: ["Warm", "Editorial", "Paper"],
    focusX: 78,
    focusY: 46,
    order: 70,
  },
  {
    slug: "rose-quartz",
    name: "Rose Quartz",
    mode: "light",
    tagline: "A softer kind of precision.",
    description:
      "Mineral pink, pearl gray, and gentle translucent layers with enough contrast for real work.",
    accent: "#c75578",
    accentStrong: "#a43d5d",
    foreground: "#39262d",
    muted: "#806771",
    surface: "rgba(255, 249, 251, 0.86)",
    canvas: "#f7e9ee",
    gradient:
      "radial-gradient(circle at 80% 31%,rgba(255,233,243,.95),transparent 20%),radial-gradient(circle at 73% 64%,rgba(207,102,139,.5),transparent 34%),linear-gradient(145deg,#fffafb,#f0dce4 50%,#d79ab0)",
    tags: ["Rose", "Soft", "Lifestyle"],
    focusX: 77,
    focusY: 47,
    order: 80,
  },
  {
    slug: "velvet-observatory",
    name: "Velvet Observatory",
    mode: "dark",
    tagline: "Quiet luxury for long-range thinking.",
    description:
      "A burgundy observatory with antique brass instruments, celestial depth, and a calm left-side reading field.",
    accent: "#c79a5b",
    accentStrong: "#9d7139",
    foreground: "#faf3ea",
    muted: "#c5aeb0",
    surface: "rgba(27, 11, 17, 0.86)",
    canvas: "#12080c",
    gradient:
      "radial-gradient(circle at 80% 38%,rgba(224,183,124,.62),transparent 18%),linear-gradient(135deg,#12080c 0%,#2b101b 60%,#070508 100%)",
    tags: ["Burgundy", "Brass", "Celestial"],
    focusX: 78,
    focusY: 48,
    order: 90,
  },
  {
    slug: "inkstone-garden",
    name: "Inkstone Garden",
    mode: "dark",
    tagline: "Rain, stone, and room to think.",
    description:
      "Rain-dark stone, silver mist, and restrained jade reflections shape a meditative workspace.",
    accent: "#7fb6a3",
    accentStrong: "#568b79",
    foreground: "#f0f4f2",
    muted: "#9caaa5",
    surface: "rgba(14, 23, 23, 0.86)",
    canvas: "#0e1414",
    gradient:
      "radial-gradient(circle at 82% 48%,rgba(127,182,163,.42),transparent 24%),linear-gradient(135deg,#111718 0%,#202b29 62%,#080b0c 100%)",
    tags: ["Ink", "Garden", "Minimal"],
    focusX: 79,
    focusY: 48,
    order: 100,
  },
  {
    slug: "neon-monsoon",
    name: "Neon Monsoon",
    mode: "dark",
    tagline: "Electric weather, disciplined focus.",
    description:
      "A rain-polished midnight arcade with controlled cyan and orchid light beyond the primary reading field.",
    accent: "#51d7ff",
    accentStrong: "#199fc9",
    foreground: "#f1f7ff",
    muted: "#9aa9be",
    surface: "rgba(5, 14, 28, 0.86)",
    canvas: "#030914",
    gradient:
      "radial-gradient(ellipse at 84% 38%,rgba(164,73,255,.62),transparent 20%),radial-gradient(ellipse at 78% 68%,rgba(43,201,255,.48),transparent 28%),linear-gradient(135deg,#020711,#06152a 65%,#12072b)",
    tags: ["Neon", "Rain", "Architecture"],
    focusX: 81,
    focusY: 47,
    order: 110,
  },
  {
    slug: "desert-eclipse",
    name: "Desert Eclipse",
    mode: "dark",
    tagline: "Monumental calm in copper light.",
    description:
      "Copper-lit mineral ridges and a monumental eclipse create cinematic depth without crowding the work surface.",
    accent: "#f28a4b",
    accentStrong: "#c4602b",
    foreground: "#fff4eb",
    muted: "#cbb0a4",
    surface: "rgba(29, 12, 9, 0.86)",
    canvas: "#1a0b08",
    gradient:
      "radial-gradient(circle at 80% 23%,rgba(255,133,65,.84),transparent 15%),linear-gradient(145deg,#1a0b08 0%,#4c2117 58%,#120708 100%)",
    tags: ["Desert", "Eclipse", "Copper"],
    focusX: 79,
    focusY: 42,
    order: 120,
  },
  {
    slug: "alpine-daybreak",
    name: "Alpine Daybreak",
    mode: "light",
    tagline: "Clear air for clear decisions.",
    description:
      "Snow light, warm oak, and a quiet mountain studio bring architectural clarity to a bright workspace.",
    accent: "#4e7fa7",
    accentStrong: "#315f83",
    foreground: "#1b2932",
    muted: "#657680",
    surface: "rgba(255, 255, 255, 0.80)",
    canvas: "#eff3f4",
    gradient:
      "radial-gradient(ellipse at 82% 42%,rgba(168,205,228,.72),transparent 27%),linear-gradient(145deg,#f7f6f2 0%,#edf3f5 56%,#c6dce8 100%)",
    tags: ["Alpine", "Studio", "Airy"],
    focusX: 78,
    focusY: 48,
    order: 130,
  },
  {
    slug: "porcelain-tide",
    name: "Porcelain Tide",
    mode: "light",
    tagline: "Cobalt rhythm on a quiet canvas.",
    description:
      "Cobalt ceramic ribbons, warm ivory plaster, and fine gold edges create a tactile gallery-like workspace.",
    accent: "#2456b4",
    accentStrong: "#183f8a",
    foreground: "#1d2736",
    muted: "#697181",
    surface: "rgba(255, 253, 248, 0.82)",
    canvas: "#f5f0e8",
    gradient:
      "radial-gradient(ellipse at 84% 48%,rgba(39,87,180,.68),transparent 27%),linear-gradient(145deg,#fbf6ed 0%,#f3eee5 62%,#d7dfef 100%)",
    tags: ["Porcelain", "Cobalt", "Gallery"],
    focusX: 80,
    focusY: 48,
    order: 140,
  },
  {
    slug: "citrus-atelier",
    name: "Citrus Atelier",
    mode: "light",
    tagline: "Optimism with architectural discipline.",
    description:
      "Citrus, coral, and ultramarine sculpture turn modernist geometry into a bright, energetic working canvas.",
    accent: "#e75c3b",
    accentStrong: "#bc3f27",
    foreground: "#2c2a28",
    muted: "#706b66",
    surface: "rgba(255, 253, 248, 0.84)",
    canvas: "#f7f1e7",
    gradient:
      "radial-gradient(circle at 78% 31%,rgba(255,188,32,.84),transparent 22%),radial-gradient(circle at 87% 61%,rgba(232,91,61,.54),transparent 27%),linear-gradient(145deg,#fff9ed 0%,#f4ecde 64%,#dce3f5 100%)",
    tags: ["Citrus", "Modernist", "Colorful"],
    focusX: 80,
    focusY: 47,
    order: 150,
  },
  {
    slug: "paper-grove",
    name: "Paper Grove",
    mode: "light",
    tagline: "Handcrafted quiet for everyday work.",
    description:
      "Layered vellum trees, pale moss, and a winding paper path form a restorative handcrafted landscape.",
    accent: "#66806a",
    accentStrong: "#46604b",
    foreground: "#263029",
    muted: "#68736b",
    surface: "rgba(253, 253, 248, 0.83)",
    canvas: "#f0f0e9",
    gradient:
      "radial-gradient(ellipse at 81% 50%,rgba(126,153,126,.55),transparent 29%),linear-gradient(145deg,#faf9f3 0%,#eef1e8 60%,#c8d2bf 100%)",
    tags: ["Paper", "Forest", "Handcrafted"],
    focusX: 79,
    focusY: 49,
    order: 160,
  },
];

export const featuredThemes = themes.filter((theme) => theme.featured);

export function getTheme(slug: string) {
  return themes.find((theme) => theme.slug === slug);
}

export function getRelatedThemes(theme: CodexTheme) {
  return themes
    .filter((candidate) => candidate.slug !== theme.slug)
    .sort((a, b) => Number(b.mode === theme.mode) - Number(a.mode === theme.mode))
    .slice(0, 3);
}
