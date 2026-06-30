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

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isAndroidChrome() {
  const ua = window.navigator.userAgent;
  return /Android/.test(ua) && /Chrome/.test(ua);
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
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || readDismissed()) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
      setShowIosHelp(false);
      setShowAndroidHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    if (isIosSafari()) {
      setShowIosHelp(true);
      setVisible(true);
    } else if (isAndroidChrome()) {
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

  const handleInstall = async () => {
    if (!installEvent) {
      if (showIosHelp || showAndroidHelp) return;
      return;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      dismiss();
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  const canNativeInstall = Boolean(installEvent);

  return (
    <section
      className="border-b border-emerald-500/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(6,16,9,0.96))] px-4 py-3"
      aria-label="Install PitchPulse 26"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Add PitchPulse 26 to your home screen</p>
          {showIosHelp && (
            <p className="mt-1 text-xs text-white/75">
              iPhone Safari: Tap Share, then Add to Home Screen.
            </p>
          )}
          {showAndroidHelp && !canNativeInstall && (
            <p className="mt-1 text-xs text-white/75">
              Android Chrome: Tap Install or Add to Home Screen.
            </p>
          )}
          {canNativeInstall && (
            <p className="mt-1 text-xs text-white/75">
              Install the app for quicker access to matches and predictions.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canNativeInstall && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {installing ? "Installing…" : "Install App"}
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
