import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Matches from "../../pages/Matches";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, email: "user@example.com", emailVerified: true },
  }),
}));

vi.mock("../../utils/tournamentComplete", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/tournamentComplete")>();
  return {
    ...actual,
    POST_TOURNAMENT_UX_FREEZE: false,
  };
});

describe("Matches", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    vi.stubGlobal(
      "scrollTo",
      vi.fn<[ScrollToOptions | number | undefined, number | undefined], void>(),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows inline success feedback after saving a prediction", async () => {
    mockGet.mockImplementation((url: string, config?: { params?: { page?: number; limit?: number } }) => {
      if (url === "/matches") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 10,
                date: "2099-06-01T15:00:00.000Z",
                homeTeam: { name: "Argentina", code: "ar", group: "A" },
                awayTeam: { name: "Brazil", code: "br", group: "A" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1, ...(config?.params?.limit ? { limit: config.params.limit } : {}) },
          },
        });
      }

      if (url === "/predictions/summary") {
        return Promise.resolve({
          data: {
            predictedCount: 0,
            remainingCount: 1,
            lockedCount: 0,
            nextMatch: {
              id: 10,
              date: "2099-06-01T15:00:00.000Z",
              homeTeam: { name: "Argentina", code: "ar", group: "A" },
              awayTeam: { name: "Brazil", code: "br", group: "A" },
              homeScore: null,
              awayScore: null,
            },
            rank: null,
            points: null,
          },
        });
      }

      return Promise.resolve({
        data: {
          data: [],
          meta: { totalPages: 1 },
        },
      });
    });
    mockPost.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <Matches />
      </MemoryRouter>,
    );

    const homeInput = await screen.findByLabelText("Argentina predicted score");
    const awayInput = screen.getByLabelText("Brazil predicted score");

    fireEvent.change(homeInput, { target: { value: "2" } });
    fireEvent.change(awayInput, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", {
      name: "Submit prediction for Argentina versus Brazil",
    }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/predictions", {
        matchId: 10,
        homeScore: 2,
        awayScore: 1,
      });
    });

    expect(
      await screen.findByText(/Prediction saved — 2 – 1/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Update prediction for Argentina versus Brazil",
    })).toBeInTheDocument();
  });

  it("shows inline retry guidance when saving fails", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/matches") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 10,
                date: "2099-06-01T15:00:00.000Z",
                homeTeam: { name: "Argentina", code: "ar", group: "A" },
                awayTeam: { name: "Brazil", code: "br", group: "A" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1 },
          },
        });
      }

      if (url === "/predictions/summary") {
        return Promise.resolve({
          data: {
            predictedCount: 0,
            remainingCount: 1,
            lockedCount: 0,
            nextMatch: {
              id: 10,
              date: "2099-06-01T15:00:00.000Z",
              homeTeam: { name: "Argentina", code: "ar", group: "A" },
              awayTeam: { name: "Brazil", code: "br", group: "A" },
              homeScore: null,
              awayScore: null,
            },
            rank: null,
            points: null,
          },
        });
      }

      return Promise.resolve({
        data: {
          data: [],
          meta: { totalPages: 1 },
        },
      });
    });
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          error: "Predictions are locked after kickoff",
        },
      },
    });

    render(
      <MemoryRouter>
        <Matches />
      </MemoryRouter>,
    );

    const homeInput = await screen.findByLabelText("Argentina predicted score");
    const awayInput = screen.getByLabelText("Brazil predicted score");

    fireEvent.change(homeInput, { target: { value: "2" } });
    fireEvent.change(awayInput, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", {
      name: "Submit prediction for Argentina versus Brazil",
    }));

    expect(
      await screen.findByText(/Predictions are locked after kickoff\. Try again\./),
    ).toBeInTheDocument();
  });

  it("shows an offline state with retry when matches fail to load", async () => {
    let matchRequestCount = 0;
    mockGet.mockImplementation((url: string) => {
      if (url === "/matches") {
        matchRequestCount += 1;
        if (matchRequestCount === 1) {
          return Promise.reject(new Error("Network Error"));
        }

        return Promise.resolve({
          data: {
            data: [
              {
                id: 11,
                date: "2099-06-01T15:00:00.000Z",
                homeTeam: { name: "Spain", code: "es", group: "B" },
                awayTeam: { name: "France", code: "fr", group: "B" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1 },
          },
        });
      }

      if (url === "/predictions/summary") {
        return Promise.resolve({
          data: {
            predictedCount: 0,
            remainingCount: 1,
            lockedCount: 0,
            nextMatch: {
              id: 11,
              date: "2099-06-01T15:00:00.000Z",
              homeTeam: { name: "Spain", code: "es", group: "B" },
              awayTeam: { name: "France", code: "fr", group: "B" },
              homeScore: null,
              awayScore: null,
            },
            rank: null,
            points: null,
          },
        });
      }

      return Promise.resolve({
        data: {
          data: [],
          meta: { totalPages: 1 },
        },
      });
    });

    render(
      <MemoryRouter>
        <Matches />
      </MemoryRouter>,
    );

    expect(await screen.findByText("You're offline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByLabelText("Spain predicted score")).toBeInTheDocument();
  });

  it("does not show the verification gate when verification is temporarily disabled", async () => {
    vi.stubEnv("VITE_REQUIRE_EMAIL_VERIFICATION", "false");

    mockGet.mockImplementation((url: string) => {
      if (url === "/matches") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 12,
                date: "2099-06-01T15:00:00.000Z",
                homeTeam: { name: "Mexico", code: "mx", group: "C" },
                awayTeam: { name: "Japan", code: "jp", group: "C" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1 },
          },
        });
      }

      if (url === "/predictions/summary") {
        return Promise.resolve({
          data: {
            predictedCount: 0,
            remainingCount: 1,
            lockedCount: 0,
            nextMatch: {
              id: 12,
              date: "2099-06-01T15:00:00.000Z",
              homeTeam: { name: "Mexico", code: "mx", group: "C" },
              awayTeam: { name: "Japan", code: "jp", group: "C" },
              homeScore: null,
              awayScore: null,
            },
            rank: null,
            points: null,
          },
        });
      }

      return Promise.resolve({
        data: {
          data: [],
          meta: { totalPages: 1 },
        },
      });
    });

    render(
      <MemoryRouter>
        <Matches />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", {
        name: "Submit prediction for Mexico versus Japan",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Verification Required")).not.toBeInTheDocument();
  });

  it("shows archive mode when the Final is complete", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/matches") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 50,
                date: "2026-07-19T19:00:00.000Z",
                tournamentStage: "FINAL",
                homeTeam: { name: "Spain", code: "es", group: "H" },
                awayTeam: { name: "Argentina", code: "ar", group: "J" },
                homeScore: 1,
                awayScore: 0,
              },
              {
                id: 40,
                date: "2026-06-14T18:00:00.000Z",
                tournamentStage: "GROUP_STAGE",
                homeTeam: { name: "France", code: "fr", group: "I" },
                awayTeam: { name: "Senegal", code: "sn", group: "I" },
                homeScore: 2,
                awayScore: 1,
              },
            ],
            meta: { totalPages: 1 },
          },
        });
      }

      if (url === "/predictions/my") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 1,
                matchId: 40,
                homeScore: 2,
                awayScore: 1,
                match: {
                  id: 40,
                  date: "2026-06-14T18:00:00.000Z",
                  tournamentStage: "GROUP_STAGE",
                  homeTeam: { name: "France", code: "fr", group: "I" },
                  awayTeam: { name: "Senegal", code: "sn", group: "I" },
                  homeScore: 2,
                  awayScore: 1,
                },
              },
            ],
            meta: { totalPages: 1 },
          },
        });
      }

      if (url === "/predictions/summary") {
        return Promise.resolve({
          data: {
            predictedCount: 1,
            remainingCount: 0,
            lockedCount: 0,
            nextMatch: null,
            rank: 3,
            points: 3,
          },
        });
      }

      return Promise.resolve({ data: { data: [] }, meta: { totalPages: 1 } });
    });

    render(
      <MemoryRouter initialEntries={["/matches"]}>
        <Matches />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Tournament Match Archive")).toBeInTheDocument();
    expect(screen.getByText(/Predictions are closed/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Completed", pressed: true }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/predicted score/i)).not.toBeInTheDocument();
    expect(screen.getByText("Your prediction history")).toBeInTheDocument();
    expect(screen.getAllByText(/Exact score/i).length).toBeGreaterThanOrEqual(1);
  });
});
