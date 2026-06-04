import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Spinner from "../components/Spinner";

type Status = "processing" | "success" | "invalid" | "error";

export default function UnsubscribeReminders() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "processing" : "invalid");
  const [message, setMessage] = useState(
    token ? "Updating your reminder settings…" : "Missing unsubscribe token.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await api.post("/reminders/unsubscribe", { token });
        if (cancelled) return;
        setStatus("success");
        setMessage(response.data.message || "Reminder emails turned off.");
      } catch (err: unknown) {
        if (cancelled) return;
        const axiosErr = err as { response?: { data?: { error?: string } } };
        const nextMessage =
          axiosErr?.response?.data?.error || "We couldn't update your reminder settings.";
        setStatus(/invalid|expired/i.test(nextMessage) ? "invalid" : "error");
        setMessage(nextMessage);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] py-10 animate-fade-in">
      <div className="card w-full max-w-sm p-8 text-center">
        {status === "processing" && (
          <>
            <Spinner />
            <p className="text-sm text-[var(--color-text-muted)] mt-4">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-4xl mb-3">✉️</div>
            <h2 className="text-xl font-bold mb-1">Reminder emails turned off</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">{message}</p>
            <Link
              to="/matches"
              className="inline-block px-4 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Back to Matches
            </Link>
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold mb-1">Couldn&apos;t update reminders</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">{message}</p>
            <Link
              to="/matches"
              className="inline-block px-4 py-2 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)] text-sm font-medium transition-colors"
            >
              Go to Matches
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
