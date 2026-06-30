import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InstallBanner from "../../components/InstallBanner";

describe("InstallBanner", () => {
  it("does not render when already installed as standalone", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows iOS install instructions on iPhone Safari", () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      standalone: false,
    });

    localStorage.removeItem("pitchpulse26-pwa-install-dismissed");

    render(<InstallBanner />);

    expect(screen.getByText("Add PitchPulse 26 to your home screen")).toBeInTheDocument();
    expect(screen.getByText(/Tap Share, then Add to Home Screen/i)).toBeInTheDocument();
  });
});
