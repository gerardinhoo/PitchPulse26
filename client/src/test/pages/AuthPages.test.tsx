import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../api/axios";
import ForgotPassword from "../../pages/ForgotPassword";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import ResetPassword from "../../pages/ResetPassword";

const { mockLogin, mockRegister, mockPost } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockRegister: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("../../api/axios", () => ({
  default: {
    post: mockPost,
  },
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
    mockPost.mockReset();
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
    expect(screen.getByRole("link", { name: "Reset it here" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
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

  it("submits a forgot-password request and shows confirmation copy", async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        message: "If an account exists for that email, a password reset link has been sent.",
      },
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for that email, a password reset link has been sent.",
    );
    expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", {
      email: "user@example.com",
    });
  });

  it("submits a reset-password request from the reset page", async () => {
    mockPost.mockResolvedValueOnce({
      data: { message: "Password reset successful" },
    });

    render(
      <MemoryRouter initialEntries={["/reset-password?token=reset-token-12345"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Password reset successful",
    );
    expect(api.post).toHaveBeenCalledWith("/auth/reset-password", {
      token: "reset-token-12345",
      password: "newpassword123",
    });
  });
});
