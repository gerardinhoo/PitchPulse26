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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register({
      email: email.trim(),
      password: password.trim(),
      displayName: displayName.trim(),
    });
      await login({ email, password });
      navigate("/matches");
    } catch (err: unknown) {
      console.log("REGISTER ERROR:", err);
      const axiosErr = err as { response?: { data?: { error?: string; details?: Record<string, string[]> } } };
      const data = axiosErr.response?.data;
      // Show field-level errors from Zod validation if available
      if (data?.details) {
        const messages = Object.values(data.details).flat() as string[];
        setError(messages.join(". "));
      } else {
        setError(data?.error || "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in relative z-50">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm p-8 relative z-50"
      >
        <h2 className="text-2xl font-bold mb-1">Create account</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Join the prediction game</p>

        {error && (
          <p className="text-red-400 text-sm mb-3 bg-red-400/10 rounded-md px-3 py-2">{error}</p>
        )}

        <input
          type="text"
          placeholder="Display Name"
          className="w-full mb-3"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

       <input
          type="text"
          style={{
            position: "fixed",
            top: "200px",
            left: "20px",
            zIndex: 999999,
            background: "white",
            color: "black",
            padding: "10px",
          }}
       />

        <button
          type="submit"
          disabled={submitting}
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
