import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConceptThemeCard } from "@/components/ConceptThemeCard";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { ThemeMockup } from "@/components/ThemeMockup";
import { conceptThemes, getConceptTheme, getRelatedConceptThemes } from "@/lib/concept-themes";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return conceptThemes.map((theme) => ({ slug: theme.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = getConceptTheme(slug);
  if (!theme) return {};
  const title = theme.inspiration
    ? `${theme.inspiration} Codex Theme Concept — Unofficial Preview`
    : `${theme.name} Codex Theme Concept`;
  const description = `${theme.description} See its Codex desktop home and task previews, palette, artwork guidance, and pack status.`;
  const image = theme.previewImage ? absoluteUrl(theme.previewImage) : absoluteUrl("/og-concepts.png");
  return {
    title,
    description,
    keywords: [
      `${theme.name} Codex theme`,
      ...(theme.inspiration ? [`${theme.inspiration} Codex theme`, `unofficial ${theme.inspiration} theme for Codex`] : []),
      ...theme.tags.map((tag) => `${tag} Codex theme`),
      `${theme.category} Codex themes`,
    ],
    alternates: { canonical: absoluteUrl(`/themes/concepts/${theme.slug}`) },
    openGraph: { title, description, type: "website", url: absoluteUrl(`/themes/concepts/${theme.slug}`), images: [{ url: image, width: 1536, height: 1024, alt: `${theme.name} original background artwork` }] },
  };
}

export default async function ConceptThemePage({ params }: Props) {
  const { slug } = await params;
  const theme = getConceptTheme(slug);
  if (!theme) notFound();
  const related = getRelatedConceptThemes(theme);
  const backgroundCss = theme.previewImage ? `url("${theme.previewImage}")` : theme.gradient;
  const canonical = absoluteUrl(`/themes/concepts/${theme.slug}`);
  const faq = [
    { question: `Can I install the ${theme.name} Codex theme now?`, answer: theme.previewReady ? "Not yet. The concept artwork and coded preview shell are ready, but installation remains disabled until its responsive crops, tokens, checksums, restore path, and current-Codex verification pass release QA." : "Not yet. This page reserves the art direction and documents how it should work. Artwork generation and theme-pack validation are still queued." },
    { question: "Is this a real Codex screenshot?", answer: "It is an explicitly labeled concept preview. The Codex-like interface is rendered consistently in HTML and CSS over original artwork; it is not presented as a screenshot from an official Appearance setting." },
    { question: "What will stay native?", answer: "Navigation, threads, project selection, task content, the composer, keyboard behavior, and pointer interaction should remain native. The eventual pack changes only supported visual tokens and an optional non-interactive artwork layer." },
  ];
  const schema = [
    { "@context": "https://schema.org", "@type": "CreativeWork", name: `${theme.name} Codex Theme Concept`, description: theme.description, url: canonical, image: theme.previewImage ? absoluteUrl(theme.previewImage) : undefined, keywords: [...theme.tags, `${theme.category} Codex themes`].join(", "), creator: { "@type": "Organization", name: "Get Codex Theme", url: absoluteUrl("/") } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Themes", item: absoluteUrl("/themes") },
      { "@type": "ListItem", position: 3, name: "Concepts", item: absoluteUrl("/themes/concepts") },
      { "@type": "ListItem", position: 4, name: theme.name, item: canonical },
    ] },
  ];

  return (
    <SeoPageShell
      eyebrow={`${theme.category} · ${theme.previewReady ? "Concept preview ready" : "Art direction reserved"}`}
      title={<>{theme.name}<br /><em className="text-white/62">Codex concept.</em></>}
      description={<><p>{theme.description}</p>{theme.trademarkNotice && <p className="mt-4 text-sm text-white/58">{theme.trademarkNotice}</p>}</>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: "Concepts", href: "/themes/concepts" }, { label: theme.name }]}
      actions={<><Link className={primaryButtonClass} href={`/create?direction=${theme.slug}`}>Create something similar</Link><Link className={secondaryButtonClass} href="/themes/concepts">Browse all concepts →</Link></>}
    >
      <JsonLd data={schema} />
      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-8 lg:grid-cols-[1.5fr_.72fr] lg:items-start`}>
          <div className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-2 shadow-2xl shadow-black/50">
            <ThemeMockup backgroundCss={backgroundCss} brandConceptSlug={theme.inspiration ? theme.slug : undefined} className="theme-detail-mockup" statusLabel={theme.inspiration ? "Unofficial concept" : "Concept preview"} theme={theme} />
          </div>
          <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-white/58">Concept profile</p>
            <dl className="mt-7 divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Status</dt><dd>{theme.previewReady ? "Preview ready" : "Artwork queued"}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Pack</dt><dd>Coming soon</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Mode</dt><dd className="capitalize">{theme.mode}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Category</dt><dd>{theme.category}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Accent</dt><dd className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accent }} />{theme.accent}</dd></div>
            </dl>
            <div className="mt-7 rounded-2xl border border-amber-200/15 bg-amber-200/[0.06] p-4 text-sm leading-6 text-amber-50/70">No download is offered until the theme pack and restore path are tested.</div>
          </aside>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-10 max-w-3xl"><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Two interface states</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">Home and active task.</h2><p className="mt-5 text-lg leading-8 text-white/58">The background stays consistent while the interface changes. That makes the direction easier to judge than a wallpaper-only thumbnail.</p></div>
        <div className="grid gap-5 md:grid-cols-2">
          <ThemeMockup backgroundCss={backgroundCss} brandConceptSlug={theme.inspiration ? theme.slug : undefined} statusLabel="Home concept" theme={theme} />
          <ThemeMockup backgroundCss={backgroundCss} brandConceptSlug={theme.inspiration ? theme.slug : undefined} statusLabel="Task concept" theme={theme} variant="task" />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-12 lg:grid-cols-2`}>
          <article><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Art direction</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">What changes.</h2><p className="mt-7 text-lg font-light leading-8 text-white/62">{theme.artDirection}</p><p className="mt-5 leading-7 text-white/50">The final artwork will be produced in 16:10, 16:9, and 4:3 crops with the focal subject kept outside the primary reading field.</p></article>
          <article><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Workspace behavior</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">What stays native.</h2><p className="mt-7 text-lg font-light leading-8 text-white/62">{theme.workspaceFit}</p><p className="mt-5 leading-7 text-white/50">Threads, project selection, task cards, composer controls, keyboard interaction, and pointer events remain application UI rather than rasterized artwork.</p></article>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-10"><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Concept FAQ</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">Clear status, no fake download.</h2></div>
        <div className="grid gap-5 lg:grid-cols-3">{faq.map((item) => <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7" key={item.question}><h3 className="text-xl font-medium">{item.question}</h3><p className="mt-4 text-sm leading-7 text-white/58">{item.answer}</p></article>)}</div>
      </section>

      <section className="border-t border-white/10 bg-[#0d0e11]">
        <div className={sectionClass}><div className="mb-10"><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Same category</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">Related directions.</h2></div><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">{related.map((item) => <ConceptThemeCard key={item.slug} theme={item} />)}</div></div>
      </section>
    </SeoPageShell>
  );
}
