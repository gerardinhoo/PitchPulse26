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

  it("shows iOS install instructions on iPhone Safari", () => {
    mockMatchMedia(false);

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      share: vi.fn().mockResolvedValue(undefined),
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByText("Add PitchPulse 26 to your home screen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to home screen/i })).toBeInTheDocument();
  });

  it("shows iOS install banner on iPhone Chrome", () => {
    mockMatchMedia(false);

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      share: vi.fn().mockResolvedValue(undefined),
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByRole("button", { name: /add to home screen/i })).toBeInTheDocument();
  });

  it("opens the share sheet when the iOS install button is tapped", async () => {
    mockMatchMedia(false);

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
      share,
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);
    fireEvent.click(screen.getByRole("button", { name: /add to home screen/i }));

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "PitchPulse 26",
        url: expect.any(String),
      }),
    );
  });

  it("shows Android install help when on Android Chrome", () => {
    mockMatchMedia(false);

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
      standalone: false,
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByText(/install app or add to home screen/i)).toBeInTheDocument();
  });
});
