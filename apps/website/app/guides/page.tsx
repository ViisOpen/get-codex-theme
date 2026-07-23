import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  SeoPageShell,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "@/components/SeoPageShell";
import { guides } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Codex Theme Guides",
  description:
    "Practical Codex Desktop customization guides covering themes, appearance settings, image backgrounds, macOS and Windows installation, and safe restoration.",
  keywords: ["Codex theme guide", "customize Codex", "install Codex theme", "Codex appearance settings"],
  alternates: { canonical: absoluteUrl("/guides") },
};

const clusters = [
  {
    label: "Start here",
    description: "Understand what Codex themes change and choose the right customization path.",
    slugs: ["codex-themes", "customize-codex", "codex-appearance-settings"],
  },
  {
    label: "Install safely",
    description: "Apply, verify, and restore a theme without modifying the signed application package.",
    slugs: ["change-codex-theme", "install-codex-theme-macos", "install-codex-theme-windows"],
  },
  {
    label: "Design it well",
    description: "Prepare artwork for desktop layouts and use the clearest language when sharing it.",
    slugs: ["codex-background-image", "codex-theme-vs-skin-vs-background"],
  },
];

export default function GuidesPage() {
  return (
    <SeoPageShell
      eyebrow="Codex customization guides"
      title={<>Codex theme guides.<br /><em className="text-white/62">Make it dependable.</em></>}
      description={<p>Clear, practical guidance for changing how Codex looks without losing readability, compatibility, or a safe path back.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]}
      actions={<><Link className={primaryButtonClass} href="/guides/codex-themes">Read the complete guide</Link><Link className={secondaryButtonClass} href="/themes">Browse free themes</Link></>}
    >
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Codex Theme Guides",
        description: metadata.description,
        url: absoluteUrl("/guides"),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: guides.length,
          itemListElement: guides.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.title, url: absoluteUrl(`/guides/${guide.slug}`) })),
        },
      }} />
      <section className={sectionClass}>
        <div className="grid gap-12">
          {clusters.map((cluster, clusterIndex) => (
            <section className="grid gap-6 border-b border-white/10 pb-12 last:border-0 md:grid-cols-[.62fr_1.38fr]" key={cluster.label}>
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">0{clusterIndex + 1} · {cluster.label}</span>
                <p className="mt-5 max-w-sm leading-7 text-white/52">{cluster.description}</p>
              </div>
              <div className="grid gap-4">
                {cluster.slugs.map((slug) => {
                  const guide = guides.find((item) => item.slug === slug);
                  if (!guide) return null;
                  return (
                    <Link
                      className="group grid gap-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-0.5 hover:border-white/25 sm:grid-cols-[1fr_auto] sm:items-center"
                      href={`/guides/${guide.slug}`}
                      key={guide.slug}
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/58">{guide.keyword} · {guide.readTime}</p>
                        <h2 className="mt-3 text-balance [font-family:var(--font-heading)] text-3xl sm:text-4xl">{guide.shortTitle}</h2>
                        <p className="mt-3 max-w-2xl leading-7 text-white/55">{guide.description}</p>
                      </div>
                      <span className="text-[#b8adff] transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center`}>
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Ready to try it?</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">From guide to working theme.</h2></div>
          <div><p className="text-lg font-light leading-8 text-white/60">Start with an original free template, or copy the creator prompt into Codex and build from your own local image. No account is required to create or validate locally.</p><div className="mt-7 flex flex-wrap gap-3"><Link className={primaryButtonClass} href="/create">Create a theme</Link><Link className={secondaryButtonClass} href="/open-source">View the open source tools</Link></div></div>
        </div>
      </section>
    </SeoPageShell>
  );
}
