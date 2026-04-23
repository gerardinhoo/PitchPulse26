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
    mockGet
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        data: {
          data: [],
        },
      });
    mockPost.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <Matches />
      </MemoryRouter>,
    );

    const homeInput = await screen.findByPlaceholderText("H");
    const awayInput = screen.getByPlaceholderText("A");

    fireEvent.change(homeInput, { target: { value: "2" } });
    fireEvent.change(awayInput, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

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
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("shows inline retry guidance when saving fails", async () => {
    mockGet
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        data: {
          data: [],
        },
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

    const homeInput = await screen.findByPlaceholderText("H");
    const awayInput = screen.getByPlaceholderText("A");

    fireEvent.change(homeInput, { target: { value: "2" } });
    fireEvent.change(awayInput, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText("Predictions are locked after kickoff. Try again."),
    ).toBeInTheDocument();
  });
});
