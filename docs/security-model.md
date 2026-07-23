# Security model

## Protected assets

The theme workflow must protect Codex chats, credentials, account/session data,
API keys, model configuration, unrelated local files, application integrity, and
the user's network boundary.

## Trust boundaries

- A theme archive is untrusted input until its manifest, paths, sizes, and asset
  types are validated.
- A locally running process is not assumed to be Codex because it owns a port.
- A debugging endpoint is privileged even when intended only for presentation.

## Required controls

1. Reject absolute paths, `..` traversal, symlinks escaping the pack, scripts in
   asset locations, unreasonable file sizes, and undeclared executable content.
2. Bind debugging only to `127.0.0.1` and verify the target process belongs to
   Codex.
3. Use project-owned data directories and atomic writes. Never change the signed
   app bundle, ownership, or signature.
4. Back up only project-owned activation state and provide idempotent restore.
5. Ask for explicit confirmation before terminating or restarting Codex.
6. Do not inspect chats, credentials, models, accounts, or unrelated processes.
7. Separate Build and Publish capabilities. Build may submit only bounded public
   manifest/preview data; Publish is issued only after author confirmation and is
   bound to the confirmed draft SHA-256. Store only token hashes and reject any
   final archive whose public content differs from that digest.

The platform launchers and every live runtime attachment enforce item 2. On
macOS the loopback listener must resolve to the declared main executable of a
validly signed `com.openai.codex` app from OpenAI team `2DC432GLL2`; the bundle
filename is not trusted and may currently be `ChatGPT.app`. On Windows it must
resolve to `ChatGPT.exe` inside the matching installed `OpenAI.Codex` Appx
root. The listener address must be exactly `127.0.0.1`, never a wildcard.
Ownership is checked before target discovery and again before a WebSocket is
opened. Screenshot verification uses the same installed helper. If a watch
poll later fails ownership, existing runtime sessions are closed before
retrying. Live CDP operation is unsupported on other platforms and fails
closed.

An automatically found port must also expose the main `app://-/index.html`
renderer. Occupied ports owned by another process are skipped. Automatic
selection is limited to `9341-9399`, and the chosen port is recorded so pause,
verify, and restore do not guess.

Runtime screenshot verification is opt-in and captures only the current Codex
renderer through its loopback endpoint. Output uses exclusive creation, has a
32 MB limit, and is rejected unless it is a valid PNG. Native pack preview
capture is separately opt-in through `capture-preview --confirm-clean`. It
reads only theme id, route, compatibility, invariant status, and viewport size,
then captures the visible page as a bounded JPEG. It never evaluates text
content or reads chat storage, credentials, browser storage, or unrelated
windows. Authors must open a clean demo workspace before acknowledging capture.

The standard `render-preview` command has no Codex runtime connection. It reads
only files declared inside the selected theme pack and renders fixed demo text
in an isolated headless Chromium process. It cannot collect sidebar chat titles,
task contents, credentials, account details, or workspace paths because none of
those sources are opened or queried.

## Failure behavior

On validation, copy, activation, or verification failure, stop, roll back to the
last valid pointer, and explain what remains. Never continue with a partial
theme. After a Codex update, an incompatible visual layer must disable itself and
offer restore.

## Non-goals

The project is not a credential manager, chat exporter, general Electron patcher,
or remote-control service. MCP is not required for local theme installation and
is intentionally outside the MVP.
