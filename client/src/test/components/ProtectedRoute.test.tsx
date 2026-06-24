import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProtectedRoute from "../../components/ProtectedRoute"
import { AuthContext } from "../../hooks/useAuth";

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /login", () => {
    render(
      <AuthContext.Provider
        value={{
          user: null,
          token: null,
          loading: false,
          login: async () => {},
          register: async () => {},
          logout: () => {},
          refreshMe: async () => {},
          setUser: () => null,
        }}
      >
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret page</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });
});
