import type { Metadata } from "next";
import Link from "next/link";
import { ConceptThemeCard } from "@/components/ConceptThemeCard";
import { ThemeCard } from "@/components/ThemeCard";
import {
  JsonLd,
  SeoPageShell,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "@/components/SeoPageShell";
import { absoluteUrl } from "@/lib/site";
import { conceptThemes } from "@/lib/concept-themes";
import { themes } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Codex Themes for Desktop",
  description:
    "Browse original free Codex Desktop themes in dark and light styles. Preview every theme, learn how it works, and build a custom Codex theme from your own image.",
  keywords: ["Codex themes", "free Codex themes", "custom Codex theme", "Codex Desktop themes"],
  alternates: { canonical: absoluteUrl("/themes") },
  openGraph: {
    title: "Free Codex Themes for Desktop",
    description: "Original dark and light Codex themes, ready to preview and download.",
    url: absoluteUrl("/themes"),
  },
};

const darkThemes = themes.filter((theme) => theme.mode === "dark");
const lightThemes = themes.filter((theme) => theme.mode === "light");

export default function ThemesPage() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Free Codex Themes",
      description: metadata.description,
      url: absoluteUrl("/themes"),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: themes.length,
        itemListElement: themes.map((theme, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: theme.name,
          url: absoluteUrl(`/themes/${theme.slug}`),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Themes", item: absoluteUrl("/themes") },
      ],
    },
  ];

  return (
    <SeoPageShell
      eyebrow="Free Codex themes"
      title={<>Codex themes for<br /><em className="text-white/62">your workspace.</em></>}
      description={
        <p>
          Browse {themes.length} downloadable packs and {conceptThemes.length} clearly labeled concept directions.
          Start with personality, then download only what has passed pack and restore testing.
        </p>
      }
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes" }]}
      actions={
        <>
          <Link className={primaryButtonClass} href="/themes/free">Download free themes</Link>
          <Link className={secondaryButtonClass} href="/create">Create a custom theme ↗</Link>
        </>
      }
    >
      <JsonLd data={schema} />
      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-6 md:grid-cols-2 xl:grid-cols-4`}>
          <Link className="group rounded-3xl border border-[#8e7cff]/30 bg-[#8e7cff]/10 p-7 transition hover:-translate-y-1 hover:border-[#b7adff]/50" href="/themes/concepts">
            <span className="text-xs uppercase tracking-[0.2em] text-[#b8adff]">01 · Concepts</span>
            <h2 className="mt-10 [font-family:var(--font-heading)] text-4xl">Character + tech</h2>
            <p className="mt-3 leading-7 text-white/62">{conceptThemes.length} original mascot, brand-inspired, gaming, culture, and aesthetic directions.</p>
            <span className="mt-7 inline-block text-sm text-[#d6d0ff]">Explore concepts →</span>
          </Link>
          <Link className="group rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-white/25" href="/themes/dark">
            <span className="text-xs uppercase tracking-[0.2em] text-white/58">02 · Collection</span>
            <h2 className="mt-10 [font-family:var(--font-heading)] text-4xl">Dark themes</h2>
            <p className="mt-3 leading-7 text-white/55">{darkThemes.length} low-glare themes for late sessions and focused work.</p>
            <span className="mt-7 inline-block text-sm text-[#b8adff]">Explore dark themes →</span>
          </Link>
          <Link className="group rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-white/25" href="/themes/light">
            <span className="text-xs uppercase tracking-[0.2em] text-white/58">03 · Collection</span>
            <h2 className="mt-10 [font-family:var(--font-heading)] text-4xl">Light themes</h2>
            <p className="mt-3 leading-7 text-white/55">{lightThemes.length} bright, readable palettes with softer visual weight.</p>
            <span className="mt-7 inline-block text-sm text-[#b8adff]">Explore light themes →</span>
          </Link>
          <Link className="group rounded-3xl border border-[#8e7cff]/30 bg-[#8e7cff]/10 p-7 transition hover:-translate-y-1 hover:border-[#b7adff]/50" href="/create">
            <span className="text-xs uppercase tracking-[0.2em] text-[#b8adff]">04 · Creator guide</span>
            <h2 className="mt-10 [font-family:var(--font-heading)] text-4xl">Your own image</h2>
            <p className="mt-3 leading-7 text-white/62">Copy a guided prompt into Codex, then let the CLI build and validate your local artwork.</p>
            <span className="mt-7 inline-block text-sm text-[#d6d0ff]">Open the creator guide ↗</span>
          </Link>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={sectionClass}>
          <div className="mb-11 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Concept preview batch</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">More memorable than another gradient.</h2></div>
            <Link className="text-sm text-[#b8adff]" href="/themes/concepts">Browse all {conceptThemes.length} concepts →</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{conceptThemes.slice(0, 6).map((theme) => <ConceptThemeCard key={theme.slug} theme={theme} />)}</div>
        </div>
      </section>

      <section className={sectionClass} id="all-themes">
        <div className="mb-11 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">All free templates</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">Original by design.</h2>
          </div>
          <p className="max-w-md leading-7 text-white/52">
            Each template includes a coordinated palette, layout-aware focal point, compatibility notes,
            installation guidance, and a reversible workflow.
          </p>
        </div>
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {themes.map((theme) => <ThemeCard key={theme.slug} theme={theme} />)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-10 lg:grid-cols-[1fr_.85fr] lg:items-center`}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Theme, skin, or background?</p>
            <h2 className="mt-4 text-balance [font-family:var(--font-heading)] text-5xl sm:text-6xl">Theme is the whole visual system.</h2>
          </div>
          <div className="space-y-5 text-lg font-light leading-8 text-white/60">
            <p>A background is one image layer. A theme coordinates that image with colors, surfaces, code readability, installation behavior, and restoration.</p>
            <Link className="inline-flex text-sm font-medium text-[#b8adff]" href="/guides/codex-theme-vs-skin-vs-background">
              Read the terminology guide →
            </Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
