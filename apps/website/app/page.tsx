import type { Metadata } from "next";
import { HomeExperience } from "@/components/HomeExperience";
import { conceptThemes } from "@/lib/concept-themes";
import { safeListGalleryThemes } from "@/lib/theme-gallery.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Codex Themes: Validated Community Packs",
  description:
    `Browse installable first-party and community Codex themes separately from ${conceptThemes.length} original concept directions.`,
  keywords: ["Codex themes", "Codex character themes", "Codex brand themes", "fun Codex themes", "free Codex theme packs"],
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const galleryThemes = await safeListGalleryThemes();
  return <HomeExperience concepts={conceptThemes} themes={galleryThemes} />;
}
