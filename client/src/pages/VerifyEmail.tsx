import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/Spinner";

type Status = "verifying" | "success" | "expired" | "invalid" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { refreshMe } = useAuth();

  const [status, setStatus] = useState<Status>(token ? "verifying" : "invalid");
  const [message, setMessage] = useState<string>(
    token ? "" : "Missing verification token."
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        await api.post("/auth/verify-email", { token });
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email has been verified.");
        // Refresh /auth/me so the banner disappears immediately if the user is logged in.
        refreshMe().catch(() => undefined);
      } catch (err: unknown) {
        if (cancelled) return;
        const axiosErr = err as { response?: { data?: { error?: string } } };
        const msg = axiosErr.response?.data?.error || "Verification failed.";
        if (/expired/i.test(msg)) setStatus("expired");
        else if (/invalid/i.test(msg)) setStatus("invalid");
        else setStatus("error");
        setMessage(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, refreshMe]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] py-10 animate-fade-in">
      <div className="card w-full max-w-sm p-8 text-center">
        {status === "verifying" && (
          <>
            <Spinner />
            <p className="text-sm text-[var(--color-text-muted)] mt-4">
              Verifying your email…
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold mb-1">Email verified</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">{message}</p>
            <Link
              to="/matches"
              className="inline-block px-4 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Go to Matches
            </Link>
          </>
        )}

        {(status === "expired" || status === "invalid" || status === "error") && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold mb-1">
              {status === "expired" ? "Link expired" : "Verification failed"}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">{message}</p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)] text-sm font-medium transition-colors"
            >
              Sign in to resend
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
