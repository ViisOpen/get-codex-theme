import Link from "next/link";
import { SeoPageShell, primaryButtonClass, secondaryButtonClass, sectionClass } from "@/components/SeoPageShell";

export default function NotFoundPage() {
  return (
    <SeoPageShell
      eyebrow="404 · Page not found"
      title={<>This path went<br /><em className="text-white/62">back to default.</em></>}
      description={<p>The page may have moved, but the themes and creator guide are still right where they should be.</p>}
      actions={<><Link className={primaryButtonClass} href="/themes">Browse free themes</Link><Link className={secondaryButtonClass} href="/">Return home</Link></>}
    >
      <section className={sectionClass}>
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-10">
          <h2 className="[font-family:var(--font-heading)] text-4xl">Popular destinations</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Link className="rounded-2xl border border-white/10 p-5 text-white/65 transition hover:border-white/30 hover:text-white" href="/create">Custom theme creator guide →</Link>
            <Link className="rounded-2xl border border-white/10 p-5 text-white/65 transition hover:border-white/30 hover:text-white" href="/guides/codex-themes">Codex themes guide →</Link>
            <Link className="rounded-2xl border border-white/10 p-5 text-white/65 transition hover:border-white/30 hover:text-white" href="/open-source">Open source tools →</Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
