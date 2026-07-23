import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  SeoPageShell,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "@/components/SeoPageShell";
import { absoluteUrl, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Open Source Codex Theme Tools",
  description:
    "Explore the open source Get Codex Theme pack specification, validators, local installers, restore tools, free themes, and create-codex-theme Skill.",
  keywords: ["open source Codex themes", "Codex theme GitHub", "Codex theme installer", "Codex theme skill"],
  alternates: { canonical: absoluteUrl("/open-source") },
};

const openParts = [
  ["Theme Pack Schema", "A versioned manifest and documented tokens for palette, focal point, assets, compatibility, and licensing."],
  ["Validator and pack tools", "Checks that themes are complete, safe to distribute, and clear about platform and delivery paths."],
  ["Local installers", "macOS and Windows helpers designed around local state, explicit changes, and complete restoration."],
  ["Eight free themes", "Original templates with redistributable assets, illustrative layout previews, compatibility notes, and attribution records."],
  ["Creator Skill", "An optional Codex Skill for advanced creators who want to generate, inspect, and validate theme packs from source assets."],
  ["Compatibility tests", "Regression checks for manifests, packages, installer safety, and the Codex versions the visual layer supports."],
];

export default function OpenSourcePage() {
  return (
    <SeoPageShell
      eyebrow="Open source foundation"
      title={<>Open source Codex themes.<br /><em className="text-white/62">Inspect the pack.</em></>}
      description={<p>The format, themes, validators, creator Skill, and local installation path are open for inspection and contribution. The hosted site is a free community Registry.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Open Source" }]}
      actions={<><a className={primaryButtonClass} href={site.github} rel="noreferrer" target="_blank">View the GitHub repository ↗</a><Link className={secondaryButtonClass} href="/guides/codex-themes">Read the theme guide</Link></>}
    >
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: "Get Codex Theme",
        description: metadata.description,
        codeRepository: site.github,
        url: absoluteUrl("/open-source"),
        programmingLanguage: ["TypeScript", "JavaScript", "Shell", "PowerShell"],
        runtimePlatform: ["macOS", "Windows"],
        license: "https://opensource.org/license/mit",
      }} />
      <section className={sectionClass}>
        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">What is open</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">The compatibility layer belongs in daylight.</h2></div>
          <p className="text-lg font-light leading-8 text-white/58">Advanced image themes depend on a local compatibility layer outside Codex&apos;s native color settings. Open implementation and restoration tools make that boundary visible.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openParts.map(([title, copy], index) => <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6" key={title}><span className="text-xs tracking-[0.18em] text-white/58">0{index + 1}</span><h3 className="mt-8 [font-family:var(--font-heading)] text-3xl">{title}</h3><p className="mt-4 text-sm leading-7 text-white/55">{copy}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className={`${sectionClass} grid gap-10 lg:grid-cols-[.72fr_1.28fr]`}>
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Repository map</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">Built for contribution.</h2><p className="mt-5 leading-7 text-white/52">The theme standard, CLI, safety runtime, website UI, and validated community Registry live together. Production secrets, resource IDs, and publisher data stay outside Git.</p></div>
          <pre className="overflow-x-auto rounded-3xl border border-white/10 bg-[#08090b] p-6 text-sm leading-7 text-white/62"><code>{`get-codex-theme/
├── apps/website/   gallery, publisher UI, validation APIs
├── packages/       schema, CLI, preview, installer core
├── platforms/      macOS and Windows adapters
├── themes/free/    original redistributable themes
├── plugins/        Codex plugin and creator/manager Skills
├── docs/           spec, security, compatibility
└── tests/          validation and regression coverage`}</code></pre>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7"><p className="text-xs uppercase tracking-[0.18em] text-white/58">For theme creators</p><h2 className="mt-8 [font-family:var(--font-heading)] text-4xl">Use the Skill.</h2><p className="mt-4 leading-7 text-white/55">The optional create-codex-theme Skill helps turn artwork into a validated pack. It is not required to browse, download, or install a theme.</p><a className="mt-6 inline-flex text-sm text-[#b8adff]" href={`${site.github}/tree/main/plugins/get-codex-theme/skills/create-codex-theme`}>Explore the Skill →</a></article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7"><p className="text-xs uppercase tracking-[0.18em] text-white/58">For maintainers</p><h2 className="mt-8 [font-family:var(--font-heading)] text-4xl">Test the boundary.</h2><p className="mt-4 leading-7 text-white/55">Contributions should preserve signed application packages, bind visual services to loopback only, describe every local change, and include a complete restoration path.</p><a className="mt-6 inline-flex text-sm text-[#b8adff]" href={`${site.github}/blob/main/CONTRIBUTING.md`}>Read contribution guidance →</a></article>
        </div>
      </section>
    </SeoPageShell>
  );
}
