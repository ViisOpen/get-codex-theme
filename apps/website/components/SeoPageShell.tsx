import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export type Breadcrumb = {
  label: string;
  href?: string;
};

type SeoPageShellProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
};

export function SeoPageShell({
  eyebrow,
  title,
  description,
  breadcrumbs = [],
  actions,
  children,
  compact = false,
}: SeoPageShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0c] text-[#f5f4f0]">
      <SiteHeader />
      <main>
        <header
          className={`relative isolate border-b border-white/10 px-5 sm:px-8 ${
            compact ? "pb-14 pt-24 sm:pb-18 sm:pt-32" : "pb-18 pt-28 sm:pb-24 sm:pt-40"
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 78% 22%, rgba(130, 107, 255, .24), transparent 25%), radial-gradient(circle at 10% 70%, rgba(67, 190, 170, .11), transparent 28%), linear-gradient(180deg, #0f1015 0%, #090a0c 100%)",
            }}
            aria-hidden="true"
          />
          <div className="mx-auto max-w-6xl">
            {breadcrumbs.length > 0 ? (
              <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.16em] text-white/62">
                <ol className="flex flex-wrap items-center gap-2">
                  {breadcrumbs.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                      {index > 0 ? <span aria-hidden="true">/</span> : null}
                      {item.href ? (
                        <Link className="transition-colors hover:text-white" href={item.href}>
                          {item.label}
                        </Link>
                      ) : (
                        <span aria-current="page" className="text-white/70">{item.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.24em] text-[#a99cff]">{eyebrow}</p>
            <div className="max-w-4xl">
              <h1 className="text-balance [font-family:var(--font-heading)] text-5xl leading-[0.94] tracking-[-0.035em] sm:text-7xl lg:text-[5.9rem]">
                {title}
              </h1>
              <div className="mt-7 max-w-2xl text-pretty text-lg font-light leading-8 text-white/64 sm:text-xl">
                {description}
              </div>
              {actions ? <div className="mt-9 flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </div>
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[#f5f4f0] px-6 text-sm font-semibold text-[#101115] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

export const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-6 text-sm font-medium text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

export const sectionClass = "mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24";
