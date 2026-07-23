import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { HeaderAccount } from "./HeaderAccount";

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  return (
    <header className={`site-header ${transparent ? "site-header--overlay" : ""}`}>
      <Link className="brand-mark" href="/" aria-label="Get Codex Theme home">
        <span className="brand-orb" aria-hidden="true">
          <Image
            alt=""
            height={38}
            priority
            src="/brand/get-codex-theme-mark-76.png"
            unoptimized
            width={36}
          />
        </span>
        <span>Get Codex Theme</span>
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <Link href="/themes">Themes</Link>
        <Link href="/themes/concepts">Concepts</Link>
        <Link href="/create">Create</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/publish">Publish</Link>
        <a href={site.github} rel="noreferrer" target="_blank">GitHub</a>
      </nav>
      <HeaderAccount />
      <details className="mobile-nav">
        <summary aria-label="Open navigation">Menu</summary>
        <nav>
          <Link href="/themes">Themes</Link>
          <Link href="/themes/concepts">Concepts</Link>
          <Link href="/create">Create</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/publish">Publish</Link>
          <a href={site.github}>GitHub</a>
        </nav>
      </details>
    </header>
  );
}
