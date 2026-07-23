import type { Metadata } from "next";
import { ReportForm } from "@/components/ReportForm";
import { SeoPageShell, sectionClass } from "@/components/SeoPageShell";

export const metadata: Metadata = {
  title: "Report a Theme or Request Removal",
  description: "Privately report copyright, trademark, privacy, abuse, or removal concerns about a Get Codex Theme listing.",
  robots: { index: false, follow: false },
};

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ theme?: string; version?: string }> }) {
  const params = await searchParams;
  const themeId = typeof params.theme === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.theme) ? params.theme : "";
  const version = typeof params.version === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(params.version) ? params.version : "";
  return (
    <SeoPageShell
      eyebrow="Private rights and safety report"
      title={<>Report a theme.<br /><em className="text-white/68">Request correction or removal.</em></>}
      description={<p>Use this private form for copyright, trademark, privacy, abusive content, or takedown requests. For ordinary product bugs, use the public issue tracker instead.</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact", href: "/contact" }, { label: "Report" }]}
      compact
    >
      <section className={`${sectionClass} max-w-4xl`}>
        <ReportForm initialThemeId={themeId} initialVersion={version} />
      </section>
    </SeoPageShell>
  );
}
