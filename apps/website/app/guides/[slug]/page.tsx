import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  SeoPageShell,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "@/components/SeoPageShell";
import { getGuide, guides } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";
import { themes } from "@/lib/themes";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  return {
    title: guide.shortTitle,
    description: guide.description,
    keywords: [guide.keyword, "Codex themes", "Codex Desktop customization", "custom Codex theme"],
    alternates: { canonical: absoluteUrl(`/guides/${guide.slug}`) },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      url: absoluteUrl(`/guides/${guide.slug}`),
      publishedTime: "2026-07-16",
      modifiedTime: "2026-07-16",
      images: [{ url: absoluteUrl("/og.png"), width: 1200, height: 630, alt: `${guide.shortTitle} guide` }],
    },
  };
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const currentIndex = guides.findIndex((item) => item.slug === guide.slug);
  const relatedGuides = [1, 2, 3].map((offset) => guides[(currentIndex + offset) % guides.length]);
  const featuredTheme = themes[currentIndex % themes.length];
  const articleText = guide.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])]).join(" ");

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      url: absoluteUrl(`/guides/${guide.slug}`),
      datePublished: "2026-07-16",
      dateModified: "2026-07-16",
      image: absoluteUrl("/og.png"),
      articleSection: "Codex Themes",
      keywords: `${guide.keyword}, Codex themes, Codex Desktop customization`,
      articleBody: articleText,
      author: { "@type": "Organization", name: "Get Codex Theme", url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: "Get Codex Theme", url: absoluteUrl("/") },
      isPartOf: { "@type": "WebSite", name: "Get Codex Theme", url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
        { "@type": "ListItem", position: 3, name: guide.shortTitle, item: absoluteUrl(`/guides/${guide.slug}`) },
      ],
    },
  ];

  return (
    <SeoPageShell
      eyebrow={`${guide.keyword} · ${guide.readTime} read`}
      title={guide.title}
      description={<p>{guide.description}</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: guide.shortTitle }]}
      actions={<><Link className={primaryButtonClass} href="/themes">Browse free themes</Link><Link className={secondaryButtonClass} href="/create">Create your own ↗</Link></>}
      compact
    >
      <JsonLd data={schema} />
      <div className={`${sectionClass} grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]`}>
        <article className="min-w-0">
          <div className="mb-12 rounded-3xl border border-[#8e7cff]/25 bg-[#8e7cff]/10 p-6 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#b8adff]">Quick answer</p>
            <p className="mt-4 text-lg font-light leading-8 text-white/72">{guide.description}</p>
          </div>
          <div className="space-y-14">
            {guide.sections.map((section, index) => (
              <section id={`section-${index + 1}`} key={section.heading}>
                <div className="flex gap-5">
                  <span className="mt-2 text-xs tracking-[0.16em] text-white/58">0{index + 1}</span>
                  <div>
                    <h2 className="text-balance [font-family:var(--font-heading)] text-4xl sm:text-5xl">{section.heading}</h2>
                    <div className="mt-6 space-y-5 text-lg font-light leading-8 text-white/62">
                      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </div>
                    {section.bullets ? (
                      <ul className="mt-7 grid gap-3">
                        {section.bullets.map((bullet) => <li className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 leading-7 text-white/65" key={bullet}>{bullet}</li>)}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </section>
            ))}
          </div>
          <div className="mt-16 border-t border-white/10 pt-8 text-sm leading-7 text-white/58">
            <p><strong className="font-medium text-white/72">Compatibility note:</strong> Native Codex appearance controls and advanced visual image layers are different. Get Codex Theme labels the delivery path and never treats an experimental visual layer as an official Appearance feature.</p>
          </div>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <nav className="rounded-3xl border border-white/10 bg-white/[0.035] p-6" aria-label="On this page">
            <p className="text-xs uppercase tracking-[0.18em] text-white/58">On this page</p>
            <ol className="mt-5 space-y-3 text-sm text-white/58">
              {guide.sections.map((section, index) => <li key={section.heading}><a className="transition hover:text-white" href={`#section-${index + 1}`}>{index + 1}. {section.heading}</a></li>)}
            </ol>
          </nav>
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-white/58">Try a free theme</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-3xl">{featuredTheme.name}</h2>
            <p className="mt-3 text-sm leading-6 text-white/52">{featuredTheme.tagline}</p>
            <Link className="mt-5 inline-flex text-sm text-[#b8adff]" href={`/themes/${featuredTheme.slug}`}>View this theme →</Link>
          </div>
        </aside>
      </div>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={sectionClass}>
          <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Continue learning</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {relatedGuides.map((item) => (
              <Link className="rounded-3xl border border-white/10 bg-[#111216] p-6 transition hover:-translate-y-1 hover:border-white/25" href={`/guides/${item.slug}`} key={item.slug}>
                <span className="text-xs uppercase tracking-[0.16em] text-white/58">{item.readTime}</span>
                <h2 className="mt-6 [font-family:var(--font-heading)] text-3xl">{item.shortTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-white/52">{item.description}</p>
                <span className="mt-5 inline-block text-sm text-[#b8adff]">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
