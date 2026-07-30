import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "../../pages/Leaderboard";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 7 },
  }),
}));

describe("Leaderboard", () => {
  beforeEach(() => {
    mockGet.mockReset();
    vi.stubGlobal(
      "scrollTo",
      vi.fn<[ScrollToOptions | number | undefined, number | undefined], void>(),
    );
  });

  it("shows a retryable error state when the leaderboard request fails", async () => {
    let leaderboardAttempts = 0;
    mockGet.mockImplementation((url: string) => {
      if (url === "/leaderboard") {
        leaderboardAttempts += 1;
        if (leaderboardAttempts === 1) {
          return Promise.reject({ response: { status: 500 } });
        }

        return Promise.resolve({
          data: {
            data: [
              { rank: 1, tiedCount: 1, userId: 7, displayName: "Casey", points: 12 },
            ],
            meta: { totalPages: 1 },
            currentUser: { rank: 1, tiedCount: 1, userId: 7, displayName: "Casey", points: 12 },
          },
        });
      }

      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Leaderboard is taking a breather"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Your Standing")).toBeInTheDocument();
    expect(screen.getByText("Final PitchPulse 26 Standings")).toBeInTheDocument();
    expect(screen.getByText("PitchPulse 26 Champion")).toBeInTheDocument();
    expect(screen.getAllByText("Casey").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("12 pts").length).toBeGreaterThanOrEqual(1);
    expect(leaderboardAttempts).toBe(2);
  });

  it("derives champion copy from leaderboard data when the Final is complete", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/leaderboard") {
        return Promise.resolve({
          data: {
            data: [
              { rank: 1, tiedCount: 1, userId: 1, displayName: "Jimbo", points: 84 },
              { rank: 2, tiedCount: 1, userId: 2, displayName: "MaluY", points: 77 },
            ],
            meta: { totalPages: 1 },
            currentUser: null,
          },
        });
      }

      if (url === "/matches") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 999,
                tournamentStage: "FINAL",
                homeScore: 1,
                awayScore: 0,
              },
            ],
          },
        });
      }

      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Final PitchPulse 26 Standings")).toBeInTheDocument();
    expect(screen.getByText("PitchPulse 26 Champion")).toBeInTheDocument();
    expect(screen.getAllByText("Jimbo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("84 points")).toBeInTheDocument();
    expect(screen.getByText(/Jimbo — PitchPulse 26 Champion/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share Final Standings" })).toBeInTheDocument();
  });
});
