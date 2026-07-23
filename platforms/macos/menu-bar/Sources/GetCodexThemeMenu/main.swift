import AppKit
import Foundation

private struct Theme: Decodable {
    let id: String
    let name: String
    let version: String?
    let mode: String
}

private struct ThemeSnapshot: Decodable {
    let activeThemeId: String?
    let paused: Bool
    let stockAppearance: Bool
    let themes: [Theme]
}

private struct CommandResult {
    let status: Int32
    let stdout: String
    let stderr: String
}

private final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let libraryRoot: String
    private let controllerPath: String
    private let lifecyclePath: String
    private let nodePath: String?
    private var snapshot: ThemeSnapshot?
    private var refreshTimer: Timer?
    private var launchInProgress = false

    override init() {
        let environment = ProcessInfo.processInfo.environment
        if let configured = environment["CODEX_THEME_HOME"], !configured.isEmpty {
            libraryRoot = NSString(string: configured).expandingTildeInPath
        } else {
            libraryRoot = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent(".codex/get-codex-theme").path
        }
        controllerPath = URL(fileURLWithPath: libraryRoot)
            .appendingPathComponent("runtime/theme-control.mjs").path
        lifecyclePath = URL(fileURLWithPath: libraryRoot)
            .appendingPathComponent("runtime/macos-lifecycle.mjs").path
        var nodeCandidates: [String] = []
        if let configuredNode = environment["GCT_NODE_PATH"], !configuredNode.isEmpty {
            nodeCandidates.append(configuredNode)
        }
        nodeCandidates.append(contentsOf: ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"])
        if let searchPath = environment["PATH"] {
            nodeCandidates.append(contentsOf: searchPath.split(separator: ":").map { "\($0)/node" })
        }
        nodePath = nodeCandidates.first { FileManager.default.isExecutableFile(atPath: $0) }
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        statusItem.button?.title = "◈"
        statusItem.button?.toolTip = "Get Codex Theme"
        let menu = NSMenu(title: "Get Codex Theme")
        menu.delegate = self
        statusItem.menu = menu
        refresh()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        refreshTimer?.invalidate()
    }

    func menuWillOpen(_ menu: NSMenu) {
        refresh()
    }

    private func runController(_ arguments: [String]) -> Data? {
        guard FileManager.default.fileExists(atPath: controllerPath), let nodePath else { return nil }
        let process = Process()
        let output = Pipe()
        let errors = Pipe()
        process.executableURL = URL(fileURLWithPath: nodePath)
        process.arguments = [controllerPath, "--library", libraryRoot] + arguments
        process.standardOutput = output
        process.standardError = errors
        do {
            try process.run()
            process.waitUntilExit()
            guard process.terminationStatus == 0 else { return nil }
            return output.fileHandleForReading.readDataToEndOfFile()
        } catch {
            return nil
        }
    }

    private func refresh() {
        guard let data = runController(["status"]),
              let value = try? JSONDecoder().decode(ThemeSnapshot.self, from: data) else {
            snapshot = nil
            statusItem.button?.title = launchInProgress ? "◈  Launching…" : "◈ !"
            rebuildMenu()
            return
        }
        snapshot = value
        statusItem.button?.title = launchInProgress ? "◈  Launching…" : value.paused ? "◈  Paused" : "◈"
        rebuildMenu()
    }

    private func runLifecycle(restart: Bool) -> CommandResult {
        guard FileManager.default.fileExists(atPath: lifecyclePath), let nodePath else {
            return CommandResult(status: 1, stdout: "", stderr: "The installed macOS lifecycle controller or Node.js runtime is unavailable.")
        }
        let process = Process()
        let output = Pipe()
        let errors = Pipe()
        process.executableURL = URL(fileURLWithPath: nodePath)
        process.arguments = [lifecyclePath, "--library", libraryRoot] + (restart ? ["--restart"] : [])
        process.standardOutput = output
        process.standardError = errors
        do {
            try process.run()
            process.waitUntilExit()
            return CommandResult(
                status: process.terminationStatus,
                stdout: String(data: output.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? "",
                stderr: String(data: errors.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            )
        } catch {
            return CommandResult(status: 1, stdout: "", stderr: error.localizedDescription)
        }
    }

    private func rebuildMenu() {
        guard let menu = statusItem.menu else { return }
        menu.removeAllItems()

        let title = NSMenuItem(title: "Get Codex Theme", action: nil, keyEquivalent: "")
        title.isEnabled = false
        menu.addItem(title)
        menu.addItem(.separator())

        let launch = item(launchInProgress ? "Opening Codex with Theme…" : "Open Codex with Theme", #selector(openCodexWithTheme))
        launch.isEnabled = !launchInProgress && nodePath != nil && FileManager.default.fileExists(atPath: lifecyclePath)
        menu.addItem(launch)
        menu.addItem(.separator())

        guard let snapshot else {
            let unavailable = NSMenuItem(title: "Theme controller unavailable", action: nil, keyEquivalent: "")
            unavailable.isEnabled = false
            menu.addItem(unavailable)
            menu.addItem(item("Open Theme Gallery", #selector(openGallery)))
            menu.addItem(.separator())
            menu.addItem(item("Quit Menu Bar", #selector(quit)))
            return
        }

        if snapshot.themes.isEmpty {
            let empty = NSMenuItem(title: "No installed themes", action: nil, keyEquivalent: "")
            empty.isEnabled = false
            menu.addItem(empty)
        } else {
            for theme in snapshot.themes {
                let themeItem = item(theme.name, #selector(selectTheme(_:)))
                themeItem.representedObject = theme.id
                themeItem.state = theme.id == snapshot.activeThemeId && !snapshot.paused ? .on : .off
                themeItem.toolTip = [theme.mode.capitalized, theme.version].compactMap { $0 }.joined(separator: " · ")
                menu.addItem(themeItem)
            }
        }

        menu.addItem(.separator())
        if snapshot.paused {
            let resume = item("Resume Selected Theme", #selector(resumeTheme))
            resume.isEnabled = snapshot.activeThemeId != nil
            menu.addItem(resume)
        } else {
            let pause = item("Pause Theme", #selector(pauseTheme))
            pause.isEnabled = snapshot.activeThemeId != nil
            menu.addItem(pause)
        }
        menu.addItem(item("Open Theme Gallery", #selector(openGallery)))
        menu.addItem(.separator())
        menu.addItem(item("Quit Menu Bar", #selector(quit)))
    }

    private func item(_ title: String, _ action: Selector) -> NSMenuItem {
        let value = NSMenuItem(title: title, action: action, keyEquivalent: "")
        value.target = self
        return value
    }

    private func perform(_ arguments: [String]) {
        _ = runController(arguments)
        refresh()
    }

    @objc private func selectTheme(_ sender: NSMenuItem) {
        guard let id = sender.representedObject as? String else { return }
        perform(["switch", id])
    }

    @objc private func pauseTheme() { perform(["pause"]) }
    @objc private func resumeTheme() { perform(["resume"]) }
    @objc private func openCodexWithTheme() { startLifecycle(restart: false) }

    private func startLifecycle(restart: Bool) {
        guard !launchInProgress else { return }
        launchInProgress = true
        refresh()
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let result = self.runLifecycle(restart: restart)
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.launchInProgress = false
                self.refresh()
                if result.status == 0 { return }
                if result.status == 20 {
                    let alert = NSAlert()
                    alert.alertStyle = .warning
                    alert.messageText = "Restart Codex to enable this theme?"
                    alert.informativeText = "Codex is already running without the theme endpoint. Save any active tasks first. Get Codex Theme will request a normal quit and will never force-close Codex."
                    alert.addButton(withTitle: "Restart Codex")
                    alert.addButton(withTitle: "Cancel")
                    if alert.runModal() == .alertFirstButtonReturn {
                        self.startLifecycle(restart: true)
                    }
                    return
                }
                let alert = NSAlert()
                alert.alertStyle = .critical
                alert.messageText = "Codex theme launch failed"
                let detail = result.stderr.trimmingCharacters(in: .whitespacesAndNewlines)
                alert.informativeText = detail.isEmpty ? "Run get-codex-theme doctor --live for diagnostics." : detail
                alert.addButton(withTitle: "OK")
                alert.runModal()
            }
        }
    }

    @objc private func openGallery() {
        if let url = URL(string: "https://getcodextheme.com") {
            NSWorkspace.shared.open(url)
        }
    }

    @objc private func quit() { NSApp.terminate(nil) }
}

private let app = NSApplication.shared
private let delegate = AppDelegate()
app.delegate = delegate
app.run()
