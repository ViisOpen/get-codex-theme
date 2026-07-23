# Asset guidelines

## Source image

- Prefer a 3200×2000 master (16:10 landscape).
- Accept a different master only when it is landscape, at least 2560 pixels
  wide, and can survive 16:9 and 4:3 crops.
- Keep essential subjects away from app chrome and the primary text region.
- Avoid embedded text, logos, watermarks, UI screenshots, compression artifacts,
  and recognizable copyrighted characters without a redistribution license.
- Prefer a cohesive environment over a poster-like composition.

## Required production files

| Path | Target | Purpose |
| --- | --- | --- |
| `assets/background.jpg` | 3200×2000 | Primary 16:10 desktop artwork and fallback |
| `assets/background-16x9.jpg` | 3200×1800 | Wide-window crop |
| `assets/background-4x3.jpg` | 2400×1800 | Narrower desktop crop |
| `assets/preview.jpg` | 1200×750 | HTML/CSS-rendered Home gallery preview |
| `screenshots/home.jpg` | 1200×750 | HTML/CSS Home readability proof |
| `screenshots/task.jpg` | 1200×750 | HTML/CSS Task/code readability proof |
| `screenshots/narrow.jpg` | 750×1000 | HTML/CSS responsive-layout proof |

Use `object-fit: cover` with an `object-position` derived from `focusX` and
`focusY`. Never stretch an image to fit. Keep each production asset reasonably
compressed and free from visible banding.

Use `render-preview --state all` for standard public previews. Its shared
HTML/CSS shell owns the sidebar, suggestion-card, composer, upload-control, and
responsive geometry, so individual themes change styling without moving Codex
controls. Keep the visible illustrative/no-user-data disclosure. A native
capture may be used only for optional compatibility QA and must never be labeled
as an HTML/CSS render.

## Prompt guidance

Before generation, show the exact `BACKGROUND_IMAGE_PROMPT` to the user. Ask for
one cohesive background-only image at exactly 3200×2000 when the image tool
supports it. Name the intended safe reading region and subject side, keep focal
interest in the outer third, and preserve enough environmental bleed for
3200×1800 16:9 and 2400×1800 4:3 crops.

Explicitly ban application windows, device frames, title bars, sidebars, buttons,
inputs, dialogs, chats, terminals, code, text, letters, numbers, logos,
watermarks, interface-like markings, posters, collages, and website or app
mockups. Request sharp edges, coherent lighting, and restrained detail behind
text. Generate one candidate, show it to the user, and wait for approval before
using it. If image generation is unavailable, provide the prompt and wait for
the user to attach the result; never fabricate an image path.
