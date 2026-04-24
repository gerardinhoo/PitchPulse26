import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedEmail = email.trim();
  const normalizedDisplayName = displayName.trim();
  const emailValid = /\S+@\S+\.\S+/.test(normalizedEmail);
  const passwordValid = password.length >= 8;
  const displayNameValid = normalizedDisplayName.length >= 2;
  const formValid = emailValid && passwordValid && displayNameValid;
  const displayNameError =
    displayName.length > 0 && !displayNameValid ? "Display name must be at least 2 characters." : "";
  const emailError =
    email.length > 0 && !emailValid ? "Enter a valid email address." : "";
  const passwordError =
    password.length > 0 && !passwordValid ? "Password must be at least 8 characters." : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setError("Add a display name, a valid email, and a password with at least 8 characters.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await register({
        email: normalizedEmail,
        password,
        displayName: normalizedDisplayName,
      });
      await login({ email: normalizedEmail, password });
      navigate("/matches");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; details?: Record<string, string[]> } } };
      const data = axiosErr.response?.data;
      // Show field-level errors from Zod validation if available
      if (data?.details) {
        const messages = Object.values(data.details).flat() as string[];
        setError(messages.join(". "));
      } else if (!axiosErr.response) {
        setError("We couldn't reach the server. Check your connection and try again.");
      } else {
        setError(data?.error || "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh] py-10 animate-fade-in">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8" noValidate>
        <h2 className="text-2xl font-bold mb-1">Create account</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Join the prediction game</p>
        <p className="text-sm text-[var(--color-text-muted)] mb-4 bg-white/5 rounded-md px-3 py-2">
          We&apos;ll ask you to verify your email before you can submit predictions.
        </p>

        {error && (
          <p
            id="register-form-error"
            role="alert"
            className="text-red-400 text-sm mb-3 bg-red-400/10 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="mb-3">
          <label htmlFor="register-display-name" className="block text-sm font-medium mb-1.5">
            Display name
          </label>
          <input
            id="register-display-name"
            type="text"
            name="displayName"
            placeholder="How your name appears"
            autoComplete="nickname"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            className="w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={displayNameError ? "true" : "false"}
            aria-describedby={displayNameError ? "register-display-name-error" : undefined}
            required
          />
          {displayNameError && (
            <p id="register-display-name-error" className="text-sm text-red-300 mt-1" role="alert">
              {displayNameError}
            </p>
          )}
        </div>

        <div className="mb-3">
          <label htmlFor="register-email" className="block text-sm font-medium mb-1.5">
            Email address
          </label>
          <input
            id="register-email"
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
            aria-describedby={emailError ? "register-email-error" : undefined}
            required
          />
          {emailError && (
            <p id="register-email-error" className="text-sm text-red-300 mt-1" role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="register-password" className="block text-sm font-medium mb-1.5">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={passwordError ? "true" : "false"}
            aria-describedby={passwordError ? "register-password-help register-password-error" : "register-password-help"}
            required
          />
          <p id="register-password-help" className="text-xs text-[var(--color-text-muted)] mt-1">
            Use 8 or more characters so your account is ready for sign-in.
          </p>
          {passwordError && (
            <p id="register-password-error" className="text-sm text-red-300 mt-1" role="alert">
              {passwordError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !formValid}
          aria-describedby={error ? "register-form-error" : undefined}
          className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Sign Up"}
        </button>

        <p className="text-sm text-[var(--color-text-muted)] mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
