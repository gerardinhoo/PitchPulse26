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

/** Any iPhone/iPad browser — Safari, Chrome, Firefox, etc. */
function isIosDevice() {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent);
}

function canUseWebShare() {
  return typeof navigator.share === "function";
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
  const [sharing, setSharing] = useState(false);

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

    if (isIosDevice()) {
      setShowIosHelp(true);
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

  const handleIosShare = async () => {
    if (!canUseWebShare()) return;

    setSharing(true);
    try {
      await navigator.share({
        title: "PitchPulse 26",
        text: "World Cup predictions — add to your home screen",
        url: window.location.href,
      });
    } catch (err: unknown) {
      // User cancelled the share sheet — not an error.
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setSharing(false);
    }
  };

  if (!visible) return null;

  const canNativeInstall = Boolean(installEvent);
  const showShareButton = showIosHelp && canUseWebShare();

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
              {showShareButton
                ? "Tap the button below, then choose Add to Home Screen in the share menu."
                : "Open the browser menu (⋯), tap Share, then Add to Home Screen."}
            </p>
          )}
          {showAndroidHelp && !canNativeInstall && (
            <p className="mt-1 text-xs text-white/75">
              Open the browser menu (⋮) and tap Install app or Add to Home screen.
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
              onClick={handleNativeInstall}
              disabled={installing}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {installing ? "Installing…" : "Install App"}
            </button>
          )}
          {showShareButton && (
            <button
              type="button"
              onClick={handleIosShare}
              disabled={sharing}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {sharing ? "Opening…" : "Add to Home Screen"}
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
