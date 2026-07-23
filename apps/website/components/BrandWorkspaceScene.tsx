import Image from "next/image";
import type { Icon } from "@phosphor-icons/react";
import {
  BatteryCharging,
  Binoculars,
  Brain,
  Broadcast,
  Bug,
  ChartLine,
  ChatCircle,
  CheckCircle,
  CirclesFour,
  Cloud,
  Code,
  Cpu,
  DeviceMobile,
  FileCode,
  Files,
  GitBranch,
  GlobeHemisphereWest,
  Hammer,
  Lightning,
  MagnifyingGlass,
  Microphone,
  Package,
  Palette,
  Planet,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
  TreeStructure,
  UsersThree,
} from "@phosphor-icons/react/ssr";

type BrandAsset = {
  label: string;
  icon: Icon;
};

export type ImmersiveBrandConfig = {
  slug: string;
  name: string;
  tone: "nvidia" | "google" | "spacex" | "x" | "meta" | "openai" | "apple" | "microsoft" | "tesla" | "anthropic" | "amazon";
  logo: string;
  heroLogo?: string;
  logoWidth: number;
  logoHeight: number;
  project: string;
  assets: readonly BrandAsset[];
};

const immersiveBrands: Record<string, ImmersiveBrandConfig> = {
  "nvidia-neon-compute": {
    slug: "nvidia-neon-compute",
    name: "NVIDIA",
    tone: "nvidia",
    logo: "/brand-marks/nvidia-horizontal.png",
    heroLogo: "/brand-marks/nvidia.svg",
    logoWidth: 700,
    logoHeight: 394,
    project: "Vector Lab",
    assets: [
      { label: "CUDA", icon: Code },
      { label: "Blackwell", icon: Cpu },
      { label: "RTX", icon: Lightning },
    ],
  },
  "google-spectrum": {
    slug: "google-spectrum",
    name: "Google",
    tone: "google",
    logo: "/brand-marks/google-logo.png",
    logoWidth: 544,
    logoHeight: 184,
    project: "Spectrum Studio",
    assets: [
      { label: "Gemini", icon: Sparkle },
      { label: "Search", icon: MagnifyingGlass },
      { label: "Cloud", icon: Cloud },
    ],
  },
  "meta-horizon": {
    slug: "meta-horizon",
    name: "Meta",
    tone: "meta",
    logo: "/brand-marks/meta.svg",
    logoWidth: 24,
    logoHeight: 24,
    project: "Horizon Studio",
    assets: [
      { label: "Presence", icon: UsersThree },
      { label: "Worlds", icon: GlobeHemisphereWest },
      { label: "Spatial", icon: CirclesFour },
    ],
  },
  "openai-monochrome-lab": {
    slug: "openai-monochrome-lab",
    name: "OpenAI",
    tone: "openai",
    logo: "/brand-marks/openai-wordmark.webp",
    logoWidth: 1042,
    logoHeight: 521,
    project: "Research Canvas",
    assets: [
      { label: "Reasoning", icon: Brain },
      { label: "Models", icon: TreeStructure },
      { label: "Research", icon: Files },
    ],
  },
  "spacex-launchpad": {
    slug: "spacex-launchpad",
    name: "SpaceX",
    tone: "spacex",
    logo: "/brand-marks/spacex-wordmark.svg",
    heroLogo: "/brand-marks/spacex.svg",
    logoWidth: 400,
    logoHeight: 50,
    project: "Launch Systems",
    assets: [
      { label: "Starship", icon: RocketLaunch },
      { label: "Orbit", icon: Planet },
      { label: "Telemetry", icon: ChartLine },
    ],
  },
  "apple-liquid-studio": {
    slug: "apple-liquid-studio",
    name: "Apple",
    tone: "apple",
    logo: "/brand-marks/apple.svg",
    logoWidth: 24,
    logoHeight: 24,
    project: "Product Studio",
    assets: [
      { label: "SwiftUI", icon: Code },
      { label: "Vision", icon: DeviceMobile },
      { label: "Design", icon: Palette },
    ],
  },
  "microsoft-fluent-grid": {
    slug: "microsoft-fluent-grid",
    name: "Microsoft",
    tone: "microsoft",
    logo: "/brand-marks/microsoft-logo.png",
    logoWidth: 216,
    logoHeight: 46,
    project: "Northstar Cloud",
    assets: [
      { label: "Copilot", icon: Sparkle },
      { label: "Azure", icon: Cloud },
      { label: "GitHub", icon: GitBranch },
    ],
  },
  "tesla-cyber-garage": {
    slug: "tesla-cyber-garage",
    name: "Tesla",
    tone: "tesla",
    logo: "/brand-marks/tesla.svg",
    logoWidth: 24,
    logoHeight: 24,
    project: "Drive Systems",
    assets: [
      { label: "Energy", icon: Lightning },
      { label: "Autopilot", icon: TreeStructure },
      { label: "Charging", icon: BatteryCharging },
    ],
  },
  "anthropic-warm-lab": {
    slug: "anthropic-warm-lab",
    name: "Anthropic",
    tone: "anthropic",
    logo: "/brand-marks/anthropic.svg",
    logoWidth: 24,
    logoHeight: 24,
    project: "Long Horizon",
    assets: [
      { label: "Claude", icon: Sparkle },
      { label: "Artifacts", icon: Files },
      { label: "Safety", icon: ShieldCheck },
    ],
  },
  "amazon-orbit-logistics": {
    slug: "amazon-orbit-logistics",
    name: "Amazon",
    tone: "amazon",
    logo: "/brand-marks/amazon-logo.svg",
    logoWidth: 100,
    logoHeight: 33,
    project: "Orbit Logistics",
    assets: [
      { label: "AWS", icon: Cloud },
      { label: "Lambda", icon: Lightning },
      { label: "Delivery", icon: Package },
    ],
  },
  "x-signal-network": {
    slug: "x-signal-network",
    name: "X",
    tone: "x",
    logo: "/brand-marks/x.svg",
    logoWidth: 1200,
    logoHeight: 1227,
    project: "Signal Studio",
    assets: [
      { label: "Spaces", icon: Microphone },
      { label: "Live", icon: Broadcast },
      { label: "Verified", icon: CheckCircle },
    ],
  },
};

const suggestions = [
  { title: "Explore and understand code", icon: Binoculars },
  { title: "Build a new feature, app, or tool", icon: Hammer },
  { title: "Review code and suggest changes", icon: GitBranch },
  { title: "Fix issues and failures", icon: Bug },
] as const;

export const immersiveBrandSlugs = Object.freeze(Object.keys(immersiveBrands));

export function getImmersiveBrand(slug?: string) {
  return slug ? immersiveBrands[slug] : undefined;
}

function BrandLogo({ config, className = "", hero = false, label }: { config: ImmersiveBrandConfig; className?: string; hero?: boolean; label?: string }) {
  return (
    <Image
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={className}
      height={config.logoHeight}
      src={hero ? config.heroLogo ?? config.logo : config.logo}
      unoptimized
      width={config.logoWidth}
    />
  );
}

export function BrandSidebarIdentity({ config }: { config: ImmersiveBrandConfig }) {
  return (
    <>
      <span className="mock-brand-cross" aria-hidden="true">×</span>
      <BrandLogo className="mock-sidebar-brand-logo" config={config} />
    </>
  );
}

function WelcomeState({ config }: { config: ImmersiveBrandConfig }) {
  return (
    <div className="brand-welcome-state">
      <div className="brand-codex-symbol" aria-hidden="true"><Brain weight="duotone" /></div>
      <h3>What should we build in {config.project}?</h3>
      <div className="brand-suggestion-grid">
        {suggestions.map(({ title, icon: SuggestionIcon }) => (
          <button key={title} type="button">
            <SuggestionIcon aria-hidden="true" weight="duotone" />
            <span>{title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskState({ config }: { config: ImmersiveBrandConfig }) {
  return (
    <div className="brand-task-state">
      <div className="brand-task-user"><ChatCircle aria-hidden="true" weight="duotone" /><span>Polish the launch experience and verify the responsive states.</span></div>
      <div className="brand-task-agent">
        <FileCode aria-hidden="true" weight="duotone" />
        <div>
          <b>Updating {config.project}</b>
          <p>I’m refining the interface, checking the implementation, and validating the final experience.</p>
          <span><i />Reviewing components</span>
          <span><i />Running visual checks</span>
          <span><i />Preparing the handoff</span>
        </div>
      </div>
    </div>
  );
}

export function BrandWorkspaceScene({ config, variant }: { config: ImmersiveBrandConfig; variant: "home" | "task" | "narrow" }) {
  return (
    <section className={`brand-workspace brand-workspace--${config.tone}`} aria-label={`${config.name}-inspired Codex workspace`}>
      <div className="brand-hero-logo" aria-hidden="true">
        <BrandLogo config={config} hero />
      </div>
      <div className="brand-asset-cluster" aria-label={`${config.name} brand elements`}>
        {config.assets.map(({ label, icon: AssetIcon }) => (
          <span key={label}>
            <AssetIcon aria-hidden="true" weight="duotone" />
            <b>{label}</b>
          </span>
        ))}
      </div>
      {variant === "task" ? <TaskState config={config} /> : <WelcomeState config={config} />}
    </section>
  );
}
