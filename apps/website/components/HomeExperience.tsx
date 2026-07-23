"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ConceptTheme } from "@/lib/concept-themes";
import type { GalleryTheme } from "@/lib/theme-gallery";
import { HomeThemeStream } from "./HomeThemeStream";
import { SiteHeader } from "./SiteHeader";
import { ThemeMockup } from "./ThemeMockup";

export function HomeExperience({ themes, concepts }: { themes: GalleryTheme[]; concepts: ConceptTheme[] }) {
  const reducedMotion = useReducedMotion();
  const showcaseTheme = concepts.find((theme) => theme.slug === "pocket-robot-cat") ?? concepts[0] ?? themes[0];
  const showcaseBackground = "previewImage" in showcaseTheme && showcaseTheme.previewImage ? `url("${showcaseTheme.previewImage}")` : showcaseTheme.gradient;
  const reveal = (delay = 0) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 24, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.75, delay, ease: "easeOut" as const },
  });

  return (
    <main className="home-shell">
      <SiteHeader transparent />
      <section className="home-hero">
        <div className="cinematic-field" aria-hidden="true">
          <div className="cinematic-orb cinematic-orb--one" />
          <div className="cinematic-orb cinematic-orb--two" />
          <div className="cinematic-grid" />
        </div>
        <div className="hero-content">
          <motion.div className="hero-badge liquid-glass" {...reveal(0.12)}>
            <strong>New</strong><span>Free themes · No account required</span>
          </motion.div>
          <motion.h1 {...reveal(0.22)}>
            Make Codex feel<br /><em>like yours.</em>
          </motion.h1>
          <motion.p className="hero-copy" {...reveal(0.36)}>
            Browse installable first-party and community Codex themes, credit every creator, and install a
            validated pack without creating an account.
          </motion.p>
          <motion.div className="hero-actions" {...reveal(0.5)}>
            <Link className="button button--glass" href="#theme-directory">Browse Installable Themes <span>↗</span></Link>
            <Link className="text-link" href="/publish">Publish Your Theme <span>→</span></Link>
          </motion.div>
          <motion.div className="hero-stats" {...reveal(0.62)}>
            <div className="liquid-glass"><span>{String(concepts.length).padStart(2, "0")}</span><p>Concept directions</p></div>
            <div className="liquid-glass"><span>{String(themes.length).padStart(2, "0")}</span><p>Validated theme packs</p></div>
          </motion.div>
        </div>
        <motion.div className="hero-showcase liquid-glass-strong" {...reveal(0.46)}>
          <ThemeMockup backgroundCss={showcaseBackground} statusLabel="Concept preview" theme={showcaseTheme} />
          <div className="showcase-caption">
            <span>{showcaseTheme.name}</span><span>Concept preview · {showcaseTheme.mode}</span>
          </div>
        </motion.div>
        <motion.div className="trust-strip" {...reveal(0.74)}>
          {['Local-first','Reversible','macOS + Windows','Open-source installer'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </motion.div>
      </section>

      <HomeThemeStream concepts={concepts} themes={themes} />

      <section className="home-capabilities">
        <div className="capability-glow" aria-hidden="true" />
        <div className="capability-heading">
          <span className="eyebrow">{"// FROM IMAGE TO THEME"}</span>
          <h2>Pick a look.<br /><em>Make it yours.</em></h2>
          <p>Everything between inspiration and a validated community release, with free downloads for everyone.</p>
        </div>
        <div className="capability-grid">
          <article className="liquid-glass capability-card">
            <div className="capability-index">01</div>
            <div className="tag-row"><span>Free</span><span>Dark</span><span>Light</span></div>
            <div><h3>Browse</h3><p>Choose an installable theme with coordinated tokens and clear Home and active-task previews.</p></div>
            <Link href="/themes/free">Explore free themes →</Link>
          </article>
          <article className="liquid-glass capability-card">
            <div className="capability-index">02</div>
            <div className="tag-row"><span>CLI</span><span>Schema</span><span>Skill</span></div>
            <div><h3>Create</h3><p>Copy one guided prompt into Codex, choose a visual path, and let the CLI build and validate the pack.</p></div>
            <Link href="/create">Open creator guide →</Link>
          </article>
          <article className="liquid-glass capability-card">
            <div className="capability-index">03</div>
            <div className="tag-row"><span>CLI</span><span>Validate</span><span>Publish</span></div>
            <div><h3>Share</h3><p>Let the CLI submit the exact release you confirmed. The server validates it again and publishes it automatically.</p></div>
            <Link href="/publish">Publish with Codex →</Link>
          </article>
        </div>
        <div className="home-footer-line">
          <span>Get Codex Theme © 2026</span>
          <span>Unofficial · Not affiliated with OpenAI</span>
          <Link href="/open-source">View open source</Link>
        </div>
      </section>
    </main>
  );
}
