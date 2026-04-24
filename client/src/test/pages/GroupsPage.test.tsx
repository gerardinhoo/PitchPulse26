import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GroupsPage from "../../pages/GroupsPage";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: mockGet,
  },
}));

describe("GroupsPage", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("shows an offline state and retries loading standings", async () => {
    mockGet
      .mockResolvedValueOnce({ data: [{ name: "A" }, { name: "B" }] })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: [{ name: "A" }, { name: "B" }] })
      .mockResolvedValueOnce({
        data: [
          {
            position: 1,
            name: "Argentina",
            code: "ar",
            MP: 1,
            W: 1,
            D: 0,
            L: 0,
            GF: 2,
            GA: 0,
            GD: 2,
            Pts: 3,
          },
        ],
      });

    render(
      <MemoryRouter initialEntries={["/groups/A"]}>
        <Routes>
          <Route path="/groups/:groupId" element={<GroupsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("You're offline")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("Qualifies for Round of 32")).toBeInTheDocument();
  });
});
