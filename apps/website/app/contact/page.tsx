import type { Metadata } from "next";
import { JsonLd, SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";
import { absoluteUrl, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Get Codex Theme",
  description: "Get help with a Codex theme pack, report a bug, propose a theme, or privately disclose a security issue.",
  alternates: { canonical: absoluteUrl("/contact") },
};

export default function ContactPage() {
  return (
    <SeoPageShell
      eyebrow="Support and contact"
      title={<>Talk to the<br /><em className="text-white/62">theme maintainers.</em></>}
      description={<p>Use the public issue tracker for reproducible product questions, the private report form for rights or removal requests, and the advisory form for security-sensitive disclosures. Never post credentials, chats, card details, or customer artwork publicly.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      actions={<><a className={primaryButtonClass} href="/report">Private rights or removal report</a><a className={secondaryButtonClass} href={`${site.github}/issues/new/choose`}>Open a product issue ↗</a><a className={secondaryButtonClass} href={`${site.github}/security/advisories/new`}>Security advisory ↗</a></>}
      compact
    >
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Get Codex Theme", url: absoluteUrl("/contact") }} />
      <section className={sectionClass}>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Product support", "Include the theme name, platform, Codex version, and exact reproduction steps. Do not attach private workspaces."],
            ["Theme publishing", "Use the publisher portal to create a scoped prompt. Codex and the CLI validate, package, and submit the release—there is no browser ZIP upload."],
            ["Security", "Use GitHub Private Vulnerability Reporting for anything involving local files, credentials, or the debugging endpoint."],
          ].map(([title, copy]) => <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7" key={title}><h2 className="[font-family:var(--font-heading)] text-4xl">{title}</h2><p className="mt-4 leading-7 text-white/60">{copy}</p></article>)}
        </div>
      </section>
    </SeoPageShell>
  );
}
