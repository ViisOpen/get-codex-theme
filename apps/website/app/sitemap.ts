import type { MetadataRoute } from "next";
import { conceptThemes } from "@/lib/concept-themes";
import { guides } from "@/lib/guides";
import { seoClusterOrder, seoClusters, seoLandingPath, seoPages } from "@/lib/seo-pages";
import { absoluteUrl } from "@/lib/site";
import { safeListGalleryThemes } from "@/lib/theme-gallery.server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date("2026-07-22T00:00:00.000Z");
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/themes"), lastModified, changeFrequency: "weekly", priority: 0.95 },
    { url: absoluteUrl("/themes/free"), lastModified, changeFrequency: "weekly", priority: 0.92 },
    { url: absoluteUrl("/themes/dark"), lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/themes/light"), lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/themes/concepts"), lastModified, changeFrequency: "weekly", priority: 0.92 },
    { url: absoluteUrl("/create"), lastModified, changeFrequency: "monthly", priority: 0.95 },
    { url: absoluteUrl("/brand-themes"), lastModified, changeFrequency: "monthly", priority: 0.85 },
    { url: absoluteUrl("/publish"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/guides"), lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/open-source"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contact"), lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];

  const galleryThemes = await safeListGalleryThemes();
  const themePages: MetadataRoute.Sitemap = galleryThemes.map((theme) => ({
    url: absoluteUrl(`/themes/${theme.slug}`),
    lastModified: theme.publishedAt ? new Date(theme.publishedAt) : lastModified,
    changeFrequency: "monthly",
    priority: theme.featured ? 0.82 : theme.source === "community" ? 0.78 : 0.76,
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: absoluteUrl(`/guides/${guide.slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: guide.slug === "codex-themes" ? 0.82 : 0.72,
  }));

  const conceptPages: MetadataRoute.Sitemap = conceptThemes.map((theme) => ({
    url: absoluteUrl(`/themes/concepts/${theme.slug}`),
    lastModified,
    changeFrequency: theme.previewReady ? "weekly" : "monthly",
    priority: theme.previewReady ? 0.8 : 0.67,
  }));

  const seoHubPages: MetadataRoute.Sitemap = seoClusterOrder.map((key) => ({
    url: absoluteUrl(seoClusters[key].path),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.78,
  }));

  const seoLandingPages: MetadataRoute.Sitemap = seoPages.map((page) => ({
    url: absoluteUrl(seoLandingPath(page)),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.68,
  }));

  return [...staticPages, ...themePages, ...conceptPages, ...guidePages, ...seoHubPages, ...seoLandingPages];
}
