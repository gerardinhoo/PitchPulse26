import { useEffect, useState } from "react";

const DISMISS_KEY = "pitchpulse26-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  return isIosDevice() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function isIosChrome() {
  return isIosDevice() && /CriOS/.test(window.navigator.userAgent);
}

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent);
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore storage failures (e.g. private browsing).
  }
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuide, setIosGuide] = useState<"safari" | "chrome" | null>(null);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || readDismissed()) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
      setIosGuide(null);
      setShowAndroidHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    if (isIosSafari()) {
      setIosGuide("safari");
      setVisible(true);
    } else if (isIosChrome() || isIosDevice()) {
      // Other iOS browsers (Chrome, Firefox, etc.) cannot install PWAs like Safari.
      setIosGuide("chrome");
      setVisible(true);
    } else if (isAndroidDevice()) {
      setShowAndroidHelp(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    writeDismissed();
    setVisible(false);
    setInstallEvent(null);
  };

  const handleNativeInstall = async () => {
    if (!installEvent) return;

    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      dismiss();
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyLink = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API access.
      window.prompt("Copy this link and open it in Safari:", url);
    }
  };

  if (!visible) return null;

  const canNativeInstall = Boolean(installEvent);

  return (
    <section
      className="border-b border-emerald-500/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(6,16,9,0.96))] px-4 py-3"
      aria-label="Install PitchPulse 26"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Add PitchPulse 26 to your home screen</p>

          {iosGuide === "safari" && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-white/80">
              <li>
                Tap the <strong className="text-white">Share</strong> button{" "}
                <span className="text-white/90">(□↑)</span> in Safari&apos;s{" "}
                <strong className="text-white">bottom toolbar</strong>
              </li>
              <li>
                Scroll down and tap <strong className="text-white">Add to Home Screen</strong>
              </li>
              <li>
                Tap <strong className="text-white">Add</strong> in the top-right corner
              </li>
            </ol>
          )}

          {iosGuide === "chrome" && (
            <div className="mt-2 space-y-1 text-xs text-white/80">
              <p>
                On iPhone, home screen install only works in{" "}
                <strong className="text-white">Safari</strong> — not Chrome or other browsers.
              </p>
              <p>
                Copy the link below, open <strong className="text-white">Safari</strong>, paste it
                in the address bar, then use Share → Add to Home Screen.
              </p>
            </div>
          )}

          {showAndroidHelp && !canNativeInstall && (
            <p className="mt-2 text-xs text-white/80">
              Open the browser menu <span className="text-white/90">(⋮)</span> and tap{" "}
              <strong className="text-white">Install app</strong> or{" "}
              <strong className="text-white">Add to Home screen</strong>.
            </p>
          )}

          {canNativeInstall && (
            <p className="mt-2 text-xs text-white/80">
              Install the app for quicker access to matches and predictions.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canNativeInstall && (
            <button
              type="button"
              onClick={handleNativeInstall}
              disabled={installing}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {installing ? "Installing…" : "Install App"}
            </button>
          )}
          {iosGuide === "chrome" && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}
