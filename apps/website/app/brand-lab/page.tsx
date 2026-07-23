import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeMockup } from "@/components/ThemeMockup";
import { getConceptTheme } from "@/lib/concept-themes";

export const metadata: Metadata = {
  title: "Immersive Tech Brand Theme Lab",
  description: "Eleven integrated tech-brand system previews for Codex Desktop themes.",
  robots: { index: false, follow: false },
};

const cases = [
  {
    slug: "nvidia-neon-compute",
    label: "NVIDIA",
    premise: "AI Factory",
    description: "The logo, CUDA language, GPU load, Blackwell references, and NVIDIA green all behave as one accelerated-computing workspace.",
  },
  {
    slug: "google-spectrum",
    label: "Google",
    premise: "Material Workspace",
    description: "Google’s wordmark, search behavior, product palette, Gemini prompt, and Material surfaces become the actual Codex home state.",
  },
  {
    slug: "meta-horizon",
    label: "Meta",
    premise: "Horizon Studio",
    description: "Meta’s identity becomes a spatial workspace built from presence, shared worlds, social state, and mixed-reality depth.",
  },
  {
    slug: "openai-monochrome-lab",
    label: "OpenAI",
    premise: "Reasoning Workspace",
    description: "OpenAI’s wordmark leads a restrained research system with Codex dialogue, reasoning trace, model context, and verification state.",
  },
  {
    slug: "spacex-launchpad",
    label: "SpaceX",
    premise: "Mission Control",
    description: "The SpaceX wordmark leads a launch timeline, live mission state, orbital geometry, and real-time telemetry hierarchy.",
  },
  {
    slug: "apple-liquid-studio",
    label: "Apple",
    premise: "Developer Studio",
    description: "Apple’s mark, platform language, SwiftUI preview, precision typography, and device canvas create a quiet product-design workspace.",
  },
  {
    slug: "microsoft-fluent-grid",
    label: "Microsoft",
    premise: "Copilot Studio",
    description: "Microsoft’s full wordmark, Fluent structure, Copilot, Azure, GitHub, and product color system become one connected build surface.",
  },
  {
    slug: "tesla-cyber-garage",
    label: "Tesla",
    premise: "Engineering Mode",
    description: "Tesla’s mark drives a vehicle-software environment with firmware, range, energy, Autopilot, and release-state telemetry.",
  },
  {
    slug: "anthropic-warm-lab",
    label: "Anthropic",
    premise: "Long-Horizon Research",
    description: "Anthropic’s identity becomes a thoughtful research room with Claude, constitutional principles, context, artifacts, and deliberate reasoning.",
  },
  {
    slug: "amazon-orbit-logistics",
    label: "Amazon",
    premise: "Builder Network",
    description: "Amazon’s wordmark anchors a global build-and-delivery network spanning compute, storage, regions, logistics, and scale.",
  },
  {
    slug: "x-signal-network",
    label: "X",
    premise: "Live Developer Network",
    description: "The X mark anchors a developer feed with For You navigation, a post composer, Spaces language, and live technical trends.",
  },
] as const;

export default function BrandLabPage() {
  return (
    <div className="brand-lab-shell">
      <SiteHeader transparent />
      <main>
        <header className="brand-lab-hero">
          <p>Eleven immersive Tech Brand themes</p>
          <h1>The complete<br /><span>brand workspace collection.</span></h1>
          <div>
            <p>Each direction changes the identity, content hierarchy, controls, data language, and workspace mood—not only the background.</p>
            <Link href="/themes/concepts">Browse the full concept directory →</Link>
          </div>
        </header>
        <section className="brand-lab-cases" aria-label="Immersive brand theme prototypes">
          {cases.map((item, index) => {
            const theme = getConceptTheme(item.slug);
            if (!theme) return null;
            const backgroundCss = theme.previewImage ? `url("${theme.previewImage}")` : theme.gradient;
            return (
              <article className="brand-lab-case" key={item.slug}>
                <div className="brand-lab-case-copy">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item.label}</p>
                  <h2>{item.premise}</h2>
                  <p>{item.description}</p>
                  <Link href={`/themes/concepts/${item.slug}`}>Open theme detail ↗</Link>
                </div>
                <div className="brand-lab-preview">
                  <ThemeMockup
                    backgroundCss={backgroundCss}
                    brandConceptSlug={theme.slug}
                    statusLabel="Immersive concept"
                    theme={theme}
                  />
                </div>
              </article>
            );
          })}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
