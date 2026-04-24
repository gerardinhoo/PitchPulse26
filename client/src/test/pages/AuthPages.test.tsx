import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../../pages/Login";
import Register from "../../pages/Register";

const { mockLogin, mockRegister } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockRegister: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
}));

describe("Auth pages", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRegister.mockReset();
  });

  it("shows a network-specific login message when the server is unreachable", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Network Error"));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      await screen.findByText("We couldn't reach the server. Check your connection and try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Forgot your password? Password recovery is coming soon."),
    ).toBeInTheDocument();
  });

  it("shows server validation details during registration failures", async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          details: {
            email: ["Email is invalid"],
            password: ["Password must be at least 8 characters"],
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Taylor" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "bad-email@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email is invalid. Password must be at least 8 characters",
    );
    expect(
      screen.getByText(/verify your email before you can submit predictions/i),
    ).toBeInTheDocument();
  });
});
