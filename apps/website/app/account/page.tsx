import type { Metadata } from "next";
import Link from "next/link";
import { CreateThemeWorkflow } from "@/components/CreateThemeWorkflow";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Creator Account",
  description: "Use the same AI-assisted Codex theme creation workflow available on the public Create page.",
  robots: { index: false, follow: false },
};

export default function CreatorAccountPage() {
  return <main className="page-shell publisher-page account-page">
    <SiteHeader />
    <header className="publisher-hero account-hero">
      <span className="eyebrow">CREATOR ACCOUNT</span>
      <h1>Describe it once.<br /><em>Let Codex build it.</em></h1>
      <p>This is the same Create workflow used on the public page. Give Codex one creative brief; it derives the technical settings, artwork, listing copy, previews, validation, reversible local install, and restore evidence.</p>
      <div className="publisher-flow"><span>Describe</span><i>→</i><span>Create + test</span><i>→</i><span>Publish session</span></div>
      <div className="account-hero-actions"><a className="button button--dark" href="#account-wizard">Start Create</a><Link className="button" href="/publish">I already have a finished pack →</Link></div>
    </header>
    <CreateThemeWorkflow className="" id="account-wizard" returnTo="/account" />
    <SiteFooter />
  </main>;
}
