import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="footer-brand" href="/">Get Codex Theme</Link>
        <p>The free, creator-attributed gallery for Codex Desktop themes.</p>
      </div>
      <div className="footer-links">
        <div>
          <strong>Product</strong>
          <Link href="/themes">Themes</Link>
          <Link href="/themes/concepts">Theme concepts</Link>
          <Link href="/codex-theme-styles">Theme styles</Link>
          <Link href="/create">Create</Link>
          <Link href="/publish">Publish a theme</Link>
        </div>
        <div>
          <strong>Resources</strong>
          <Link href="/codex-theme-use-cases">Use cases</Link>
          <Link href="/codex-theme-platforms">Platforms</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/open-source">Open source</Link>
          <Link href="/contact">Contact</Link>
          <a href={site.github}>GitHub</a>
        </div>
        <div>
          <strong>Legal</strong>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <p className="footer-legal">
        Unofficial themes for Codex Desktop. Not affiliated with or endorsed by OpenAI.
      </p>
    </footer>
  );
}
