/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallCommand } from "@/components/InstallCommand";
import { ThemeLikeButton } from "@/components/ThemeLikeButton";
import { ThemeCard } from "@/components/ThemeCard";
import { ThemeMockup } from "@/components/ThemeMockup";
import {
  JsonLd,
  SeoPageShell,
  secondaryButtonClass,
  sectionClass,
} from "@/components/SeoPageShell";
import { CLI_AGENT_COMMAND, CLI_COMMAND } from "@/lib/distribution";
import { absoluteUrl } from "@/lib/site";
import { getRelatedThemes, themes } from "@/lib/themes";
import { installCommand } from "@/lib/theme-gallery";
import { safeGetGalleryTheme } from "@/lib/theme-gallery.server";
import { publicPackSafetyStatement, publicPreviewStatement, THEME_DETAIL_COPY } from "@/lib/theme-detail-copy";

type ThemePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;
export const dynamic = "force-dynamic";

function installForCodexPrompt(theme: { name: string; slug: string; version: string }) {
  const themeSpecifier = `${theme.slug}@${theme.version}`;
  const useCommand = `${CLI_AGENT_COMMAND} use ${themeSpecifier}`;
  const statusCommand = `${CLI_AGENT_COMMAND} status --json`;
  const restoreCommand = `${CLI_AGENT_COMMAND} restore`;

  return `Goal
Install and select the validated ${theme.name} theme without interrupting the user's current Codex task.

Context
- Registry theme slug: ${theme.slug}
- Required theme version: ${theme.version}
- Exact immutable specifier: ${themeSpecifier}
- Theme page: ${absoluteUrl(`/themes/${theme.slug}`)}
- The Get Codex Theme CLI installs into its project-owned local library. It is not an official Codex Appearance importer.

Execution
1. Check Node.js availability and require Node.js 22 or newer. If it is unavailable, stop and explain the requirement.
2. Run this exact non-interactive command: ${useCommand}
3. After it succeeds, run: ${statusCommand}
4. Confirm that the status reports activeTheme.id as "${theme.slug}" and activeTheme.version as "${theme.version}".
Run commands through non-interactive shell execution available to you. Do not ask the user to open or operate an interactive terminal.

Verification and safety boundaries
- Keep the exact slug and version above. Do not install an unversioned or different package.
- Require the Registry archive's outer checksum and packaged file checksums to pass. Never bypass, disable, or weaken validation.
- If download, checksum, manifest, version, or installation validation fails, stop and report the exact failure. Do not repair or replace package contents silently.
- Do not add --launch or --restart. Do not restart Codex, close the current task, enable a watchdog, start CDP, or inject a runtime unless the user separately requests it.
- Do not patch the signed Codex application, edit its HTML or application bundle, change system application ownership, or write outside the Get Codex Theme library.
- Do not inspect chats, credentials, API keys, model settings, or unrelated files.

Completion criteria
- The install command exits successfully with checksum verification intact.
- Status confirms ${theme.slug} at version ${theme.version} is installed and selected.
- Report the resolved local theme library path and the final active theme status.
- Provide this rollback command without running it: ${restoreCommand}`;
}

export function generateStaticParams() {
  return themes.map((theme) => ({ slug: theme.slug }));
}

export async function generateMetadata({ params }: ThemePageProps): Promise<Metadata> {
  const { slug } = await params;
  const theme = await safeGetGalleryTheme(slug);
  if (!theme) return {};

  const title = `${theme.name} Free Codex Theme`;
  const description = `${theme.tagline} Preview and install this free ${theme.mode} Codex Desktop theme with responsive artwork and a restore path.`;

  return {
    title,
    description,
    keywords: [
      `${theme.name} Codex theme`,
      `${theme.mode} Codex theme`,
      ...theme.tags.map((tag) => `${tag.toLowerCase()} Codex theme`),
      "free Codex theme",
    ],
    alternates: { canonical: absoluteUrl(`/themes/${theme.slug}`) },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/themes/${theme.slug}`),
      images: [{ url: absoluteUrl(theme.previewUrl), width: 1200, height: 750, alt: `${theme.name} Codex theme artwork` }],
    },
  };
}

export default async function ThemeDetailPage({ params }: ThemePageProps) {
  const { slug } = await params;
  const theme = await safeGetGalleryTheme(slug);
  if (!theme) notFound();

  const related = getRelatedThemes(theme);
  const selectedThemeCommand = installCommand(theme.slug, theme.version);
  const statusCommand = `${CLI_COMMAND} status --json`;
  const launchCommand = `${CLI_COMMAND} launch`;
  const restoreCommand = `${CLI_COMMAND} restore`;
  const assetUrl = (name: "preview" | "screenshotHome" | "screenshotTask") => theme.source === "community" ? `/api/themes/${theme.slug}/assets/${name}` : name === "preview" ? `/theme-packs/${theme.slug}/assets/preview.jpg` : `/theme-packs/${theme.slug}/screenshots/${name === "screenshotHome" ? "home" : "task"}.jpg`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${theme.name} Codex Theme`,
      description: theme.description,
      url: absoluteUrl(`/themes/${theme.slug}`),
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Windows",
      softwareVersion: theme.version,
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: absoluteUrl(`/themes/${theme.slug}`),
      },
      keywords: [...theme.tags, `${theme.mode} Codex theme`].join(", "),
      image: absoluteUrl(theme.previewUrl),
      creator: theme.authors.map((author) => ({ "@type": theme.source === "community" ? "Person" : "Organization", name: author.displayName, url: author.url })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Themes", item: absoluteUrl("/themes") },
        { "@type": "ListItem", position: 3, name: theme.name, item: absoluteUrl(`/themes/${theme.slug}`) },
      ],
    },
  ];

  return (
    <SeoPageShell
      eyebrow={`${theme.mode} Codex theme · Free`}
      title={<>{theme.name}<br /><em className="text-white/62">Codex theme.</em></>}
      description={<p>{theme.description}</p>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: theme.name }]}
      actions={
        <>
          <a className="button button--light" href="#install-theme">Install with Codex <span aria-hidden="true">↓</span></a>
          <Link className={secondaryButtonClass} href="/publish">Publish a theme ↗</Link>
        </>
      }
      compact
    >
      <JsonLd data={schema} />
      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={`${sectionClass} grid gap-10 lg:grid-cols-[1.5fr_.72fr] lg:items-start`}>
          <div className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-2 shadow-2xl shadow-black/50">
            <ThemeMockup theme={theme} className="theme-detail-mockup" renderedPreviewUrl={theme.previewMetadata.kind === "verified-capture" || theme.previewMetadata.renderer === "html-css" ? theme.previewUrl : undefined} />
          </div>
          <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-white/58">Theme profile</p>
            <dl className="mt-7 divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Mode</dt><dd className="capitalize">{theme.mode}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Platforms</dt><dd>macOS + Windows</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Release</dt><dd>{theme.source === "community" ? "Community · validated" : "First-party · validated"}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Coverage</dt><dd>{theme.coverage.profile === "complete" ? "Complete · 100%" : `Focused · ${theme.coverage.effectiveScore}%`}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Version</dt><dd>{theme.version}</dd></div>
              <div className="flex items-start justify-between gap-5 py-4"><dt className="text-white/62">{theme.authors.length > 1 ? "Authors" : "Author"}</dt><dd className="flex flex-col items-end gap-1 text-right">{theme.authors.map((author) => <a className="text-[#b8adff]" href={author.url} key={author.platform} rel="noreferrer" target="_blank">{author.displayName} on {author.platform === "x" ? "X" : "GitHub"} ↗</a>)}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Category</dt><dd className="capitalize">{theme.category}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">Accent</dt><dd className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accent }} />{theme.accent}</dd></div>
              <div className="flex items-center justify-between py-4"><dt className="text-white/62">License</dt><dd>{theme.license}</dd></div>
            </dl>
            {theme.source === "community" ? <p className="mt-6 rounded-2xl border border-[#a99cff]/20 bg-[#a99cff]/[0.07] px-4 py-3 text-sm leading-6 text-white/60">Thanks {theme.authors.map((author, index) => <span key={author.platform}>{index ? " and " : ""}<a className="text-[#b8adff]" href={author.url} rel="noreferrer" target="_blank">{author.displayName}</a></span>)} for contributing this theme to the community.</p> : null}
            <div className="mt-7 flex flex-wrap gap-2">
              {theme.tags.map((tag) => <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55" key={tag}>{tag}</span>)}
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><ThemeLikeButton initialCount={theme.likeCount} slug={theme.slug} /><Link className="text-sm text-white/68 underline decoration-white/25 underline-offset-4 hover:text-white" href={`/report?theme=${encodeURIComponent(theme.slug)}&version=${encodeURIComponent(theme.version)}`}>Report or request removal</Link></div>
          </aside>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0d0e11]">
        <div className={sectionClass}>
          <div className="mb-9 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">{THEME_DETAIL_COPY.layoutPreviewsLabel}</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">{THEME_DETAIL_COPY.layoutPreviewsTitle}</h2>
            <p className="mt-5 leading-7 text-white/60">{publicPreviewStatement(theme.previewMetadata)}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div><p className="mb-3 text-xs uppercase tracking-[0.16em] text-white/58">Home preview</p><figure className="relative"><img className="h-auto w-full rounded-3xl border border-white/10" src={assetUrl("screenshotHome")} width={1200} height={750} loading="lazy" decoding="async" alt={`${theme.name} home preview`} /><figcaption className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-xs text-white/85 backdrop-blur">{theme.previewMetadata.label}</figcaption></figure></div>
            <div><p className="mb-3 text-xs uppercase tracking-[0.16em] text-white/58">Active task preview</p><figure className="relative"><img className="h-auto w-full rounded-3xl border border-white/10" src={assetUrl("screenshotTask")} width={1200} height={750} loading="lazy" decoding="async" alt={`${theme.name} active task preview`} /><figcaption className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-xs text-white/85 backdrop-blur">{theme.previewMetadata.label}</figcaption></figure></div>
          </div>
        </div>
      </section>

      <section className={`${sectionClass} grid gap-12 lg:grid-cols-[1fr_.88fr]`}>
        <article>
          <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">{THEME_DETAIL_COPY.designStoryLabel}</p>
          <h2 className="mt-4 text-balance [font-family:var(--font-heading)] text-5xl sm:text-6xl">{theme.tagline}</h2>
          <div className="mt-7 space-y-5 text-lg font-light leading-8 text-white/60">
            <p>
              {theme.designStory ?? `${theme.name} pairs a ${theme.mode} canvas with a visual direction built around ${theme.tags.map((tag) => tag.toLowerCase()).join(", ")} cues. Its focal point sits away from the main reading field, while the coordinated surface and foreground colors keep tasks and code legible.`}
            </p>
            <p>
              {publicPackSafetyStatement(theme.source)}
            </p>
          </div>
        </article>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
            <span className="text-xs uppercase tracking-[0.18em] text-white/58">{THEME_DETAIL_COPY.includedLabel}</span>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-white/68">
              {THEME_DETAIL_COPY.includedItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
            <span className="text-xs uppercase tracking-[0.18em] text-white/58">{THEME_DETAIL_COPY.compatibilityLabel}</span>
            <p className="mt-5 text-sm leading-7 text-white/60">
              {THEME_DETAIL_COPY.compatibility}
            </p>
            <Link className="mt-5 inline-flex text-sm text-[#b8adff]" href="/guides/codex-appearance-settings">Understand Appearance settings →</Link>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]" id="install-theme">
        <div className={sectionClass}>
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Install with confidence</p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">One command to install and select.</h2>
            <p className="mt-5 max-w-3xl leading-7 text-white/68">The CLI downloads the validated Registry archive, verifies its outer checksum and every packaged file, installs it atomically, and selects it without restarting your current Codex task.</p>
            <div className="mt-7"><InstallCommand codexPrompt={installForCodexPrompt(theme)} command={selectedThemeCommand} /></div>
            <ol className="mt-7 grid gap-3 md:grid-cols-2">
              {[
                ["1. Install and select", selectedThemeCommand, "Downloads the validated release, verifies checksums, and selects it without restarting Codex."],
                ["2. Verify", statusCommand, `Confirm activeTheme.id is ${theme.slug} and the version is ${theme.version}.`],
                ["3. Start visuals if needed", launchCommand, "Run this only when no theme runtime is already active. It does not force a restart."],
                ["4. Restore", restoreCommand, "Returns to the previous theme selection. Save active work before any deliberate restart."],
              ].map(([label, command, detail]) => (
                <li className="rounded-2xl border border-white/10 bg-[#111216] p-5" key={label}>
                  <span className="text-xs uppercase tracking-[0.16em] text-white/58">{label}</span>
                  <code className="mt-4 block overflow-x-auto rounded-xl bg-black/35 p-3 text-xs text-[#d9d3ff]">{command}</code>
                  <p className="mt-3 text-sm leading-6 text-white/52">{detail}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Link className="rounded-3xl border border-white/10 bg-[#111216] p-7 transition hover:-translate-y-1 hover:border-white/25" href="/guides/install-codex-theme-macos">
              <span className="text-xs uppercase tracking-[0.18em] text-white/58">macOS</span>
              <h3 className="mt-8 [font-family:var(--font-heading)] text-4xl">Install on Mac</h3>
              <p className="mt-3 max-w-md leading-7 text-white/55">Apply the theme locally, verify key Codex states, and restore without editing the application bundle.</p>
              <span className="mt-6 inline-block text-sm text-[#b8adff]">Read the macOS guide →</span>
            </Link>
            <Link className="rounded-3xl border border-white/10 bg-[#111216] p-7 transition hover:-translate-y-1 hover:border-white/25" href="/guides/install-codex-theme-windows">
              <span className="text-xs uppercase tracking-[0.18em] text-white/58">Windows</span>
              <h3 className="mt-8 [font-family:var(--font-heading)] text-4xl">Install on Windows</h3>
              <p className="mt-3 max-w-md leading-7 text-white/55">Keep WindowsApps intact while using a local themed launcher and complete restore path.</p>
              <span className="mt-6 inline-block text-sm text-[#b8adff]">Read the Windows guide →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-10 flex items-end justify-between gap-6">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#a99cff]">Keep exploring</p><h2 className="mt-4 [font-family:var(--font-heading)] text-5xl">Related themes.</h2></div>
          <Link className="hidden text-sm text-[#b8adff] sm:inline-flex" href={`/themes/${theme.mode}`}>All {theme.mode} themes →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {related.map((relatedTheme) => <ThemeCard key={relatedTheme.slug} theme={relatedTheme} />)}
        </div>
      </section>
    </SeoPageShell>
  );
}
