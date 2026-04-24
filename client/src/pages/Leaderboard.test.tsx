import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "./Leaderboard";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("../api/axios", () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock("../hooks/useAuth", () => ({
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
    let requestCount = 0;
    mockGet.mockImplementation(() => {
      requestCount += 1;
      if (requestCount === 1) {
        return Promise.reject({ response: { status: 500 } });
      }

      return Promise.resolve({
        data: {
          data: [
            { rank: 1, userId: 7, displayName: "Casey", points: 12 },
          ],
          meta: { totalPages: 1 },
        },
      });
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
    expect(screen.getAllByText("Casey")).toHaveLength(2);
    expect(screen.getByText("12 pts")).toBeInTheDocument();
  });
});
