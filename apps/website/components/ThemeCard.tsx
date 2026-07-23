import Link from "next/link";
import type { CodexTheme } from "@/lib/themes";
import { ThemeMockup } from "./ThemeMockup";

export function ThemeCard({ theme }: { theme: CodexTheme }) {
  return (
    <article className="theme-card">
      <Link href={`/themes/${theme.slug}`} aria-label={`View ${theme.name}`}>
        <ThemeMockup statusLabel="Pack available" theme={theme} />
      </Link>
      <div className="theme-card-copy">
        <div>
          <span className={`mode-dot mode-dot--${theme.mode}`} />
          <span className="eyebrow">{theme.mode} · free</span>
        </div>
        <h2><Link href={`/themes/${theme.slug}`}>{theme.name}</Link></h2>
        <p>{theme.tagline}</p>
        <div className="tag-row">
          {theme.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </article>
  );
}
