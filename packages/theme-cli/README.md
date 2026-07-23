# Get Codex Theme CLI

Install, switch, validate, and safely restore themes for Codex Desktop.
Node.js 22 or later is required.

```bash
npx -y get-codex-theme list
npx -y get-codex-theme use aurora-glass
npx -y get-codex-theme doctor
```

`use` installs and selects without restarting Codex. Run `launch` only when you
want the unofficial loopback CDP compatibility layer, and add `--restart` only
after deciding that the running Codex task may be closed.

Optional local controls are installed with a theme pack:

```bash
npx -y get-codex-theme menu-bar start   # macOS
npx -y get-codex-theme tray start       # Windows
npx -y get-codex-theme watchdog enable  # macOS, opt-in session supervision
```

The default Watchdog waits for a debug-enabled Codex session and restarts only
the injector; it never launches or restarts Codex. `pause` only hides visuals;
the injector and loopback CDP session remain active. Quit the themed Codex
session and reopen Codex normally for a complete restore.

`watchdog enable --persistent` is a separate, explicit macOS opt-in. It defers
the currently running Codex instance, then may restart a future normal launch
once with the loopback theme arguments. Disable it with `watchdog disable`.

The visual compatibility runtime is unofficial. It binds only to loopback,
does not patch the signed Codex application, and keeps restoration available.

Documentation and source: https://github.com/ViisOpen/get-codex-theme

## Authoring paths

Run `create` with only a theme id from an interactive terminal to open the
authoring wizard:

```bash
npx get-codex-theme create my-theme
```

The wizard explains three paths before it writes anything and recommends
Assisted by default:

- **Focused** styles Foundation plus the component groups you select. Every
  required token in a selected group is generated; unselected groups inherit
  adaptive runtime defaults.
- **Complete** generates every supported component group.
- **Assisted** generates safe complete defaults from a palette and style preset.
  In the `create` wizard, a local source image is optional; providing one uses
  the same local-only pipeline as `create-from-image`.

Before creating the directory, the wizard shows the resolved name, mode, path,
component selection or preset, output directory, and `Codex app: Will not be
modified`. Answering No cancels normally without writing files.

For scripts and agents, provide the authoring path explicitly and add
`--non-interactive`. Focused also requires `--components`. These invocations
never prompt and fail clearly when a required authoring option is missing:

```bash
# Foundation plus selected groups
npx -y get-codex-theme create my-theme --name "My Theme" --mode dark \
  --path focused --components buttons,icons --output ./themes --non-interactive

# Every required token in all seven groups
npx -y get-codex-theme create my-theme --name "My Theme" --mode dark \
  --path complete --output ./themes --non-interactive

# Image-derived adaptive baseline, ready for targeted overrides
npx -y get-codex-theme create-from-image art.png my-theme --name "My Theme" \
  --mode dark --path assisted --preset soft --output ./themes --non-interactive

npx -y get-codex-theme coverage ./my-theme
```

When either stdin or stdout is not a TTY, incomplete authoring flags fail fast;
the CLI never silently chooses Focused, Complete, or Assisted. Complete flags
remain deterministic with or without a TTY. Theme creation only writes a draft
pack and never launches, restarts, or injects Codex.

Themes contain bounded component tokens only. Raw CSS, HTML, JavaScript,
selectors, and SVG paths are not accepted by the public validator.

## Local release QA

Static validation and `pack` do not prove that every current Codex surface is
readable. After the author explicitly approves local testing, record the current
state, install and select the exact local directory, and verify its identity:

```bash
npx -y get-codex-theme status --json
npx -y get-codex-theme doctor --json
npx -y get-codex-theme use ./my-theme
npx -y get-codex-theme status --json
```

`use` does not launch or restart Codex. Ask separately before `launch`; require
the user to save active work before any approved `--restart`. Test with a clean
demo workspace and inspect welcome branding, Home, Task, sidebar menus, expanded
terminal, Settings, banners, dialogs, Review and Dismiss actions, form states,
and a narrow window. Test `restore` before calling the candidate ready to
publish. Command success alone does not replace author visual acceptance.

## Secure agent publishing

Publishing keeps two separate capabilities inside one proof-of-possession-bound
agent session. Paste the portal's Session Prompt into Codex once. The pinned
0.7.0 client submits only the validated manifest, public previews, and evidence,
then waits for website confirmation:

```bash
npx --yes get-codex-theme@0.7.0 publish-session ./my-theme \
  --registry https://getcodextheme.com --session-stdin --json
```

After the author reviews the exact page and accepts the current terms, the
server encrypts a different 15-minute Publish capability to the CLI's ephemeral
RSA-OAEP key. The same command decrypts it in memory and continues. The second
capability is never shown to the user.

The publisher reads only files declared by the theme manifest, creates its ZIP
inside an OS temporary directory, performs strict local validation, and removes
the temporary archive whether the request succeeds or fails. Submission codes
can be sent only to Get Codex Theme over HTTPS, or to loopback during local
development. The server stores the original ZIP under a
private quarantine key, independently validates and sanitizes it, compares the
result with the author-confirmed draft digest, and consumes the Publish capability
when the attempt completes. Authorized brand assets are allowed. Unsupported
licenses, duplicate archives, and burst activity fail automatically with a specific
error instead of entering a human review queue.

## Privacy-safe HTML/CSS previews

Generate the standard public gallery images without opening Codex:

```bash
npx -y get-codex-theme render-preview ./my-theme --state all
```

The command renders Home, Task, and narrow in a shared deterministic HTML/CSS
shell using fixed demo content. It reads only the theme pack and cannot access
chat titles, task contents, account data, or workspace paths. Existing images
require `--force`.

## Optional native preview capture

For compatibility QA only, use a separate, explicitly authorized live-testing
phase to capture the real Codex page. The
active installed theme must exactly match the source pack. Open a clean demo
workspace with no private content, put Codex on the requested route, and run:

```bash
npx -y get-codex-theme capture-preview ./my-theme --state home --codex-version VERSION --confirm-clean
npx -y get-codex-theme capture-preview ./my-theme --state task --codex-version VERSION --confirm-clean
npx -y get-codex-theme capture-preview ./my-theme --state narrow --codex-version VERSION --confirm-clean
```

The renderer uses the native DOM, icons, typography, responsive behavior, and
styles already loaded by the signed Codex app. It reads only structural runtime
metadata, refuses changed native geometry, restores viewport emulation after
each image, and does not bundle Codex source code. Existing files require an
explicit `--force`. After all three captures match, the CLI uses Home as the
gallery preview and records verified platform and Codex-version metadata.
