import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setSubmittedEmail(email.trim());
      setEmail("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(
        axiosErr.response?.data?.error ||
          "We couldn't send a reset link right now. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh] py-10 animate-fade-in">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8" noValidate>
        <h2 className="text-2xl font-bold mb-1">Reset your password</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Enter the email you use for PitchPulse 26 and we&apos;ll send a reset link.
        </p>

        {error && (
          <p
            role="alert"
            className="text-red-400 text-sm mb-3 bg-red-400/10 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        {submittedEmail ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-left"
          >
            <p className="text-base font-semibold text-emerald-200">Check your email</p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/90">
              If an account exists for <span className="font-medium">{submittedEmail}</span>,
              we&apos;ll send a reset link. Check your spam folder and give it a minute to arrive.
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="forgot-password-email" className="block text-sm font-medium mb-1.5">
              Email address
            </label>
            <input
              id="forgot-password-email"
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
              required
            />
          </div>
        )}

        {submittedEmail ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setSubmittedEmail("");
                setError("");
              }}
              className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Send another link
            </button>
            <Link
              to="/login"
              className="block w-full rounded-lg border border-white/15 bg-white/5 py-2.5 text-center font-medium text-white transition-colors hover:bg-white/10"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitting || !emailValid}
            className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? "Sending link..." : "Send reset link"}
          </button>
        )}

        <p className="text-sm text-[var(--color-text-muted)] mt-4 text-center">
          Remembered it?{" "}
          <Link to="/login" className="text-[var(--color-accent)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
