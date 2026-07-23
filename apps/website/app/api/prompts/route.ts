import { RequestError, json, readJsonObject, toErrorResponse } from "../_lib/http";
import { getConceptTheme } from "@/lib/concept-themes";

function clean(value: unknown, name: string, max = 100) {
  if (typeof value !== "string" || !value.trim()) throw new RequestError(400, "invalid_payload", `${name} is required.`);
  return value.trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const source = payload.config && typeof payload.config === "object" && !Array.isArray(payload.config)
      ? payload.config as Record<string, unknown>
      : payload;
    const style = clean(source.style, "style");
    const mood = clean(source.mood, "mood");
    const accent = clean(source.accent, "accent", 24);
    const conceptSlug = typeof source.conceptSlug === "string" ? source.conceptSlug.trim() : "";
    const concept = conceptSlug ? getConceptTheme(conceptSlug) : undefined;
    if (conceptSlug && !concept) throw new RequestError(400, "invalid_concept", "Choose a published concept direction.");
    const brandName = typeof source.brandName === "string" ? source.brandName.trim().slice(0, 80) : "";
    const brandDirection = brandName
      ? `Subtly express the personality of ${brandName}, without including any logo or readable brand text.`
      : "Keep the artwork original and free of logos, trademarks, and recognizable copyrighted characters.";

    const prompt = `Create a premium landscape background for a custom Codex Desktop theme.

Visual direction: ${style}.
Mood: ${mood}.
Accent color: ${accent}.
${concept ? `Starting concept: ${concept.name}.
Art direction: ${concept.artDirection}
Workspace fit: ${concept.workspaceFit}` : "Starting concept: Create an original direction from the supplied style and mood."}
${brandDirection}

Composition requirements:
- Landscape 16:10 composition, designed for 3200 × 2000 pixels.
- Keep the left 38% visually quiet and low-contrast for navigation and text.
- Place the main visual interest in the right half, away from window controls and the bottom composer.
- Use layered depth and gentle gradients, with enough negative space for a working interface.
- The image must crop cleanly to a 3200 × 1800 16:9 asset and a 2400 × 1800 4:3 asset; keep essential subjects inside the center 70% safe area.

Do not include:
- Any application window, device frame, title bar, sidebar, button, input, dialog, chat, terminal, code, or other fake interface element.
- Text, letters, numbers, logos, watermarks, generated labels, or interface-like markings.
- OpenAI or Codex logos.
- Recognizable copyrighted characters, celebrities, or third-party product designs.

Output requirements:
- Highest available resolution, preferably exactly 3200 × 2000.
- Sharp, clean edges with no compression artifacts.
- One cohesive background-only image, not a poster, collage, screenshot, app mockup, device mockup, or website mockup.`;

    return json({
      prompt,
      concept: concept ? { slug: concept.slug, name: concept.name, previewImage: concept.previewImage } : null,
      recommended: { aspectRatio: "16:10", width: 3200, height: 2000, minimumWidth: 1920, formats: ["PNG", "JPEG", "WebP"] },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
