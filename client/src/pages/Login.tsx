import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const formValid = emailValid && password.trim().length > 0;
  const emailError =
    email.length > 0 && !emailValid ? "Enter a valid email address." : "";
  const passwordError =
    password.length === 0 ? "Enter your password." : "";
  const showPasswordError = !!error && !password.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setError("Enter your email and password to continue.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate("/matches");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr.response?.data?.error ||
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh] py-10 animate-fade-in">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8" noValidate>
        <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Sign in to your account</p>

        {error && (
          <p
            id="login-form-error"
            role="alert"
            className="text-red-400 text-sm mb-3 bg-red-400/10 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="mb-3">
          <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? "true" : "false"}
            aria-describedby={emailError ? "login-email-error" : undefined}
            required
          />
          {emailError && (
            <p id="login-email-error" className="text-sm text-red-300 mt-1" role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="login-password" className="block text-sm font-medium mb-1.5">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={showPasswordError ? "true" : "false"}
            aria-describedby={showPasswordError ? "login-password-error" : undefined}
            required
          />
          {showPasswordError && (
            <p id="login-password-error" className="text-sm text-red-300 mt-1" role="alert">
              {passwordError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !formValid}
          aria-describedby={error ? "login-form-error" : undefined}
          className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-sm text-[var(--color-text-muted)] mt-3 text-center">
          Forgot your password? Password recovery is coming soon.
        </p>

        <p className="text-sm text-[var(--color-text-muted)] mt-4 text-center">
          No account?{" "}
          <Link to="/register" className="text-[var(--color-accent)] hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
