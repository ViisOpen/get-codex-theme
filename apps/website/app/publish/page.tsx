import type { Metadata } from "next";
import { PublisherPortal } from "@/components/PublisherPortal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Publish a Codex Theme", description: "Choose one public contributor profile, give Codex one publishing session, confirm the exact draft, and let the same CLI command publish it." };

export default function PublishPage() {
  return <main className="page-shell publisher-page"><SiteHeader /><header className="publisher-hero"><span className="eyebrow">COMMUNITY REGISTRY</span><h1>One identity.<br /><em>One publishing session.</em></h1><p>Choose a connected GitHub profile or provide your public X profile page, then paste one Session Prompt into Codex. It prepares the private draft, waits while you confirm the exact page, and publishes automatically.</p><div className="publisher-flow"><span>Choose identity</span><i>→</i><span>Confirm draft</span><i>→</i><span>Automatic publish</span></div></header><PublisherPortal /><SiteFooter /></main>;
}
