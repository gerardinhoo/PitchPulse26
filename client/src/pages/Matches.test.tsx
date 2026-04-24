import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Matches from "./Matches";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("../api/axios", () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, email: "user@example.com", emailVerified: true },
  }),
}));

describe("Matches", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    vi.stubGlobal(
      "scrollTo",
      vi.fn<[ScrollToOptions | number | undefined, number | undefined], void>(),
    );
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
                homeTeam: { name: "Argentina", code: "ar" },
                awayTeam: { name: "Brazil", code: "br" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1, ...(config?.params?.limit ? { limit: config.params.limit } : {}) },
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
      await screen.findByText("Prediction saved — 2 – 1"),
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
                homeTeam: { name: "Argentina", code: "ar" },
                awayTeam: { name: "Brazil", code: "br" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1 },
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
      await screen.findByText("Predictions are locked after kickoff. Try again."),
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
                homeTeam: { name: "Spain", code: "es" },
                awayTeam: { name: "France", code: "fr" },
                homeScore: null,
                awayScore: null,
              },
            ],
            meta: { totalPages: 1 },
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
});
