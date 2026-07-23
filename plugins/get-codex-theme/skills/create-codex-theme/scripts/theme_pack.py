#!/usr/bin/env python3
"""Create and validate Get Codex Theme packs with no third-party packages."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
VERSION_RE = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")
COLOR_RE = re.compile(r"^(#[0-9a-fA-F]{6}|rgba?\([^\r\n]+\))$")
PALETTE_KEYS = (
    "accent", "background", "foreground", "muted", "surface",
    "surfaceElevated", "border", "codeBackground", "codeForeground",
    "inputBackground", "buttonBackground", "buttonForeground",
)
ASSET_PATHS = {
    "background16x10": "assets/background.jpg",
    "background16x9": "assets/background-16x9.jpg",
    "background4x3": "assets/background-4x3.jpg",
    "backgroundFallback": "assets/background.jpg",
    "preview": "assets/preview.jpg",
    "screenshotHome": "screenshots/home.jpg",
    "screenshotTask": "screenshots/task.jpg",
    "screenshotNarrow": "screenshots/narrow.jpg",
    "tokens": "tokens/visual-theme.json",
}
COMPONENT_GROUPS = ("foundation", "buttons", "icons", "overlaysAndForms", "taskArtifacts", "feedback", "utilityRoutes")
COMPONENT_KEYS = {
    "foundation": {"surface", "surfaceElevated", "border", "focusRing"},
    "buttons": {"disabledOpacity", "primaryBackground", "primaryForeground", "secondaryBackground", "secondaryForeground", "hoverBackground", "destructiveBackground", "destructiveForeground"},
    "icons": {"foreground", "muted", "accent", "danger", "containerBackground"},
    "overlaysAndForms": {"background", "foreground", "muted", "border", "inputBackground", "focusRing", "selectedBackground"},
    "taskArtifacts": {"background", "toolBackground", "codeBackground", "codeForeground", "terminalBackground", "diffAdded", "diffRemoved", "border"},
    "feedback": {"success", "warning", "danger", "info", "badgeBackground", "loadingAccent"},
    "utilityRoutes": {"background", "foreground", "muted", "activeBackground", "activeForeground", "hoverBackground", "border"},
}


def palette(mode: str) -> dict[str, str]:
    if mode == "light":
        return {
            "accent": "#2563EB", "background": "#F6F7F9", "foreground": "#17181B",
            "muted": "#667085", "surface": "rgba(255, 255, 255, 0.82)",
            "surfaceElevated": "rgba(255, 255, 255, 0.94)", "border": "rgba(23, 24, 27, 0.14)",
            "codeBackground": "rgba(239, 242, 247, 0.94)", "codeForeground": "#20242B",
            "inputBackground": "rgba(255, 255, 255, 0.92)", "buttonBackground": "#17181B",
            "buttonForeground": "#FFFFFF",
        }
    return {
        "accent": "#8B7CFF", "background": "#0A0910", "foreground": "#F7F5FF",
        "muted": "#B8B3CC", "surface": "rgba(17, 14, 29, 0.86)",
        "surfaceElevated": "rgba(29, 25, 44, 0.94)", "border": "rgba(247, 245, 255, 0.14)",
        "codeBackground": "rgba(10, 8, 18, 0.92)", "codeForeground": "#F4F1FF",
        "inputBackground": "rgba(21, 18, 33, 0.92)", "buttonBackground": "#F7F5FF",
        "buttonForeground": "#14111F",
    }


def new_manifest(theme_id: str, name: str, mode: str) -> dict:
    theme_palette = palette(mode)
    layout = {"focusX": 50, "focusY": 50, "overlayStrength": 0.76 if mode == "dark" else 0.62, "contentSide": "center"}
    return {
        "$schema": "https://getcodextheme.com/schema/manifest-v1.json",
        "schemaVersion": 1, "id": theme_id, "name": name,
        "description": f"{name} is an original visual theme for Codex Desktop.",
        "version": "1.0.0", "mode": mode, "author": "Theme author",
        "homepage": f"https://getcodextheme.com/themes/{theme_id}",
        "tags": [mode, "custom"], "platforms": ["macos", "windows"],
        "delivery": ["visual-cdp"], "palette": theme_palette,
        "layout": layout, "assets": ASSET_PATHS.copy(), "license": "REPLACE-BEFORE-RELEASE",
        "unofficial": True,
    }


def component_contract(theme_palette: dict[str, str], path: str, selected: str | None) -> dict:
    requested = [item.strip() for item in (selected or "").split(",") if item.strip()]
    unknown = [item for item in requested if item not in COMPONENT_GROUPS]
    if unknown:
        raise ValueError(f"unsupported components: {', '.join(unknown)}")
    enabled = list(COMPONENT_GROUPS) if path != "focused" else list(dict.fromkeys(["foundation", *requested]))
    if path == "focused" and len(enabled) < 2:
        raise ValueError("focused authoring requires --components with at least one non-foundation group")
    accent = theme_palette["accent"]
    danger = theme_palette.get("danger", accent)
    derived = {
        "foundation": {"surface": theme_palette["surface"], "surfaceElevated": theme_palette["surfaceElevated"], "border": theme_palette["border"], "focusRing": theme_palette.get("focusRing", accent)},
        "buttons": {"disabledOpacity": 0.48, "primaryBackground": theme_palette["buttonBackground"], "primaryForeground": theme_palette["buttonForeground"], "secondaryBackground": theme_palette["surfaceElevated"], "secondaryForeground": theme_palette["foreground"], "hoverBackground": accent, "destructiveBackground": danger, "destructiveForeground": theme_palette["buttonForeground"]},
        "icons": {"foreground": theme_palette["foreground"], "muted": theme_palette["muted"], "accent": accent, "danger": danger, "containerBackground": accent},
        "overlaysAndForms": {"background": theme_palette["surfaceElevated"], "foreground": theme_palette["foreground"], "muted": theme_palette["muted"], "border": theme_palette["border"], "inputBackground": theme_palette["inputBackground"], "focusRing": theme_palette.get("focusRing", accent), "selectedBackground": accent},
        "taskArtifacts": {"background": theme_palette["surface"], "toolBackground": theme_palette["surfaceElevated"], "codeBackground": theme_palette["codeBackground"], "codeForeground": theme_palette["codeForeground"], "terminalBackground": theme_palette["codeBackground"], "diffAdded": theme_palette.get("success", accent), "diffRemoved": danger, "border": theme_palette["border"]},
        "feedback": {"success": theme_palette.get("success", accent), "warning": theme_palette.get("warning", accent), "danger": danger, "info": theme_palette.get("secondary", accent), "badgeBackground": accent, "loadingAccent": accent},
        "utilityRoutes": {"background": theme_palette["surface"], "foreground": theme_palette["foreground"], "muted": theme_palette["muted"], "activeBackground": accent, "activeForeground": theme_palette["foreground"], "hoverBackground": accent, "border": theme_palette["border"]},
    }
    return {
        "componentSchemaVersion": 2,
        "authoring": {"path": path, "fallback": "adaptive"},
        "coverage": {"target": "focused" if path == "focused" else "complete", "enabled": enabled, "customized": [] if path == "assisted" else enabled, "generated": enabled if path == "assisted" else []},
        "components": {group: derived[group] for group in enabled},
    }


def create(args: argparse.Namespace) -> int:
    if not ID_RE.fullmatch(args.theme_id):
        raise ValueError("theme id must be lowercase kebab-case")
    root = Path(args.output).resolve() / args.theme_id
    if root.exists():
        raise ValueError(f"refusing to overwrite existing directory: {root}")
    manifest = new_manifest(args.theme_id, args.name or args.theme_id.replace("-", " ").title(), args.mode)
    for folder in ("assets", "screenshots", "tokens"):
        (root / folder).mkdir(parents=True, exist_ok=True)
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    tokens = {key: manifest[key] for key in ("id", "mode", "palette", "layout")}
    tokens["schemaVersion"] = 2
    tokens.update(component_contract(manifest["palette"], args.path, args.components))
    (root / "tokens/visual-theme.json").write_text(json.dumps(tokens, indent=2) + "\n", encoding="utf-8")
    (root / "assets/EXPECTED_FILES.md").write_text("# Expected assets\n\n" + "\n".join(f"- `{Path(value).name}`" for key, value in ASSET_PATHS.items() if key not in {"tokens", "screenshotHome", "screenshotTask", "screenshotNarrow"}) + "\n", encoding="utf-8")
    (root / "screenshots/EXPECTED_FILES.md").write_text("# Expected screenshots\n\n- `home.jpg`\n- `task.jpg`\n- `narrow.jpg`\n", encoding="utf-8")
    (root / "LICENSE-ASSETS.txt").write_text("Record source, author, generation method, edits, and redistribution license before release.\n", encoding="utf-8")
    print(root)
    return 0


def validate(args: argparse.Namespace) -> int:
    source = Path(args.path).resolve()
    manifest_path = source / "manifest.json" if source.is_dir() else source
    root = manifest_path.parent
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []
    missing_assets: set[str] = set()
    for key in ("schemaVersion", "id", "name", "description", "version", "mode", "platforms", "delivery", "palette", "layout", "assets", "license", "unofficial"):
        if key not in manifest:
            errors.append(f"missing required field: {key}")
    if manifest.get("schemaVersion") != 1: errors.append("schemaVersion must equal 1")
    if not ID_RE.fullmatch(str(manifest.get("id", ""))): errors.append("id must be lowercase kebab-case")
    if not VERSION_RE.fullmatch(str(manifest.get("version", ""))): errors.append("version must be semantic x.y.z")
    if manifest.get("mode") not in {"dark", "light"}: errors.append("mode must be dark or light")
    if manifest.get("unofficial") is not True: errors.append("unofficial must be true")
    for key in PALETTE_KEYS:
        if not COLOR_RE.fullmatch(str(manifest.get("palette", {}).get(key, ""))):
            errors.append(f"palette.{key} must be a supported color")
    layout = manifest.get("layout", {})
    for key, lower, upper in (("focusX", 0, 100), ("focusY", 0, 100), ("overlayStrength", 0, 1)):
        value = layout.get(key)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not lower <= value <= upper:
            errors.append(f"layout.{key} must be between {lower} and {upper}")
    if layout.get("contentSide") not in {"left", "center", "right"}: errors.append("layout.contentSide is invalid")
    token_path = root / str(manifest.get("assets", {}).get("tokens", "tokens/visual-theme.json"))
    if token_path.is_file():
        try:
            visual_tokens = json.loads(token_path.read_text(encoding="utf-8"))
            if visual_tokens.get("schemaVersion") != 2: errors.append("visual token schemaVersion must equal 2")
            if visual_tokens.get("componentSchemaVersion") != 2: errors.append("componentSchemaVersion must equal 2")
            if "layoutContracts" in visual_tokens or "layoutContractSchemaVersion" in visual_tokens: errors.append("visual token v2 does not allow layout contracts")
            if visual_tokens.get("componentSchemaVersion") == 2:
                authoring = visual_tokens.get("authoring", {})
                coverage = visual_tokens.get("coverage", {})
                if authoring.get("path") not in {"focused", "complete", "assisted"}: errors.append("authoring.path is invalid")
                if authoring.get("fallback") != "adaptive": errors.append("authoring.fallback must equal adaptive")
                enabled = coverage.get("enabled", [])
                if not isinstance(enabled, list) or "foundation" not in enabled: errors.append("coverage.enabled must include foundation")
                elif any(group not in COMPONENT_GROUPS for group in enabled): errors.append("coverage.enabled contains an unsupported group")
                if authoring.get("path") == "focused" and len(enabled) < 2: errors.append("focused authoring needs one non-foundation component")
                if authoring.get("path") == "complete" and set(enabled) != set(COMPONENT_GROUPS): errors.append("complete authoring must enable all component groups")
                components = visual_tokens.get("components", {})
                if not isinstance(components, dict):
                    errors.append("components must be an object")
                else:
                    for group, values in components.items():
                        if group not in COMPONENT_KEYS:
                            errors.append(f"components contains unsupported group: {group}")
                        elif not isinstance(values, dict):
                            errors.append(f"components.{group} must be an object")
                        else:
                            for key in values:
                                if key not in COMPONENT_KEYS[group]: errors.append(f"components.{group} contains geometry or unsupported field: {key}")
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"invalid component token file: {exc}")
    for key in ASSET_PATHS:
        value = manifest.get("assets", {}).get(key)
        if not isinstance(value, str) or not value:
            errors.append(f"assets.{key} must be a relative path")
            continue
        candidate = Path(value)
        if candidate.is_absolute() or ".." in candidate.parts:
            errors.append(f"assets.{key} must stay inside the pack")
        elif not (root / candidate).is_file() and value not in missing_assets:
            (errors if args.strict_assets else warnings).append(f"missing asset: {value}")
            missing_assets.add(value)
    for warning in warnings: print(f"WARN {warning}", file=sys.stderr)
    for error in errors: print(f"ERROR {error}", file=sys.stderr)
    print(f"{'VALID' if not errors else 'INVALID'} {manifest_path}")
    return 1 if errors else 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)
    create_parser = commands.add_parser("create")
    create_parser.add_argument("theme_id")
    create_parser.add_argument("--name")
    create_parser.add_argument("--mode", choices=("dark", "light"), default="dark")
    create_parser.add_argument("--output", default=".")
    create_parser.add_argument("--path", choices=("focused", "complete", "assisted"), default="assisted")
    create_parser.add_argument("--components", help="comma-separated component groups for focused authoring")
    create_parser.set_defaults(handler=create)
    validate_parser = commands.add_parser("validate")
    validate_parser.add_argument("path")
    validate_parser.add_argument("--strict-assets", action="store_true")
    validate_parser.set_defaults(handler=validate)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        return args.handler(args)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
