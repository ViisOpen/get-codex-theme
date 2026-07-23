import type { Metadata } from "next";
import Link from "next/link";
import { ThemeCard } from "@/components/ThemeCard";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { absoluteUrl } from "@/lib/site";
import { themes } from "@/lib/themes";

const lightThemes = themes.filter((theme) => theme.mode === "light");

export const metadata: Metadata = {
  title: "Light Codex Themes",
  description: "Browse free light Codex themes in clean, sky, sage, warm paper, and soft rose palettes. Designed for readable daytime work.",
  keywords: ["light Codex themes", "clean Codex theme", "Codex light mode", "free Codex theme"],
  alternates: { canonical: absoluteUrl("/themes/light") },
};

export default function LightThemesPage() {
  return (
    <SeoPageShell
      eyebrow="Light Codex themes"
      title={<>Light Codex themes.<br /><em className="text-white/62">Never sterile.</em></>}
      description={<p>Four polished light themes that balance open space, softer surfaces, and dependable interface contrast.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: "Light" }]}
      actions={<><Link className={primaryButtonClass} href="#light-themes">See light themes</Link><Link className={secondaryButtonClass} href="/themes/dark">Browse dark themes</Link></>}
    >
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Best Light Codex Themes",
        url: absoluteUrl("/themes/light"),
        mainEntity: { "@type": "ItemList", itemListElement: lightThemes.map((theme, index) => ({ "@type": "ListItem", position: index + 1, name: theme.name, url: absoluteUrl(`/themes/${theme.slug}`) })) },
      }} />
      <section className={sectionClass} id="light-themes">
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {lightThemes.map((theme) => <ThemeCard key={theme.slug} theme={theme} />)}
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-8 md:grid-cols-3`}>
          <article><h2 className="[font-family:var(--font-heading)] text-3xl">Daylight-ready</h2><p className="mt-4 leading-7 text-white/55">Balanced luminance makes these themes comfortable in brighter rooms and extended daytime sessions.</p></article>
          <article><h2 className="[font-family:var(--font-heading)] text-3xl">Readable surfaces</h2><p className="mt-4 leading-7 text-white/55">Code blocks and controls retain visible edges instead of disappearing into the background artwork.</p></article>
          <article><h2 className="[font-family:var(--font-heading)] text-3xl">A complete palette</h2><p className="mt-4 leading-7 text-white/55">Accent, foreground, muted text, canvas, and translucent surfaces are tuned together for a cohesive result.</p></article>
        </div>
      </section>
    </SeoPageShell>
  );
}
