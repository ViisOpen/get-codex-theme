"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

type CopyState = "idle" | "command" | "codex" | "error";

type InstallCommandProps = {
  command: string;
  codexPrompt?: string;
};

export function InstallCommand({ command, codexPrompt }: InstallCommandProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | null>(null);
  const commandLabelId = useId();

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  async function copy(value: string, kind: "command" | "codex") {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
    } catch {
      setCopyState("error");
    }
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 2200);
  }

  const status = copyState === "command"
    ? "Command copied to clipboard."
    : copyState === "codex"
      ? "Codex prompt copied to clipboard."
      : copyState === "error"
        ? "Copy failed. Check clipboard permissions and try again."
        : "";

  return (
    <div className="install-command-block">
      <div className="install-command-value">
        <span className="install-command-label" id={commandLabelId}>Command</span>
        <code aria-labelledby={commandLabelId} tabIndex={0}>{command}</code>
      </div>
      <div aria-label="Copy options" className="install-command-actions" role="group">
        <button
          aria-label="Copy command to clipboard"
          data-copy-kind="command"
          onClick={() => void copy(command, "command")}
          type="button"
        >
          {copyState === "command" ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
          <span>{copyState === "command" ? "Copied" : "Copy command"}</span>
        </button>
        {codexPrompt ? (
          <button
            aria-label="Copy a task prompt for Codex"
            data-copy-kind="codex"
            onClick={() => void copy(codexPrompt, "codex")}
            type="button"
          >
            {copyState === "codex" ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
            <span>{copyState === "codex" ? "Copied for Codex" : "Copy for Codex"}</span>
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="install-command-status" role="status">{status}</p>
    </div>
  );
}
