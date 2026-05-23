import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "../../components/AppErrorBoundary";

let shouldThrow = true;

function ExplodingChild() {
  if (shouldThrow) {
    throw new Error("boom");
  }

  return <div>Recovered screen</div>;
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
  });

  it("shows a friendly fallback with retry and home navigation when rendering fails", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <AppErrorBoundary>
          <ExplodingChild />
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "We hit an unexpected app error." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "frontend.error_boundary.caught",
      expect.objectContaining({
        message: "boom",
      }),
    );
  });

  it("retries rendering the child tree when the user clicks try again", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <AppErrorBoundary>
          <ExplodingChild />
        </AppErrorBoundary>
      </MemoryRouter>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Recovered screen")).toBeInTheDocument();
  });
});
