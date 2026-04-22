import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Navbar from "./Navbar";
import { AuthContext } from "../hooks/useAuth";

function renderNavbar(user: {
  id: number;
  email: string;
  displayName?: string;
  role?: string;
} | null) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        token: user ? "token" : null,
        loading: false,
        login: async () => {},
        register: async () => {},
        logout: () => {},
        refreshMe: async () => {},
      }}
    >
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("Navbar", () => {
  it("shows the admin link for admin users", () => {
    renderNavbar({
      id: 1,
      email: "admin@example.com",
      displayName: "Admin User",
      role: "admin",
    });

    expect(screen.getAllByText("Admin")).toHaveLength(2);
  });

  it("hides the admin link for non-admin users", () => {
    renderNavbar({
      id: 2,
      email: "player@example.com",
      displayName: "Player",
      role: "user",
    });

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
