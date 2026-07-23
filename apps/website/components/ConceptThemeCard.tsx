import Link from "next/link";
import type { ConceptTheme } from "@/lib/concept-themes";
import { ThemeMockup } from "./ThemeMockup";

export function ConceptThemeCard({ theme }: { theme: ConceptTheme }) {
  const backgroundCss = theme.previewImage ? `url("${theme.previewImage}")` : theme.gradient;

  return (
    <article className="group min-w-0" style={{ contentVisibility: "auto", containIntrinsicSize: "0 520px" }}>
      <Link
        aria-label={`View the ${theme.name} Codex concept preview`}
        className="block overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e11] transition duration-300 hover:-translate-y-1 hover:border-white/25"
        href={`/themes/concepts/${theme.slug}`}
      >
        <div className="border-b border-white/10 bg-black/20 p-2">
          <ThemeMockup
            backgroundCss={backgroundCss}
            brandConceptSlug={theme.inspiration ? theme.slug : undefined}
            className="!rounded-xl !shadow-none"
            statusLabel={theme.inspiration ? "Unofficial concept" : theme.previewReady ? "Concept preview" : "Direction reserved"}
            theme={theme}
          />
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.15em] text-white/62">
            <span>{theme.category}</span>
            <span className={theme.previewReady ? "text-[#b8adff]" : "text-white/58"}>{theme.previewReady ? "Preview ready" : "Artwork queued"}</span>
          </div>
          <h3 className="mt-7 text-balance [font-family:var(--font-heading)] text-3xl leading-none sm:text-4xl">{theme.name}</h3>
          <p className="mt-3 min-h-11 text-sm leading-6 text-white/58">{theme.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {theme.tags.slice(0, 3).map((tag) => <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/50" key={tag}>{tag}</span>)}
          </div>
        </div>
      </Link>
    </article>
  );
}
