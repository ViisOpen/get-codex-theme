import type { Metadata } from "next";
import Link from "next/link";
import { CreateThemeWorkflow } from "@/components/CreateThemeWorkflow";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { getConceptTheme } from "@/lib/concept-themes";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Create a Free Codex Theme",
  description: "Describe a Codex Desktop theme once, then let Codex create its artwork, pack, previews, validation, local installation, and restore evidence.",
  alternates: { canonical: absoluteUrl("/create") },
};

export default async function CreateThemePage({ searchParams }: { searchParams: Promise<{ direction?: string }> }) {
  const { direction } = await searchParams;
  const concept = direction ? getConceptTheme(direction) : undefined;
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Create a Codex theme with Codex",
    step: [
      "Describe the visual intent on the website",
      "Paste the generated prompt into Codex once",
      "Let Codex create, validate, install, and restore-test the local pack",
      "Choose a verified identity and publish through one agent session",
    ],
  };
  return (
    <SeoPageShell
      eyebrow="AI-assisted creator workflow"
      title={<>Describe it once.<br /><em className="text-white/62">Let Codex build it.</em></>}
      description={<p>The public Create page and Creator Account now use the same workflow. You provide the intent and any unavoidable rights information; Codex chooses the technical implementation and completes the local checks.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Create" }]}
      actions={<><a className={primaryButtonClass} href="#create-with-codex">Start Create</a><Link className={secondaryButtonClass} href="/publish">I already have a finished pack →</Link></>}
    >
      <JsonLd data={schema} />
      {concept ? <section className="border-b border-white/10 bg-[#0d0e11]"><div className={sectionClass}><div className="rounded-3xl border border-[#8e7cff]/30 bg-[#8e7cff]/10 p-7"><p className="text-xs uppercase tracking-[0.2em] text-[#b8adff]">Starting direction loaded</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">{concept.name}</h2><p className="mt-4 max-w-3xl leading-7 text-white/62">{concept.artDirection} {concept.workspaceFit}</p></div></div></section> : null}
      <CreateThemeWorkflow className={sectionClass} startingDirection={concept?.name} />
      <section className={sectionClass}>
        <div className="mb-12 max-w-3xl"><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">What happens automatically</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl sm:text-6xl">AI does the implementation work.</h2></div>
        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7"><span className="text-xs text-white/58">01</span><h3 className="mt-8 [font-family:var(--font-heading)] text-4xl">Design and artwork</h3><p className="mt-4 leading-7 text-white/55">Codex derives the id, name, mode, component scope, palette, original background, responsive crops, and factual public copy from the brief.</p></article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7"><span className="text-xs text-white/58">02</span><h3 className="mt-8 [font-family:var(--font-heading)] text-4xl">Validate and test</h3><p className="mt-4 leading-7 text-white/55">It renders privacy-safe previews, checks coverage and assets, packages the release, performs the authorized local install, verifies identity, and tests restore.</p></article>
          <article className="rounded-3xl border border-[#8e7cff]/35 bg-[#8e7cff]/10 p-7"><span className="text-xs text-[#c7beff]">03</span><h3 className="mt-8 [font-family:var(--font-heading)] text-4xl">Confirm and publish</h3><p className="mt-4 leading-7 text-white/68">Choose a connected GitHub profile or provide your public X profile page, paste one Session Prompt into Codex, confirm the exact page once, and let the waiting command publish automatically.</p><Link className="mt-6 inline-flex text-sm text-[#d2caff]" href="/publish">Open Publish →</Link></article>
        </div>
      </section>
    </SeoPageShell>
  );
}
