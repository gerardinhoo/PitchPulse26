import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import { isEmailVerificationRequired } from "../config";

export default function VerificationBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);
  const verificationRequired = isEmailVerificationRequired();

  if (!verificationRequired || !user || user.emailVerified || dismissed) return null;

  const resend = async () => {
    setStatus("sending");
    setError("");
    try {
      await api.post("/auth/resend-verification");
      setStatus("sent");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || "Could not resend verification email");
      setStatus("error");
    }
  };

  return (
    <div
      role="status"
      className="border-b border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <span className="flex-1 min-w-0">
          <span className="font-medium">Check your inbox!</span>
          <span className="block text-yellow-100/80 mt-1">
            We sent a verification link to <span className="font-mono">{user.email}</span>.
          </span>
          <span className="block text-yellow-100/80 mt-1">
            You can explore PitchPulse 26 for now, but you'll need to verify your email before submitting predictions.
          </span>
          <span className="block text-yellow-100/80 mt-1">
            If you don't see the email within a few minutes, check your spam or promotions folder.
          </span>
          <span className="block text-yellow-100/80 mt-1">
            Still stuck?{" "}
            <a
              href="https://instagram.com/pitchpulse26"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-50 underline underline-offset-2 hover:text-white"
            >
              DM @pitchpulse26
            </a>{" "}
            and we&apos;ll help you get verified.
          </span>
          {status === "sent" && (
            <span className="ml-2 text-emerald-300">Email sent.</span>
          )}
          {status === "error" && (
            <span className="block mt-1 text-red-300">{error}</span>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={resend}
            disabled={status === "sending" || status === "sent"}
            className="px-3 py-1 rounded-md text-xs font-medium border border-yellow-300/40 text-yellow-100 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === "sending" ? "Sending…" : status === "sent" ? "Sent" : "Resend"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="px-2 py-1 rounded-md text-xs text-yellow-100/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
