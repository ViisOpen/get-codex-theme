# Runtime notices

GetCodexTheme is an unofficial customization project and is not affiliated with, endorsed by, or sponsored by OpenAI. Codex and OpenAI names and marks belong to their respective owners.

The companion runtime uses a loopback Chromium DevTools Protocol endpoint. It does not redistribute, modify, or patch the official Codex application.

## Reference implementation attribution

The runtime architecture and platform-launch approach were informed by the MIT-licensed **Codex Dream Skin Studio / Codex-Dream-Skin-Forge** project:

- Repository: <https://github.com/tree0519/Codex-Dream-Skin-Forge>
- Reference revision: `1ade20a350f3d4abd71c4a7a9f99d3e782d2b664`
- Copyright © 2026 Codex Dream Skin Studio contributors
- License: MIT

The required MIT notice follows:

> MIT License
>
> Copyright (c) 2026 Codex Dream Skin Studio contributors
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

GetCodexTheme's new source is released under the repository's root license. Theme artwork keeps the license declared by each pack.

## Additional design research

`HeiGeAi/heige-codex-skin-studio` was reviewed at revision
`37091c1ebbf84d45a000cac793ab4885f04d108a` for product-level methods including
theme manifests, reversible switching, target isolation, and cleanup behavior.
GetCodexTheme's component tokens, route detection, renderer lifecycle, CSS, and
tests were independently designed and written. No HeiGe code or assets were
copied into this runtime.
