import type { Metadata } from "next";
import Link from "next/link";
import { ThemeCard } from "@/components/ThemeCard";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { absoluteUrl } from "@/lib/site";
import { themes } from "@/lib/themes";

const darkThemes = themes.filter((theme) => theme.mode === "dark");

export const metadata: Metadata = {
  title: "Dark Codex Themes",
  description: "Explore free dark Codex themes with cinematic, minimal, developer, glass, space, and sci-fi styles. Preview every palette before downloading.",
  keywords: ["dark Codex themes", "black Codex theme", "Codex dark mode", "free Codex theme"],
  alternates: { canonical: absoluteUrl("/themes/dark") },
};

export default function DarkThemesPage() {
  return (
    <SeoPageShell
      eyebrow="Dark Codex themes"
      title={<>Dark Codex themes.<br /><em className="text-white/62">Less glare.</em></>}
      description={<p>A curated set of free dark themes for long coding sessions, from restrained black-and-silver to cinematic color.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: "Dark" }]}
      actions={<><Link className={primaryButtonClass} href="#dark-themes">See dark themes</Link><Link className={secondaryButtonClass} href="/themes/light">Browse light themes</Link></>}
    >
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Best Dark Codex Themes",
        url: absoluteUrl("/themes/dark"),
        mainEntity: { "@type": "ItemList", itemListElement: darkThemes.map((theme, index) => ({ "@type": "ListItem", position: index + 1, name: theme.name, url: absoluteUrl(`/themes/${theme.slug}`) })) },
      }} />
      <section className={sectionClass} id="dark-themes">
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {darkThemes.map((theme) => <ThemeCard key={theme.slug} theme={theme} />)}
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-8 md:grid-cols-3`}>
          <article><h2 className="[font-family:var(--font-heading)] text-3xl">Contrast first</h2><p className="mt-4 leading-7 text-white/55">Every palette keeps content, code, diffs, input controls, and keyboard focus readable—not merely dramatic.</p></article>
          <article><h2 className="[font-family:var(--font-heading)] text-3xl">Calm center</h2><p className="mt-4 leading-7 text-white/55">Detail stays near the edges while the primary reading area receives a restrained overlay.</p></article>
          <article><h2 className="[font-family:var(--font-heading)] text-3xl">Restore included</h2><p className="mt-4 leading-7 text-white/55">Advanced visual themes remain local and reversible, with no changes to the signed Codex application bundle.</p></article>
        </div>
      </section>
    </SeoPageShell>
  );
}
