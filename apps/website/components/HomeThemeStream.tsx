"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ConceptTheme } from "@/lib/concept-themes";
import { themeCategories, type GalleryTheme, type ThemeCategory } from "@/lib/theme-gallery";
import type { CodexTheme } from "@/lib/themes";
import { ThemeLikeButton } from "./ThemeLikeButton";
import { ThemeMockup } from "./ThemeMockup";
import styles from "./HomeThemeStream.module.css";

const BATCH_SIZE = 12;

const filters = [
  { id: "all", label: "All" },
  ...themeCategories,
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const;

type FilterId = (typeof filters)[number]["id"];
type SortId = "popular" | "newest" | "name";
type DirectoryScope = "packs" | "concepts";

type DirectoryItem = {
  theme: CodexTheme;
  href: string;
  kind: "first-party" | "community" | "concept";
  category: ThemeCategory;
  previewReady: boolean;
  previewKind: "illustrative" | "verified-capture";
  previewRenderer?: "html-css" | "native-capture" | "artwork";
  previewUrl?: string;
  backgroundCss?: string;
  brandConceptSlug?: string;
  authorName: string;
  authorUrl: string;
  authorPlatform: "github" | "x";
  authors: GalleryTheme["authors"];
  likeCount: number;
  publishedAt?: string | null;
  coverage?: GalleryTheme["coverage"];
};

function categoryForConcept(theme: ConceptTheme): ThemeCategory {
  if (theme.category === "Mascots") return "characters";
  if (theme.category === "Brand concepts") return "brands";
  return theme.category.toLowerCase() as ThemeCategory;
}

function matchesFilter(item: DirectoryItem, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "dark" || filter === "light") return item.theme.mode === filter;
  return item.category === filter;
}

export function HomeThemeStream({ themes, concepts }: { themes: GalleryTheme[]; concepts: ConceptTheme[] }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<DirectoryScope>("packs");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("popular");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const directory = useMemo<DirectoryItem[]>(() => [
    ...themes.map((theme) => ({
      theme,
      href: `/themes/${theme.slug}`,
      kind: theme.source,
      category: theme.category,
      previewReady: true,
      previewKind: theme.previewMetadata.kind,
      previewRenderer: theme.previewMetadata.renderer,
      previewUrl: theme.previewUrl,
      backgroundCss: `url("${theme.previewUrl}")`,
      authorName: theme.authorName,
      authorUrl: theme.authorUrl,
      authorPlatform: theme.authorPlatform,
      authors: theme.authors,
      likeCount: theme.likeCount,
      publishedAt: theme.publishedAt,
      coverage: theme.coverage,
    })),
    ...concepts.map((theme) => ({
      theme,
      href: `/themes/concepts/${theme.slug}`,
      kind: "concept" as const,
      category: categoryForConcept(theme),
      previewReady: theme.previewReady,
      previewKind: "illustrative" as const,
      backgroundCss: theme.previewImage ? `url("${theme.previewImage}")` : theme.gradient,
      brandConceptSlug: theme.inspiration ? theme.slug : undefined,
      authorName: "Get Codex Theme",
      authorUrl: "https://github.com/ViisOpen/get-codex-theme",
      authorPlatform: "github" as const,
      authors: [{ platform: "github" as const, username: "ViisOpen", displayName: "Get Codex Theme", url: "https://github.com/ViisOpen/get-codex-theme" }],
      likeCount: 0,
    })),
  ], [concepts, themes]);

  const filteredThemes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matching = directory.filter((item) => {
      if (scope === "packs" ? item.kind === "concept" : item.kind !== "concept") return false;
      if (!matchesFilter(item, activeFilter)) return false;
      if (!normalizedQuery) return true;
      const { theme } = item;
      const searchableText = [theme.name, theme.tagline, theme.description, item.category, item.authorName, ...theme.tags].join(" ").toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
    return matching.sort((a, b) => {
      if (sort === "name") return a.theme.name.localeCompare(b.theme.name);
      if (sort === "newest") return Date.parse(b.publishedAt ?? "1970-01-01") - Date.parse(a.publishedAt ?? "1970-01-01") || a.theme.order - b.theme.order;
      return b.likeCount - a.likeCount || Number(a.kind === "concept") - Number(b.kind === "concept") || a.theme.order - b.theme.order;
    });
  }, [activeFilter, directory, query, scope, sort]);

  const visibleThemes = filteredThemes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredThemes.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((current) => Math.min(current + BATCH_SIZE, filteredThemes.length));
    }, { rootMargin: "0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeFilter, filteredThemes.length, hasMore, query, sort]);

  function handleQuery(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setVisibleCount(BATCH_SIZE);
  }

  function chooseFilter(filter: FilterId) {
    setActiveFilter(filter);
    setVisibleCount(BATCH_SIZE);
  }

  function chooseScope(nextScope: DirectoryScope) {
    setScope(nextScope);
    setActiveFilter("all");
    setQuery("");
    setVisibleCount(BATCH_SIZE);
  }

  function resetDirectory() {
    setQuery("");
    setScope("packs");
    setActiveFilter("all");
    setSort("popular");
    setVisibleCount(BATCH_SIZE);
  }

  return (
    <section className={styles.section} id="theme-directory" aria-labelledby="theme-directory-title">
      <div className={styles.intro}>
        <div><p className={styles.kicker}>Installable themes and visual directions</p><h2 className={styles.title} id="theme-directory-title">Find a workspace<br /><em>worth opening.</em></h2></div>
        <p className={styles.description}>Start with installable Registry packs. Switch to Concepts when you want visual inspiration that is clearly separated from downloadable releases.</p>
      </div>

      <div className={styles.scopePicker} aria-label="Choose directory type" role="group">
        <button aria-pressed={scope === "packs"} className={scope === "packs" ? styles.scopeActive : styles.scopeButton} onClick={() => chooseScope("packs")} type="button"><strong>Installable packs</strong><span>{themes.length} ready to use</span></button>
        <button aria-pressed={scope === "concepts"} className={scope === "concepts" ? styles.scopeActive : styles.scopeButton} onClick={() => chooseScope("concepts")} type="button"><strong>Concept directions</strong><span>{concepts.length} for inspiration</span></button>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField} htmlFor="home-theme-search">
          <span>Search themes or creators</span>
          <input id="home-theme-search" onChange={handleQuery} placeholder="Try “Google”, “playful”, or a creator" type="search" value={query} />
        </label>
        <label className={styles.sortField} htmlFor="home-theme-sort"><span>Sort</span><select id="home-theme-sort" onChange={(event) => { setSort(event.target.value as SortId); setVisibleCount(BATCH_SIZE); }} value={sort}><option value="popular">Popular</option><option value="newest">Newest</option><option value="name">Name A–Z</option></select></label>
        <div className={styles.filters} aria-label="Filter themes">
          {filters.map((filter) => <button aria-controls="home-theme-grid" aria-pressed={activeFilter === filter.id} className={activeFilter === filter.id ? styles.filterActive : styles.filter} key={filter.id} onClick={() => chooseFilter(filter.id)} type="button">{filter.label}</button>)}
        </div>
        <span className={styles.filterHint} aria-hidden="true">Swipe for more filters →</span>
      </div>

      <div className={styles.resultBar} aria-live="polite" aria-atomic="true"><span>{filteredThemes.length} {scope === "packs" ? (filteredThemes.length === 1 ? "installable pack" : "installable packs") : (filteredThemes.length === 1 ? "concept direction" : "concept directions")}</span><span>{filteredThemes.length ? `Showing ${visibleThemes.length} of ${filteredThemes.length}` : "Try another category or search"}</span></div>

      {visibleThemes.length > 0 ? (
        <div className={styles.grid} id="home-theme-grid">
          {visibleThemes.map((item) => {
            const { theme } = item;
            const status = item.kind === "community" ? "Community pack" : item.kind === "first-party" ? "Validated pack" : item.previewReady ? "Concept preview" : "Artwork queued";
            return (
              <article className={styles.card} key={`${item.kind}-${theme.slug}`} style={{ "--theme-card-accent": theme.accent } as CSSProperties}>
                <Link aria-label={`View the ${theme.name} Codex theme`} className={styles.cardLink} href={item.href}>
                  <div className={styles.preview}><ThemeMockup backgroundCss={item.backgroundCss} brandConceptSlug={item.brandConceptSlug} className={styles.mockup} renderedPreviewUrl={item.previewKind === "verified-capture" || item.previewRenderer === "html-css" ? item.previewUrl : undefined} statusLabel={status} theme={theme} /></div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}><span className={styles.mode}><i style={{ background: theme.accent }} />{theme.mode} · {status}{item.coverage ? ` · ${item.coverage.profile === "complete" ? "Complete" : `Focused ${item.coverage.effectiveScore}%`}` : ""}</span><span aria-hidden="true">↗</span></div>
                    <h3>{theme.name}</h3><p>{theme.tagline}</p>
                    <ul className={styles.tags} aria-label={`${theme.name} styles`}>{theme.tags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}</ul>
                  </div>
                </Link>
                <div className={styles.cardFooter}>
                  <span className={styles.authorLinks}>By {item.authors.map((author, index) => <span key={author.platform}>{index ? " · " : ""}<a href={author.url} rel="noreferrer" target="_blank">{author.displayName} on {author.platform === "x" ? "X" : "GitHub"} <span aria-hidden="true">↗</span></a></span>)}</span>
                  {item.kind !== "concept" ? <ThemeLikeButton compact initialCount={item.likeCount} slug={theme.slug} /> : <span className={styles.conceptLabel}>Concept</span>}
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className={styles.empty} role="status"><h3>No {scope === "packs" ? "pack" : "concept"} matches that search.</h3><p>Clear the filters or try a broader creator, mood, or style.</p><button onClick={resetDirectory} type="button">Show installable packs</button></div>}

      {hasMore ? <div className={styles.loadArea}><button aria-controls="home-theme-grid" className={styles.loadMore} onClick={() => setVisibleCount((current) => Math.min(current + BATCH_SIZE, filteredThemes.length))} type="button">Load {Math.min(BATCH_SIZE, filteredThemes.length - visibleCount)} more themes</button><span>More themes load automatically as you scroll.</span><div className={styles.sentinel} ref={sentinelRef} aria-hidden="true" /></div> : null}

      <div className={styles.directoryFooter}><span>Community releases appear only after automated package, identity, checksum, and rights-record validation.</span><Link href="/publish">Publish with the CLI →</Link></div>
    </section>
  );
}
