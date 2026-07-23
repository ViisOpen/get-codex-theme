import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { ThemeCard } from "@/components/ThemeCard";
import { absoluteUrl } from "@/lib/site";
import { themes } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Free Codex Themes for Desktop",
  description: `Install ${themes.length} original free Codex themes with dark and light palettes, responsive artwork, validated packs, and a complete restore path.`,
  keywords: ["free Codex themes", "Codex theme download", "Codex Desktop themes"],
  alternates: { canonical: absoluteUrl("/themes/free") },
  openGraph: {
    title: "Free Codex Themes for Desktop",
    description: `${themes.length} free, reversible visual themes for Codex Desktop.`,
    url: absoluteUrl("/themes/free"),
    images: [{ url: absoluteUrl("/og.png"), width: 1200, height: 630, alt: "Free Codex themes" }],
  },
};

export default function FreeThemesPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Codex Themes",
    description: metadata.description,
    url: absoluteUrl("/themes/free"),
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
  };

  return (
    <SeoPageShell
      eyebrow="Free Codex theme downloads"
      title={<>Free Codex themes.<br /><em className="text-white/62">No account required.</em></>}
      description={<p>Start with a complete theme pack—not a wallpaper-only effect. Every validated pack includes three responsive background ratios, coordinated tokens, checksums, licensing, and fixed-version CLI guidance.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: "Free" }]}
      actions={
        <>
          <Link className={primaryButtonClass} href="#free-theme-gallery">Browse free themes</Link>
          <Link className={secondaryButtonClass} href="/guides/codex-themes">How Codex themes work →</Link>
        </>
      }
    >
      <JsonLd data={schema} />
      <section className="border-b border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-6 md:grid-cols-3`}>
          {[
            ["3 layouts", "16:10, 16:9, and 4:3 art switch with the window ratio."],
            ["Local-first", "The compatibility runtime stays on loopback and never patches the signed app."],
            ["Reversible", "The fixed-version CLI installs, validates, selects, and restores every published pack."],
          ].map(([title, copy]) => <article className="rounded-3xl border border-white/10 bg-[#111216] p-7" key={title}><h2 className="[font-family:var(--font-heading)] text-4xl">{title}</h2><p className="mt-4 leading-7 text-white/60">{copy}</p></article>)}
        </div>
      </section>
      <section className={sectionClass} id="free-theme-gallery">
        <div className="mb-11 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">{themes.length} original packs</p>
          <h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">Choose dark, light, quiet, or bold.</h2>
          <p className="mt-6 text-lg leading-8 text-white/58">The artwork is original to this project and published under the per-pack CC BY 4.0 asset license. UI-state images are illustrative previews; runtime compatibility depends on the current Codex Desktop build.</p>
        </div>
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {themes.map((theme) => <ThemeCard key={theme.slug} theme={theme} />)}
        </div>
      </section>
    </SeoPageShell>
  );
}
