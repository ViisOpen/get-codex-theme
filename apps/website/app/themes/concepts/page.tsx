import type { Metadata } from "next";
import Link from "next/link";
import { ConceptThemeCard } from "@/components/ConceptThemeCard";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { conceptCategories, conceptThemes } from "@/lib/concept-themes";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Codex Theme Concepts — Characters, Tech & Aesthetic Styles",
  description: `Explore ${conceptThemes.length} original Codex theme concepts across mascots, unofficial brand-inspired directions, gaming, culture, and visual aesthetics.`,
  keywords: ["Codex theme concepts", "Codex character themes", "Codex brand themes", "fun Codex themes", "Codex desktop customization"],
  alternates: { canonical: absoluteUrl("/themes/concepts") },
  openGraph: {
    title: `${conceptThemes.length} Codex Theme Concepts`,
    description: "Original character, tech, gaming, cultural, and aesthetic directions shown inside a consistent Codex desktop preview shell.",
    url: absoluteUrl("/themes/concepts"),
  },
};

export default function ConceptThemesPage() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Codex Theme Concepts",
      description: metadata.description,
      url: absoluteUrl("/themes/concepts"),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: conceptThemes.length,
        itemListElement: conceptThemes.map((theme, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: theme.name,
          url: absoluteUrl(`/themes/concepts/${theme.slug}`),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Themes", item: absoluteUrl("/themes") },
        { "@type": "ListItem", position: 3, name: "Concepts", item: absoluteUrl("/themes/concepts") },
      ],
    },
  ];

  return (
    <SeoPageShell
      eyebrow={`${conceptThemes.length} original art directions`}
      title={<>Codex themes with<br /><em className="text-white/62">more personality.</em></>}
      description={<p>Characters, launch nights, game worlds, cultural scenes, and design movements—each shown inside the same Codex-like shell so the visual system is easy to compare.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: "Concepts" }]}
      actions={<><Link className={primaryButtonClass} href="#concept-directory">Browse concepts</Link><Link className={secondaryButtonClass} href="/themes/free">Download working packs →</Link></>}
    >
      <JsonLd data={schema} />
      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-5 md:grid-cols-3`}>
          <article className="rounded-3xl border border-[#8e7cff]/30 bg-[#8e7cff]/10 p-7 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-[#c5bcff]">Concept preview ≠ downloadable pack</span>
            <h2 className="mt-8 max-w-3xl [font-family:var(--font-heading)] text-4xl sm:text-5xl">A credible Codex shell first. Verified screenshots when the runtime is ready.</h2>
            <p className="mt-5 max-w-2xl leading-7 text-white/62">Image generation supplies only original background art. The navigation, thread, suggestion cards, and composer are rendered consistently in code. Concepts never show a download button until a tested pack exists.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
            <span className="text-xs uppercase tracking-[0.18em] text-white/58">Status system</span>
            <ul className="mt-7 space-y-4 text-sm leading-6 text-white/65">
              <li><b className="text-white">Concept preview</b><br />Artwork and Codex shell are ready.</li>
              <li><b className="text-white">Pack available</b><br />Files can be downloaded and restored.</li>
              <li><b className="text-white">Verified</b><br />Tested in a current Codex build.</li>
            </ul>
          </article>
        </div>
      </section>

      <div id="concept-directory">
        {conceptCategories.map((category) => {
          const categoryThemes = conceptThemes.filter((theme) => theme.category === category);
          return (
            <section className="border-b border-white/10" key={category}>
              <div className={sectionClass}>
                <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">{String(categoryThemes.length).padStart(2, "0")} directions</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">{category}</h2></div>
                  <p className="max-w-md leading-7 text-white/52">Every direction has distinct composition guidance, palette intent, workspace constraints, and a reserved detail page.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {categoryThemes.map((theme) => <ConceptThemeCard key={theme.slug} theme={theme} />)}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </SeoPageShell>
  );
}
