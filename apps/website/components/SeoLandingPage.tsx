import Link from "next/link";
import { ThemeCard } from "@/components/ThemeCard";
import {
  JsonLd,
  SeoPageShell,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "@/components/SeoPageShell";
import {
  getRelatedSeoPages,
  getSeoPagesByCluster,
  seoClusterOrder,
  seoClusters,
  seoLandingPath,
  type SeoClusterKey,
  type SeoLanding,
} from "@/lib/seo-pages";
import { absoluteUrl } from "@/lib/site";
import { themes } from "@/lib/themes";

const publishedDate = "2026-07-16";

function faqSchema(faq: SeoLanding["faq"] | (typeof seoClusters)[SeoClusterKey]["faq"]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function FaqSection({ faq }: { faq: SeoLanding["faq"] | (typeof seoClusters)[SeoClusterKey]["faq"] }) {
  return (
    <section className="border-t border-white/10 bg-[#0d0e11]">
      <div className={sectionClass}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Practical answers</p>
        <h2 className="mt-4 max-w-3xl [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-6xl">
          Questions worth answering before you choose.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-3">
          {faq.map((item) => (
            <article className="bg-[#101115] p-7 sm:p-9" key={item.question}>
              <h3 className="text-lg font-medium leading-7 text-white">{item.question}</h3>
              <p className="mt-4 text-sm leading-7 text-white/58">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClusterLinks({ current }: { current: SeoClusterKey }) {
  return (
    <nav aria-label="Explore Codex theme guides" className="grid gap-3 sm:grid-cols-3">
      {seoClusterOrder.map((key) => {
        const cluster = seoClusters[key];
        return (
          <Link
            className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-white/35 ${
              key === current ? "border-[#a99cff]/50 bg-[#a99cff]/10" : "border-white/10 bg-white/[0.035]"
            }`}
            href={cluster.path}
            key={key}
          >
            <span className="text-xs uppercase tracking-[0.16em] text-white/58">Guide library</span>
            <span className="mt-2 block text-lg text-white">{cluster.label} →</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SeoLandingPage({ page }: { page: SeoLanding }) {
  const cluster = seoClusters[page.cluster];
  const relatedPages = getRelatedSeoPages(page);
  const recommendedThemes = page.themeSlugs
    .map((slug) => themes.find((theme) => theme.slug === slug))
    .filter((theme): theme is (typeof themes)[number] => Boolean(theme));
  const pageUrl = absoluteUrl(seoLandingPath(page));
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: page.title,
        description: page.metaDescription,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        image: absoluteUrl("/og.png"),
        datePublished: publishedDate,
        dateModified: publishedDate,
        author: { "@type": "Organization", name: "Get Codex Theme", url: absoluteUrl("/") },
        publisher: { "@type": "Organization", name: "Get Codex Theme", url: absoluteUrl("/") },
      },
      faqSchema(page.faq),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: cluster.label, item: absoluteUrl(cluster.path) },
          { "@type": "ListItem", position: 3, name: page.label, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <SeoPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={<p>{page.intro}</p>}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: cluster.label, href: cluster.path },
        { label: page.label },
      ]}
      actions={
        <>
          <Link className={primaryButtonClass} href="/create">Build your theme ↗</Link>
          <Link className={secondaryButtonClass} href={cluster.path}>Browse {cluster.label.toLowerCase()}</Link>
        </>
      }
    >
      <JsonLd data={schema} />

      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Design perspective</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-5xl">Make the visual idea survive the work.</h2>
          </div>
          <div className="space-y-6 text-lg font-light leading-8 text-white/65">
            {page.perspective.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Adaptation guide</p>
        <h2 className="mt-4 max-w-3xl [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-6xl">{page.guidanceTitle}</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {page.guidance.map((item, index) => (
            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-9" key={item.title}>
              <span className="text-xs uppercase tracking-[0.18em] text-white/58">0{index + 1}</span>
              <h3 className="mt-7 [font-family:var(--font-heading)] text-3xl">{item.title}</h3>
              <p className="mt-4 leading-7 text-white/58">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-5 lg:grid-cols-2`}>
          <article className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-7 sm:p-9">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/65">Best for</p>
            <ul className="mt-7 space-y-4">
              {page.bestFor.map((item) => <li className="flex gap-3 leading-7 text-white/70" key={item}><span aria-hidden="true" className="text-emerald-300">✓</span>{item}</li>)}
            </ul>
          </article>
          <article className="rounded-3xl border border-amber-200/15 bg-amber-200/[0.035] p-7 sm:p-9">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/65">Watch for</p>
            <ul className="mt-7 space-y-4">
              {page.watchFor.map((item) => <li className="flex gap-3 leading-7 text-white/70" key={item}><span aria-hidden="true" className="text-amber-200">—</span>{item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Free starting points</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-6xl">Try the direction before going custom.</h2>
          </div>
          <Link className={secondaryButtonClass} href="/themes/free">All free themes</Link>
        </div>
        <div className="theme-grid mt-12">
          {recommendedThemes.map((theme) => <ThemeCard key={theme.slug} theme={theme} />)}
        </div>
      </section>

      <FaqSection faq={page.faq} />

      <section className={sectionClass}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Continue the brief</p>
        <h2 className="mt-4 max-w-3xl [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-6xl">Related Codex theme guides.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {relatedPages.map((related) => (
            <Link className="group rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-white/30" href={seoLandingPath(related)} key={`${related.cluster}-${related.slug}`}>
              <span className="text-xs uppercase tracking-[0.18em] text-white/58">{seoClusters[related.cluster].label}</span>
              <h3 className="mt-5 [font-family:var(--font-heading)] text-3xl">{related.title}</h3>
              <p className="mt-4 line-clamp-3 leading-7 text-white/55">{related.intro}</p>
              <span className="mt-7 inline-block text-sm text-[#b8adff]">Read the guide →</span>
            </Link>
          ))}
        </div>
        <div className="mt-14"><ClusterLinks current={page.cluster} /></div>
      </section>
    </SeoPageShell>
  );
}

export function SeoHubPage({ clusterKey }: { clusterKey: SeoClusterKey }) {
  const cluster = seoClusters[clusterKey];
  const pages = getSeoPagesByCluster(clusterKey);
  const pageUrl = absoluteUrl(cluster.path);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collection`,
        name: cluster.title,
        description: cluster.metaDescription,
        url: pageUrl,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: pages.length,
          itemListElement: pages.map((page, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: page.label,
            url: absoluteUrl(seoLandingPath(page)),
          })),
        },
      },
      faqSchema(cluster.faq),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: cluster.label, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <SeoPageShell
      eyebrow={cluster.eyebrow}
      title={cluster.title}
      description={<p>{cluster.intro}</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: cluster.label }]}
      actions={
        <>
          <Link className={primaryButtonClass} href="/create">Create a custom theme ↗</Link>
          <Link className={secondaryButtonClass} href="/themes/free">Download free themes</Link>
        </>
      }
    >
      <JsonLd data={schema} />

      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">How to use this library</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-5xl">Choose with the finished workspace in mind.</h2>
          </div>
          <div className="space-y-6 text-lg font-light leading-8 text-white/65">
            {cluster.perspective.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Browse every guide</p>
        <h2 className="mt-4 max-w-4xl [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-6xl">{pages.length} specific starting points, each with its own tradeoffs.</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page, index) => (
            <Link className="group flex min-h-72 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-white/30" href={seoLandingPath(page)} key={page.slug}>
              <span className="text-xs uppercase tracking-[0.18em] text-white/58">{String(index + 1).padStart(2, "0")} · {page.label}</span>
              <h3 className="mt-8 [font-family:var(--font-heading)] text-3xl leading-tight">{page.title}</h3>
              <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/55">{page.intro}</p>
              <span className="mt-auto pt-8 text-sm text-[#b8adff]">Open guide →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d0e11]">
        <div className={sectionClass}>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a99cff]">Shared principles</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {cluster.principles.map((item, index) => (
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-9" key={item.title}>
                <span className="text-xs uppercase tracking-[0.18em] text-white/58">0{index + 1}</span>
                <h2 className="mt-7 [font-family:var(--font-heading)] text-3xl">{item.title}</h2>
                <p className="mt-4 leading-7 text-white/58">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FaqSection faq={cluster.faq} />

      <section className={sectionClass}>
        <h2 className="max-w-3xl [font-family:var(--font-heading)] text-4xl tracking-[-0.025em] sm:text-6xl">Build the rest of the theme brief.</h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">Move between visual style, workflow, and platform constraints, then copy the creator prompt into Codex to build and validate the result.</p>
        <div className="mt-10"><ClusterLinks current={clusterKey} /></div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={primaryButtonClass} href="/create">Open the creator guide ↗</Link>
          <Link className={secondaryButtonClass} href="/guides">Read setup guides</Link>
          <Link className={secondaryButtonClass} href="/themes">Browse the theme gallery</Link>
        </div>
      </section>
    </SeoPageShell>
  );
}
