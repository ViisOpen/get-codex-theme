export const site = {
  name: "Get Codex Theme",
  url: "https://getcodextheme.com",
  github: "https://github.com/ViisOpen/get-codex-theme",
  description:
    "The free, automatically validated, creator-attributed gallery for custom Codex Desktop themes.",
};

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}
