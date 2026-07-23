import type { CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CaretDown,
  ChatCircle,
  ClockCountdown,
  DownloadSimple,
  FolderSimple,
  GitBranch,
  GitPullRequest,
  MagnifyingGlass,
  Microphone,
  NotePencil,
  Columns,
  Plus,
  PlugsConnected,
  ShieldWarning,
  SidebarSimple,
  UserCircle,
} from "@phosphor-icons/react/ssr";
import type { CodexTheme } from "@/lib/themes";
import { BrandConceptOverlay } from "./BrandConceptOverlay";
import { BrandSidebarIdentity, BrandWorkspaceScene, getImmersiveBrand } from "./BrandWorkspaceScene";

type Props = {
  theme: CodexTheme;
  className?: string;
  imageUrl?: string;
  focusX?: number;
  focusY?: number;
  overlayStrength?: number;
  brandLogoUrl?: string;
  brandConceptSlug?: string;
  backgroundCss?: string;
  renderedPreviewUrl?: string;
  statusLabel?: string;
  variant?: "home" | "task" | "narrow";
};

const demoProjects = [
  { name: "Nova Studio", active: true, task: "Polish onboarding flow" },
  { name: "Atlas API", task: "Review auth middleware" },
  { name: "Orbit Notes", task: "Plan offline sync" },
  { name: "Pixel Forge", task: "Fix export pipeline" },
  { name: "Beacon Mobile", task: "Refine release checklist" },
  { name: "Canvas Docs", task: "Draft component guide" },
  { name: "Pulse Toolkit", task: "Improve CLI feedback" },
] as const;

const primaryNav = [
  { label: "New task", icon: NotePencil },
  { label: "Scheduled", icon: ClockCountdown },
  { label: "Plugins", icon: PlugsConnected },
  { label: "Pull requests", icon: GitPullRequest },
  { label: "Chat", icon: ChatCircle },
] as const;

function Sidebar() {
  return (
    <aside aria-hidden="true" className="mock-sidebar">
      <div className="mock-sidebar-toolbar">
        <div className="mock-window-controls" aria-hidden="true"><i /><i /><i /></div>
        <SidebarSimple aria-hidden="true" weight="regular" />
        <ArrowLeft aria-hidden="true" weight="regular" />
        <ArrowRight aria-hidden="true" className="muted" weight="regular" />
      </div>

      <div className="mock-sidebar-title"><b>Codex</b><MagnifyingGlass aria-hidden="true" /></div>

      <nav className="mock-native-nav" aria-label="Primary demo navigation">
        {primaryNav.map(({ label, icon: NavIcon }) => (
          <span key={label}><NavIcon aria-hidden="true" weight="regular" />{label}</span>
        ))}
      </nav>

      <span className="mock-section-label">Pinned</span>
      <div className="mock-pinned-task">Prepare launch brief</div>

      <span className="mock-section-label">Projects</span>
      <div className="mock-project-list">
        {demoProjects.map((project) => (
          <div className={"active" in project && project.active ? "active" : ""} key={project.name}>
            <span><FolderSimple aria-hidden="true" weight="regular" />{project.name}</span>
            <small>{project.task}</small>
          </div>
        ))}
      </div>

      <div className="mock-sidebar-account">
        <UserCircle aria-hidden="true" weight="fill" />
        <span>Demo User</span>
        <DownloadSimple aria-hidden="true" weight="bold" />
      </div>
    </aside>
  );
}

function Composer({ project }: { project: string }) {
  return (
    <div className="mock-composer">
      <div className="mock-composer-context">
        <span><FolderSimple aria-hidden="true" />{project}</span>
        <span><SidebarSimple aria-hidden="true" />Local</span>
        <span><GitBranch aria-hidden="true" />main</span>
      </div>
      <div className="mock-composer-field">Do anything</div>
      <div className="mock-composer-actions">
        <div><Plus aria-hidden="true" /><span className="mock-access"><ShieldWarning aria-hidden="true" />Full access</span></div>
        <div><span>Codex 5.6</span><CaretDown aria-hidden="true" /><Microphone aria-hidden="true" /><span className="mock-send-icon"><ArrowUp aria-hidden="true" weight="bold" /></span></div>
      </div>
    </div>
  );
}

export function ThemeMockup({ theme, className = "", imageUrl, focusX, focusY, overlayStrength, brandLogoUrl, brandConceptSlug, backgroundCss, renderedPreviewUrl, statusLabel, variant = "home" }: Props) {
  const backgroundImage = backgroundCss ?? (imageUrl ? `url(${imageUrl})` : `url(/theme-packs/${theme.slug}/assets/background.jpg)`);
  const resolvedBrandLogoUrl = brandLogoUrl ?? theme.brandLogoUrl;
  const immersiveBrand = getImmersiveBrand(brandConceptSlug);
  const demoProject = immersiveBrand?.project ?? "Nova Studio";
  const style = {
    "--theme-accent": theme.accent,
    "--theme-foreground": theme.foreground,
    "--theme-muted": theme.muted,
    "--theme-surface": theme.surface,
    "--theme-canvas": theme.canvas,
    "--theme-background": backgroundImage,
    "--theme-focus-x": `${focusX ?? theme.focusX}%`,
    "--theme-focus-y": `${focusY ?? theme.focusY}%`,
    "--theme-overlay-strength": String(overlayStrength ?? 0.86),
  } as CSSProperties;

  if (renderedPreviewUrl) {
    return (
      <section
        aria-label={`${theme.name} rendered Codex ${variant} preview`}
        className={`codex-mockup codex-mockup--rendered ${className}`}
      >
        <Image alt="" aria-hidden="true" className="mock-rendered-preview" fill sizes="(min-width: 1024px) 60vw, 100vw" src={renderedPreviewUrl} unoptimized />
        {statusLabel && <span aria-hidden="true" className="mock-status-badge">{statusLabel}</span>}
      </section>
    );
  }

  return (
    <section
      aria-label={`${theme.name} Codex desktop ${variant} concept preview`}
      className={`codex-mockup codex-mockup--${theme.mode} codex-mockup--${variant}${immersiveBrand ? ` codex-mockup--immersive-brand codex-mockup--brand-${immersiveBrand.tone}` : ""} ${className}`}
      style={style}
    >
      {statusLabel && <span aria-hidden="true" className="mock-status-badge">{statusLabel}</span>}
      {resolvedBrandLogoUrl && <span aria-hidden="true" className="mock-brand-logo" style={{ backgroundImage: `url(${resolvedBrandLogoUrl})` }} />}
      <Sidebar />
      <div aria-hidden="true" className="mock-main">
        <div className="mock-main-controls" aria-hidden="true"><SidebarSimple /><Columns /></div>
        <div className="mock-brand-row">
          <b>Codex</b>
          {immersiveBrand ? <BrandSidebarIdentity config={immersiveBrand} /> : null}
        </div>
        {immersiveBrand ? (
          <BrandWorkspaceScene config={immersiveBrand} variant={variant} />
        ) : (
          <>
            <BrandConceptOverlay slug={brandConceptSlug} />
            <div className="mock-content"><strong>What should we build in {demoProject}?</strong><p>{theme.name} · {theme.tagline}</p></div>
          </>
        )}
        <Composer project={demoProject} />
      </div>
    </section>
  );
}
