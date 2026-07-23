# Windows tray switcher

The tray client uses built-in PowerShell, Windows Forms, and the shared
`runtime/theme-control.mjs` protocol. It does not launch or restart Codex.

After installing the runtime, start it explicitly:

```powershell
npx -y get-codex-theme tray start
```

The tray lists valid installed themes, switches immediately when the companion
runtime is active, pauses or resumes visuals, and opens the public theme
gallery. Pause does not close the injector or CDP session; reopen Codex
normally for a complete restore. Closing the tray does not stop the runtime.
