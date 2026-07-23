import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Open Branded Codex Themes",
  description: "Create and publish a free branded Codex theme with approved assets, responsive artwork, creator attribution, and the open theme-pack standard.",
  alternates: { canonical: absoluteUrl("/brand-themes") },
};

const steps = [
  ["Define the system", "Choose approved colors, typography direction, mood, and the brand assets you are allowed to redistribute."],
  ["Keep marks deterministic", "Store the approved logo as a separate pack asset. Never ask an image model to redraw a protected wordmark."],
  ["Validate every state", "Prepare Home and active-task previews plus responsive evidence, then run the strict public validator."],
  ["Publish with credit", "Connect a GitHub or X author profile, then let the CLI submit the confirmed release. Published packs stay free and creator-attributed."],
];

export default function BrandThemesPage() {
  return (
    <SeoPageShell eyebrow="Open brand theme workflow" title={<>Branded Codex themes.<br /><em className="text-white/62">Free to publish and install.</em></>} description={<p>Bring a company, product, or creator identity into the Codex workspace using authorized assets and the same automatically validated format as every community theme.</p>} breadcrumbs={[{ label: "Home", href: "/" }, { label: "Brand Themes" }]} actions={<><Link className={primaryButtonClass} href="/create">Create a brand theme</Link><Link className={secondaryButtonClass} href="/publish">Publish a finished pack →</Link></>}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "HowTo", name: "Create a branded Codex theme", step: steps.map(([name, text]) => ({ "@type": "HowToStep", name, text })) }} />
      <section className="border-b border-white/10 bg-[#0d0e11]"><div className={`${sectionClass} grid gap-5 md:grid-cols-3`}>{[["Creator identity", "A recognizable workspace for screenshots, tutorials, launches, and social content."], ["Product brand", "Authorized colors and separate logo assets without generative redraws."], ["Open distribution", "One validated pack, one install command, and permanent author credit."]].map(([title, copy]) => <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7" key={title}><h2 className="[font-family:var(--font-heading)] text-4xl">{title}</h2><p className="mt-4 leading-7 text-white/68">{copy}</p></article>)}</div></section>
      <section className={sectionClass}><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">A safe release workflow</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">Brand assets enter at the right moment.</h2><p className="mt-6 leading-7 text-white/52">The community Registry is free. Automatic validation checks installability, declared rights, immutable versions, and archive safety before publication.</p></div><ol className="space-y-4">{steps.map(([title, copy], index) => <li className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:grid-cols-[3rem_1fr]" key={title}><span className="text-xs tracking-[0.18em] text-[#a99cff]">0{index + 1}</span><div><h3 className="[font-family:var(--font-heading)] text-3xl">{title}</h3><p className="mt-3 leading-7 text-white/55">{copy}</p></div></li>)}</ol></div></section>
    </SeoPageShell>
  );
}
