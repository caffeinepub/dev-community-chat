import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { backendService as backend } from "../services/backendService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { username, email, password, confirmPassword } = form;
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await backend.register(username.trim(), email.trim(), password);
      toast.success("Account created! Please sign in.");
      navigate({ to: "/login" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("already")
          ? "Username or email already taken."
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "#0D1F27",
    border: "1px solid #2A3F4A",
    color: "white" as const,
  };
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all";
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#25D366";
    e.target.style.boxShadow = "0 0 0 2px rgba(37,211,102,0.15)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#2A3F4A";
    e.target.style.boxShadow = "none";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-8"
      style={{
        background:
          "linear-gradient(135deg, #0B141A 0%, #111B21 50%, #1A2A31 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md mx-4"
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-9 h-9 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold text-white">DevCommunity</h1>
          <p className="text-sm mt-1" style={{ color: "#8B9EA8" }}>
            Join the developer community
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: "#1A2A31", border: "1px solid #2A3F4A" }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            Create account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-username"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#8B9EA8" }}
              >
                USERNAME
              </label>
              <input
                id="reg-username"
                data-ocid="register.input"
                type="text"
                value={form.username}
                onChange={update("username")}
                placeholder="Choose a username"
                autoComplete="username"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#8B9EA8" }}
              >
                EMAIL
              </label>
              <input
                id="reg-email"
                data-ocid="register.input"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="Enter your email"
                autoComplete="email"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#8B9EA8" }}
              >
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  data-ocid="register.input"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "#8B9EA8" }}
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-confirm"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#8B9EA8" }}
              >
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  data-ocid="register.input"
                  type={showCpw ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={update("confirmPassword")}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowCpw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "#8B9EA8" }}
                >
                  {showCpw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-ocid="register.error_state"
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#F87171",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              data-ocid="register.submit_button"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all mt-2 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "#25D366" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#8B9EA8" }}>
            Already have an account?{" "}
            <a
              href="/login"
              data-ocid="register.link"
              className="font-medium"
              style={{ color: "#25D366" }}
              onClick={(e) => {
                e.preventDefault();
                navigate({ to: "/login" });
              }}
            >
              Sign in
            </a>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#4A5E68" }}>
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#25D366" }}
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
