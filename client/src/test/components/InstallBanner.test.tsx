import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InstallBanner from "../../components/InstallBanner";

function mockMatchMedia(standalone = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query === "(display-mode: standalone)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("InstallBanner", () => {
  it("does not render when already installed as standalone", () => {
    mockMatchMedia(true);

    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Safari toolbar steps on iPhone Safari", () => {
    mockMatchMedia(false);

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByText("Add PitchPulse 26 to your home screen")).toBeInTheDocument();
    expect(screen.getByText(/bottom toolbar/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy link/i })).not.toBeInTheDocument();
  });

  it("shows copy-link guidance on iPhone Chrome", () => {
    mockMatchMedia(false);

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByText(/home screen install only works/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });

  it("copies the site link for iPhone Chrome users", async () => {
    mockMatchMedia(false);

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      clipboard: { writeText },
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);
    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalled();
  });

  it("shows Android install help when on Android Chrome", () => {
    mockMatchMedia(false);

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
      standalone: false,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByText(/install app/i)).toBeInTheDocument();
  });
});
