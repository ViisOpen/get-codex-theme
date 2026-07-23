import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import { createSeoPageMetadata, getSeoPage, getSeoPagesByCluster } from "@/lib/seo-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSeoPagesByCluster("styles").map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSeoPage("styles", slug);
  return page ? createSeoPageMetadata(page) : {};
}

export default async function CodexThemeStylePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSeoPage("styles", slug);
  if (!page) notFound();
  return <SeoLandingPage page={page} />;
}
